import { getStoredAccounts, getCurrentAuthUser } from './auth';
import { saveWholeCollectionToSupabase } from './supabaseClient';
import {
  getUserNotificationPreferences,
  playUserCustomSoundForCategory,
  NotificationCategoryType,
} from './userNotificationPreferences';
import { playNotificationSound } from './soundAlerts';

export type NotificationCategory =
  | 'Tarefas'
  | 'Boletos'
  | 'Follow-up'
  | 'Meta'
  | 'Notas'
  | 'Pendências'
  | 'Pós-Vendas'
  | 'Estoque';

export interface SystemNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  targetTab: string;
  recipientId?: string;
  recipientName?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'fenix_header_notifications_v2';

// Base initial broadcast notifications (shown if no prior storage exists)
const INITIAL_SYSTEM_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif_met_1',
    category: 'Meta',
    title: 'Você bateu a meta hoje! 🎉',
    description: 'Parabéns! O faturamento diário atingiu o objetivo estipulado para hoje com novos fechamentos.',
    time: 'Hoje às 11:20',
    unread: true,
    targetTab: 'Metas',
    createdAt: '2026-09-09T11:20:00.000Z',
  },
  {
    id: 'notif_bol_1',
    category: 'Boletos',
    title: 'Boleto Vencendo Hoje (#BOL-2026-884)',
    description: 'Boleto de R$ 14.850,00 da Construtora Horizonte vence hoje. Enviar lembrete para faturamento.',
    time: 'Hoje às 08:30',
    unread: true,
    targetTab: 'Boletos',
    createdAt: '2026-09-09T08:30:00.000Z',
  },
  {
    id: 'notif_fup_1',
    category: 'Follow-up',
    title: 'Follow-up Pendente (48h sem retorno)',
    description: 'Retorno com Arquiteto Marcelo Duarte sobre proposta de SPC 5mm aguardando resposta.',
    time: 'Hoje às 10:15',
    unread: true,
    targetTab: 'Follow-up',
    createdAt: '2026-09-09T10:15:00.000Z',
  },
  {
    id: 'notif_tar_1',
    category: 'Tarefas',
    title: '3 Tarefas Agendadas para Hoje',
    description: 'Visita técnica no Edifício Splendor às 14h e envio de amostras LVT para Arq. Camila.',
    time: 'Hoje às 09:00',
    unread: true,
    targetTab: 'Tarefas',
    createdAt: '2026-09-09T09:00:00.000Z',
  },
];

/**
 * Normaliza e localiza a conta do usuário pelo ID ou Nome
 */
function resolveUser(identifier: string) {
  if (!identifier) return null;
  const accounts = getStoredAccounts();
  const idLower = identifier.trim().toLowerCase();

  // 1. Busca por nome exato
  if (accounts[identifier]) return accounts[identifier];

  // 2. Busca por ID
  const byId = Object.values(accounts).find((u) => u.id === identifier);
  if (byId) return byId;

  // 3. Busca por similaridade no nome (Eder, Vanessa, Jessica/Jhessica)
  const byName = Object.values(accounts).find((u) => {
    const n = u.name.toLowerCase();
    if (n === idLower) return true;
    if (idLower.includes('eder') && n.includes('eder')) return true;
    if (idLower.includes('vanessa') && n.includes('vanessa')) return true;
    if (
      (idLower.includes('jhessica') || idLower.includes('jessica')) &&
      (n.includes('jhessica') || n.includes('jessica'))
    ) {
      return true;
    }
    return false;
  });

  return byName || null;
}

/**
 * Lê todas as notificações salvas no LocalStorage
 */
export function getAllStoredNotifications(): SystemNotification[] {
  if (typeof window === 'undefined') return INITIAL_SYSTEM_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler notificações do storage:', err);
  }
  return INITIAL_SYSTEM_NOTIFICATIONS;
}

/**
 * Salva a lista completa no storage e notifica o aplicativo
 */
function saveAllNotifications(list: SystemNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('fenix_notifications_updated'));
    window.dispatchEvent(new Event('storage'));
    saveWholeCollectionToSupabase(STORAGE_KEY, list).catch((err) => {
      console.warn('Erro ao sincronizar notificações com Supabase:', err);
    });
  } catch (err) {
    console.error('Erro ao persistir notificações:', err);
  }
}

/**
 * Envia uma notificação direcionada especificamente para um usuário.
 * Identifica o destinatário de forma consistente por ID e Nome Canônico.
 */
export function sendUserNotification(params: {
  category: NotificationCategory;
  title: string;
  description: string;
  targetTab: string;
  recipientName?: string;
  recipientId?: string;
  authorName?: string;
  authorId?: string;
  metadata?: Record<string, any>;
}): SystemNotification {
  const targetUser = (params.recipientId || params.recipientName)
    ? resolveUser(params.recipientId || params.recipientName || '')
    : null;
  const authorUser = params.authorName ? resolveUser(params.authorName) : null;

  const resolvedRecipientName = targetUser ? targetUser.name : (params.recipientName?.trim() || 'Todos');
  const resolvedRecipientId = targetUser ? targetUser.id : params.recipientId;

  const now = new Date();
  const horaStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newNotification: SystemNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    category: params.category,
    title: params.title,
    description: params.description,
    time: `Hoje às ${horaStr}`,
    unread: true,
    targetTab: params.targetTab,
    recipientId: resolvedRecipientId,
    recipientName: resolvedRecipientName,
    authorId: authorUser ? authorUser.id : params.authorId,
    authorName: authorUser ? authorUser.name : params.authorName,
    createdAt: now.toISOString(),
    metadata: params.metadata,
  };

  const currentList = getAllStoredNotifications();
  const updatedList = [newNotification, ...currentList];
  saveAllNotifications(updatedList);

  // Toca o som individual de notificação conforme a categoria configurada pelo usuário
  // Respeita rigorosamente o volume configurado; se volume === 0, não toca som
  try {
    const currentUserName = getCurrentAuthUser();
    const targetUserIdentifier = resolvedRecipientId || resolvedRecipientName || currentUserName;
    
    // Mapeia categoria para o som individual específico do usuário
    const categoryKeyMap: Record<NotificationCategory, NotificationCategoryType> = {
      'Tarefas': 'tarefas',
      'Boletos': 'boletos',
      'Follow-up': 'followup',
      'Meta': 'metas',
      'Notas': 'notas',
      'Pendências': 'pendencias',
      'Pós-Vendas': 'followup',
      'Estoque': 'estoque',
    };
    const catType = categoryKeyMap[newNotification.category] || 'tarefas';
    playUserCustomSoundForCategory(targetUserIdentifier, catType);
  } catch (audioErr) {
    console.warn('Aviso: Não foi possível reproduzir som de notificação:', audioErr);
  }

  return newNotification;
}

/**
 * Retorna somente as notificações destinadas ao usuário logado ou gerais da empresa
 */
export function getUserNotifications(userNameOrId: string): SystemNotification[] {
  const all = getAllStoredNotifications();
  if (!userNameOrId) return all;

  const user = resolveUser(userNameOrId);
  const targetId = user?.id;
  const targetName = (user?.name || userNameOrId).trim().toLowerCase();

  return all.filter((notif) => {
    // 1. Se tem ID de destinatário específico
    if (notif.recipientId && targetId) {
      return notif.recipientId === targetId;
    }

    // 2. Se tem Nome de destinatário específico
    if (notif.recipientName && notif.recipientName !== 'Todos') {
      const rec = notif.recipientName.trim().toLowerCase();
      if (rec === targetName) return true;
      if (targetName.includes('eder') && rec.includes('eder')) return true;
      if (targetName.includes('vanessa') && rec.includes('vanessa')) return true;
      if (
        (targetName.includes('jhessica') || targetName.includes('jessica')) &&
        (rec.includes('jhessica') || rec.includes('jessica'))
      ) {
        return true;
      }
      return false;
    }

    // 3. Notificações broadcast ou legadas do sistema geral (sem destinatário único)
    return true;
  });
}

/**
 * Marca uma notificação específica como lida
 */
export function markNotificationAsRead(id: string): void {
  const current = getAllStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveAllNotifications(updated);
}

/**
 * Marca todas as notificações do usuário logado como lidas
 */
export function markAllNotificationsAsReadForUser(userNameOrId: string): void {
  const user = resolveUser(userNameOrId);
  const targetId = user?.id;
  const targetName = (user?.name || userNameOrId).trim().toLowerCase();

  const current = getAllStoredNotifications();
  const updated = current.map((n) => {
    const isTarget =
      (n.recipientId && targetId && n.recipientId === targetId) ||
      (n.recipientName && (
        n.recipientName.toLowerCase() === targetName ||
        (targetName.includes('eder') && n.recipientName.toLowerCase().includes('eder')) ||
        (targetName.includes('vanessa') && n.recipientName.toLowerCase().includes('vanessa')) ||
        ((targetName.includes('jhessica') || targetName.includes('jessica')) &&
          (n.recipientName.toLowerCase().includes('jhessica') || n.recipientName.toLowerCase().includes('jessica')))
      )) ||
      (!n.recipientId && !n.recipientName);

    if (isTarget) {
      return { ...n, unread: false };
    }
    return n;
  });

  saveAllNotifications(updated);
}

/**
 * Remove uma notificação específica
 */
export function deleteNotification(id: string): void {
  const current = getAllStoredNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveAllNotifications(updated);
}
