import { FollowUpItem, TaskItem } from '../types';
import { sendUserNotification } from './notifications';
import { isRecordOfResponsible } from './userDataFilter';
import { saveWholeCollectionToSupabase } from './supabaseClient';

/**
 * Calculates calendar days elapsed between dateStr and today
 */
function getElapsedCalendarDays(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    let parsedDate: Date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      } else {
        parsedDate = new Date(dateStr);
      }
    } else {
      parsedDate = new Date(dateStr);
    }
    if (isNaN(parsedDate.getTime())) return 0;
    const diffMs = Date.now() - parsedDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Requirement 5: FOLLOW-UP — LEMBRETE AUTOMÁTICO
 * Após 2 dias, se um orçamento estiver no Follow-up e ainda NÃO estiver marcado como:
 * Vendido ou Perdido
 * gerar uma nova notificação no sino para lembrar o usuário de entrar novamente em contato com o cliente.
 * A notificação deve:
 * - aparecer no sino;
 * - respeitar o usuário responsável pelo Follow-up;
 * - tocar o som da notificação conforme a configuração de volume;
 * - funcionar mesmo que a tela de Follow-up ou o sino não estejam abertos.
 * - Não gerar notificações para Follow-ups já marcados como Vendido ou Perdido.
 */
export function checkFollowUpTwoDayAlerts(): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem('fenix_followup_cards_v2') || localStorage.getItem('fenix_followup_db');
    if (!raw) return;
    const items: FollowUpItem[] = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) return;

    let itemsModified = false;
    const todayDateStr = new Date().toISOString().slice(0, 10);

    const updatedItems = items.map((item) => {
      const alertKey = `fenix_fup_alerted_2dias_${item.id}`;

      // Regra explícita: Não gerar notificações para Follow-ups já marcados como Vendido ou Perdido
      if (item.status === 'Vendido' || item.status === 'Perdido') {
        try {
          localStorage.removeItem(alertKey);
        } catch {}
        return item;
      }

      const creationDate = item.dataEntradaFollowUp || item.dataCriacao || item.createdAt;
      const elapsedDays = getElapsedCalendarDays(creationDate);

      // Precisa ter decorrido pelo menos 2 dias desde a entrada/criação do orçamento
      if (elapsedDays < 2) {
        return item;
      }

      // Regra: Não repetir a mesma notificação no sino antes de 2 dias.
      // Após 2 dias, notificar novamente somente se o orçamento ainda não estiver como Vendido ou Perdido.
      const lastAlertDate = localStorage.getItem(alertKey);
      let shouldNotify = false;

      if (!lastAlertDate) {
        shouldNotify = true;
      } else {
        const daysSinceLastAlert = getElapsedCalendarDays(lastAlertDate);
        if (daysSinceLastAlert >= 2) {
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        localStorage.setItem(alertKey, new Date().toISOString());
        itemsModified = true;

        const responsibleUser = item.responsavel || item.vendedor || item.criadoPor || 'Vanessa Gomes';
        const valorFormatado = (typeof item.valor === 'number' && !isNaN(item.valor) ? item.valor : 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });

        // Dispara notificação no sino com som
        sendUserNotification({
          category: 'Follow-up',
          title: `Lembrete Follow-up (2 dias): ${item.cliente}`,
          description: `O orçamento #${item.pedido || item.id} de ${item.cliente} (${item.produto || 'Orçamento'} • ${valorFormatado}) aguarda novo contato com o cliente.`,
          targetTab: 'Follow-up',
          recipientName: responsibleUser,
          authorName: 'Sistema Follow-up',
          metadata: {
            followUpId: item.id,
            cliente: item.cliente,
            clientName: item.cliente,
            type: 'followup_2dias_reminder',
          },
        });

        return {
          ...item,
          cobrancaAutomaticaGerada: true,
          dataUltimaCobranca: new Date().toISOString(),
        };
      }

      return item;
    });

    if (itemsModified) {
      localStorage.setItem('fenix_followup_cards_v2', JSON.stringify(updatedItems));
      saveWholeCollectionToSupabase('fenix_followup_cards_v2', updatedItems).catch(() => {});
      window.dispatchEvent(new Event('fenix_followup_updated'));
    }
  } catch (err) {
    console.warn('Erro na verificação de lembretes automáticos do Follow-up:', err);
  }
}

/**
 * Requirement 8: TAREFAS — NOTIFICAÇÃO NO DIA E HORÁRIO
 * Quando o usuário salvar uma tarefa com data e horário definidos:
 * Exatamente no dia e horário programados:
 * - gerar uma notificação no sino;
 * - tocar o som da notificação;
 * - manter a notificação no sino até ser visualizada/gerenciada conforme a lógica existente.
 * A notificação deve funcionar mesmo quando:
 * - a tela de Tarefas não estiver aberta;
 * - o sino não estiver aberto;
 * - o usuário estiver em outra tela do sistema.
 * A tarefa deve continuar vinculada ao usuário que a criou.
 */
export function checkScheduledTaskAlerts(): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem('fenix_tarefas_db');
    if (!raw) return;
    const tasks: TaskItem[] = JSON.parse(raw);
    if (!Array.isArray(tasks) || tasks.length === 0) return;

    const now = new Date();
    const nowTime = now.getTime();
    let tasksModified = false;

    const updatedTasks = tasks.map((task) => {
      // Ignorar tarefas já concluídas
      if (task.status === 'Concluída') {
        return task;
      }

      if (!task.dueDate) {
        return task;
      }

      // Extrai data e horário programados
      const cleanDueDate = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate;
      const cleanDueTime = task.dueTime ? task.dueTime.trim() : '00:00';

      // Parse da data/hora programada
      const scheduledDateTime = new Date(`${cleanDueDate}T${cleanDueTime.length === 5 ? cleanDueTime : `${cleanDueTime}:00`}`);
      if (isNaN(scheduledDateTime.getTime())) {
        return task;
      }

      const scheduledTime = scheduledDateTime.getTime();

      // Checa se já chegou o dia e horário programados (com tolerância razoável para tarefas recentes)
      const diffMs = nowTime - scheduledTime;
      const alertKey = `fenix_task_alarm_notified_${task.id}`;
      const isAlreadyNotified = localStorage.getItem(alertKey) === 'true' || (task as any).notifiedAtScheduledTime === true;

      // Se a data/hora programada chegou (diffMs >= 0) e não foi alertado
      // e não é uma tarefa antiga esquecida há mais de 48 horas
      if (diffMs >= 0 && diffMs <= 48 * 60 * 60 * 1000 && !isAlreadyNotified) {
        localStorage.setItem(alertKey, 'true');
        tasksModified = true;

        const recipientUser = task.responsavel || task.atribuidoA || task.criadoPor || 'Vanessa Gomes';

        // Dispara no sino e toca o som configurado
        sendUserNotification({
          category: 'Tarefas',
          title: `Tarefa Agendada: ${task.title}`,
          description: `Horário programado atingido (${cleanDueTime}) para ${task.clientName || 'cliente'}. ${task.description || ''}`.trim(),
          targetTab: 'Tarefas',
          recipientName: recipientUser,
          authorName: task.criadoPor || 'Sistema de Tarefas',
          metadata: {
            taskId: task.id,
            scheduledDueDate: cleanDueDate,
            scheduledDueTime: cleanDueTime,
            type: 'task_scheduled_alarm',
          },
        });

        return {
          ...task,
          notifiedAtScheduledTime: true,
        };
      }

      return task;
    });

    if (tasksModified) {
      localStorage.setItem('fenix_tarefas_db', JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event('fenix_tarefas_updated'));
    }
  } catch (err) {
    console.warn('Erro na verificação de alarmes de tarefas programadas:', err);
  }
}

/**
 * Inicia o verificador global periódico que roda em background em todo o sistema.
 */
export function startGlobalNotificationScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Execução imediata
  checkFollowUpTwoDayAlerts();
  checkScheduledTaskAlerts();

  // Execução a cada 15 segundos para pegar o horário exato da tarefa e follow-ups
  const intervalId = window.setInterval(() => {
    checkFollowUpTwoDayAlerts();
    checkScheduledTaskAlerts();
  }, 15000);

  // Execução quando a aba do navegador volta ao foco
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkFollowUpTwoDayAlerts();
      checkScheduledTaskAlerts();
    }
  };

  const handleFollowUpUpdated = () => {
    checkFollowUpTwoDayAlerts();
  };

  const handleTasksUpdated = () => {
    checkScheduledTaskAlerts();
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
  window.addEventListener('fenix_followup_updated', handleFollowUpUpdated);
  window.addEventListener('fenix_tarefas_updated', handleTasksUpdated);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
    window.removeEventListener('fenix_followup_updated', handleFollowUpUpdated);
    window.removeEventListener('fenix_tarefas_updated', handleTasksUpdated);
  };
}
