/**
 * Gerenciamento de Preferências de Notificação por Usuário
 * Suporta configuração individual de toque sonoro, volume, categorias específicas de alerta e metas periódicas.
 * Persistência sincronizada com LocalStorage e Supabase.
 */

import { NotificationSoundType, playNotificationSound } from './soundAlerts';
import { getSupabaseClient } from './supabaseClient';

export type NotificationCategoryType =
  | 'followup'
  | 'estoque'
  | 'pendencias'
  | 'metas'
  | 'boletos'
  | 'tarefas'
  | 'chat'
  | 'notas';

export interface UserNotificationPreferences {
  userId: string;
  soundType: NotificationSoundType;
  soundsPerType: Record<NotificationCategoryType, NotificationSoundType>;
  volumePercent: number; // 0 - 100
  // Categorias específicas de alerta
  alerts: {
    pendencias: boolean;
    notas: boolean;
    tarefas: boolean;
    followup: boolean;
    boletos: boolean;
    metas: boolean;
    chat: boolean;
    estoque: boolean;
  };
  // Configurações de percentuais de metas
  metaAlerts: {
    diaria: {
      pct50: boolean;
      pct75: boolean;
      pct100: boolean;
    };
    semanal: {
      pct50: boolean;
      pct75: boolean;
      pct100: boolean;
    };
    mensal: {
      pct50: boolean;
      pct75: boolean;
      pct100: boolean;
    };
  };
}

export const DEFAULT_SOUNDS_PER_TYPE: Record<NotificationCategoryType, NotificationSoundType> = {
  followup: 'Ding Comercial',
  estoque: 'Pulso Tecnológico',
  pendencias: 'Alerta Duplo Atenção',
  metas: 'Fanfarra de Conquista (Meta)',
  boletos: 'Campainha Corporativa (Longa)',
  tarefas: 'Sino Suave (Padrão)',
  chat: 'Pop Discreto',
  notas: 'Chime Cristalino com Ressonância',
};

export const DEFAULT_NOTIF_PREFS: Omit<UserNotificationPreferences, 'userId'> = {
  soundType: 'Campainha Corporativa (Longa)',
  soundsPerType: DEFAULT_SOUNDS_PER_TYPE,
  volumePercent: 85,
  alerts: {
    pendencias: true,
    notas: true,
    tarefas: true,
    followup: true,
    boletos: true,
    metas: true,
    chat: true,
    estoque: true,
  },
  metaAlerts: {
    diaria: {
      pct50: true,
      pct75: true,
      pct100: true,
    },
    semanal: {
      pct50: true,
      pct75: true,
      pct100: true,
    },
    mensal: {
      pct50: true,
      pct75: true,
      pct100: true,
    },
  },
};

const STORAGE_PREFIX = 'fenix_user_notif_prefs_';
const DEDUPLICATION_PREFIX = 'fenix_meta_notif_fired_';

/**
 * Obtém as preferências salvas do usuário atual (ou padrão)
 */
export function getUserNotificationPreferences(userId: string): UserNotificationPreferences {
  if (typeof window === 'undefined' || !userId) {
    return { userId: userId || 'default', ...DEFAULT_NOTIF_PREFS };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userId,
        soundType: parsed.soundType || DEFAULT_NOTIF_PREFS.soundType,
        soundsPerType: {
          ...DEFAULT_SOUNDS_PER_TYPE,
          ...(parsed.soundsPerType || {}),
        },
        volumePercent: typeof parsed.volumePercent === 'number' ? parsed.volumePercent : DEFAULT_NOTIF_PREFS.volumePercent,
        alerts: {
          ...DEFAULT_NOTIF_PREFS.alerts,
          ...(parsed.alerts || {}),
        },
        metaAlerts: {
          diaria: {
            ...DEFAULT_NOTIF_PREFS.metaAlerts.diaria,
            ...(parsed.metaAlerts?.diaria || {}),
          },
          semanal: {
            ...DEFAULT_NOTIF_PREFS.metaAlerts.semanal,
            ...(parsed.metaAlerts?.semanal || {}),
          },
          mensal: {
            ...DEFAULT_NOTIF_PREFS.metaAlerts.mensal,
            ...(parsed.metaAlerts?.mensal || {}),
          },
        },
      };
    }
  } catch (err) {
    console.warn('Erro ao ler preferências de notificação:', err);
  }

  return { userId, ...DEFAULT_NOTIF_PREFS };
}

/**
 * Salva as preferências no LocalStorage e sincroniza com o Supabase
 */
export async function saveUserNotificationPreferences(
  userIdOrPrefs: string | UserNotificationPreferences,
  optionalPrefs?: UserNotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: true };

  const prefs: UserNotificationPreferences =
    typeof userIdOrPrefs === 'string' && optionalPrefs
      ? { ...optionalPrefs, userId: userIdOrPrefs }
      : (userIdOrPrefs as UserNotificationPreferences);

  try {
    const key = `${STORAGE_PREFIX}${prefs.userId}`;
    localStorage.setItem(key, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('fenix_notif_prefs_updated', { detail: prefs }));

    // Sincronizar com o Supabase de forma assíncrona
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('fenix_user_preferences').upsert(
          {
            user_id: prefs.userId,
            preference_key: 'notification_settings',
            preference_value: prefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,preference_key' }
        );
      } catch (sbErr) {
        console.warn('Aviso: Supabase preferences sync em fallback local:', sbErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar preferências de notificação:', err);
    return { success: false, error: err?.message || 'Falha ao salvar' };
  }
}

/**
 * Toca o som de notificação personalizado configurado para o usuário
 */
export function playUserCustomSound(userId: string) {
  const prefs = getUserNotificationPreferences(userId);
  playNotificationSound(prefs.soundType, prefs.volumePercent);
}

/**
 * Toca o som de notificação específico para a categoria/tipo de notificação do usuário
 */
export function playUserCustomSoundForCategory(
  userId: string,
  category: NotificationCategoryType
) {
  const prefs = getUserNotificationPreferences(userId);
  if (prefs.volumePercent <= 0) return;
  const specificSound =
    prefs.soundsPerType?.[category] || prefs.soundType || 'Campainha Corporativa (Longa)';
  playNotificationSound(specificSound, prefs.volumePercent);
}

/**
 * Verifica se um alerta específico de categoria está ativado para o usuário
 */
export function isAlertCategoryEnabled(
  userId: string,
  category: 'pendencias' | 'notas' | 'tarefas' | 'followup' | 'boletos' | 'metas'
): boolean {
  const prefs = getUserNotificationPreferences(userId);
  return prefs.alerts[category] ?? true;
}

/**
 * Utilitário de deduplicação periódica de marcos de meta.
 * Cada percentual deve disparar a notificação somente UMA VEZ no período correspondente.
 */
export function checkAndRegisterMetaAlert(
  userId: string,
  period: 'diaria' | 'semanal' | 'mensal',
  milestone: 50 | 75 | 100
): boolean {
  if (typeof window === 'undefined') return false;

  const prefs = getUserNotificationPreferences(userId);
  if (!prefs.alerts.metas) return false;

  const pctKey = `pct${milestone}` as 'pct50' | 'pct75' | 'pct100';
  if (!prefs.metaAlerts[period][pctKey]) return false;

  const now = new Date();
  let periodKey = '';

  if (period === 'diaria') {
    // Ex: 2026-09-18
    periodKey = now.toISOString().slice(0, 10);
  } else if (period === 'semanal') {
    // Ano + semana do ano
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    periodKey = `${now.getFullYear()}_W${weekNum}`;
  } else {
    // Ex: 2026-09
    periodKey = `${now.getFullYear()}_M${now.getMonth() + 1}`;
  }

  const storageKey = `${DEDUPLICATION_PREFIX}${userId}_${period}_${periodKey}_${milestone}`;
  const alreadyFired = localStorage.getItem(storageKey);

  if (alreadyFired) {
    return false; // Já disparou neste período
  }

  // Marca como disparado
  try {
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch {}

  return true; // Pode disparar a notificação
}
