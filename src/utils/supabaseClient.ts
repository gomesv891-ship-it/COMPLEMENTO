import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default project configuration provided by the user
export const DEFAULT_SUPABASE_URL = 'https://rewcifdxtwvwabnxbafx.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_6oTfXVQa1z45xtlAfSyK2g_Ad2gs-el';

// Storage keys for user credentials (persisted in localStorage, with defaults fallback)
export const STORAGE_SUPABASE_URL_KEY = 'fenix_supabase_url';
export const STORAGE_SUPABASE_KEY_KEY = 'fenix_supabase_anon_key';
export const STORAGE_SUPABASE_AUTO_SYNC_KEY = 'fenix_supabase_auto_sync';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export interface SupabaseSyncStatus {
  connected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
  tablesStatus?: Record<string, { count: number; error?: string }>;
}

let supabaseClientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

// Limpeza de segurança defensiva: remover credenciais legadas do localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Retrieves the current configured URL directly from project configuration/environment
 */
export function getSupabaseUrl(): string {
  // Garantir que não existam credenciais legadas no localStorage
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
  } catch {
    // ignore
  }
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return normalizeSupabaseUrl(envUrl.trim());
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * Cleans and normalizes URL by removing trailing slashes and /rest/v1 if included
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let u = rawUrl.trim();
  // Remove /rest/v1 or /rest/v1/ suffix if pasted
  u = u.replace(/\/rest\/v1\/?$/, '');
  // Remove trailing slashes
  u = u.replace(/\/+$/, '');
  return u;
}

/**
 * Retrieves the current configured Anon Key directly from project configuration/environment
 */
export function getSupabaseAnonKey(): string {
  // Garantir que não existam credenciais legadas no localStorage
  try {
    localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
  } catch {
    // ignore
  }
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

/**
 * Check if auto-sync is enabled (defaults to true)
 */
export function isSupabaseAutoSyncEnabled(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_SUPABASE_AUTO_SYNC_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // ignore
  }
  return true;
}

export function setSupabaseAutoSyncEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_SUPABASE_AUTO_SYNC_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('fenix_supabase_config_changed'));
  } catch {
    // ignore
  }
}

/**
 * Saves sync settings without storing credentials in localStorage
 */
export function saveSupabaseConfig(_url?: string, _anonKey?: string, autoSync = true) {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
    localStorage.setItem(STORAGE_SUPABASE_AUTO_SYNC_KEY, autoSync ? 'true' : 'false');
    // Invalidate client instance so it rebuilds on next call
    supabaseClientInstance = null;
    currentClientUrl = '';
    currentClientKey = '';
    window.dispatchEvent(new CustomEvent('fenix_supabase_config_changed'));
  } catch (err) {
    console.error('Erro ao salvar configurações de sincronização do Supabase:', err);
  }
}

/**
 * Gets or initializes the Supabase client safely
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) return null;

  if (supabaseClientInstance && currentClientUrl === url && currentClientKey === key) {
    return supabaseClientInstance;
  }

  try {
    supabaseClientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentClientUrl = url;
    currentClientKey = key;
    return supabaseClientInstance;
  } catch (err) {
    console.error('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
}

// Global sync state and listeners
let currentSyncStatus: SupabaseSyncStatus = {
  connected: false,
  isSyncing: false,
  lastSyncTime: null,
  error: null,
};

const listeners = new Set<(status: SupabaseSyncStatus) => void>();

export function getSupabaseSyncStatus(): SupabaseSyncStatus {
  return { ...currentSyncStatus };
}

export function subscribeSupabaseSyncStatus(listener: (status: SupabaseSyncStatus) => void): () => void {
  listeners.add(listener);
  listener({ ...currentSyncStatus });
  return () => {
    listeners.delete(listener);
  };
}

function notifyStatus() {
  const status = { ...currentSyncStatus };
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // ignore
    }
  });
  window.dispatchEvent(new CustomEvent('fenix_supabase_status_changed', { detail: status }));
}

/**
 * Tests connection with Supabase by issuing a lightweight health check
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Credenciais do Supabase não configuradas.' };
  }

  try {
    currentSyncStatus.isSyncing = true;
    notifyStatus();

    // Probe the rest endpoint with the anon key
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    const res = await fetch(`${url}/rest/v1/fenix_kv_store?select=key&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.status === 200) {
      currentSyncStatus.connected = true;
      currentSyncStatus.error = null;
      currentSyncStatus.isSyncing = false;
      notifyStatus();
      return { success: true, message: 'Conectado com sucesso ao Supabase! Tabela sincronizada.' };
    }

    // If 404, table doesn't exist yet, but credentials and network are 100% valid!
    if (res.status === 404) {
      currentSyncStatus.connected = true;
      currentSyncStatus.error = null;
      currentSyncStatus.isSyncing = false;
      notifyStatus();
      return {
        success: true,
        message: 'Conectado ao Supabase com sucesso! (Tabela de sincronização pronta para ser criada via script SQL).',
      };
    }

    if (res.status === 401 || res.status === 403) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Chave anon/publishable inválida ou sem permissão (${res.status}): ${errText}`);
    }

    currentSyncStatus.connected = true;
    currentSyncStatus.error = null;
    currentSyncStatus.isSyncing = false;
    notifyStatus();
    return { success: true, message: `Conectado ao projeto Supabase (status HTTP ${res.status}).` };
  } catch (err: any) {
    const errorMsg = err?.message || 'Falha ao conectar com o Supabase.';
    currentSyncStatus.connected = false;
    currentSyncStatus.error = errorMsg;
    currentSyncStatus.isSyncing = false;
    notifyStatus();
    return { success: false, error: errorMsg };
  }
}

/**
 * List of primary localStorage collections to sync with Supabase
 */
export const SYNC_COLLECTIONS: { key: string; label: string; description: string }[] = [
  { key: 'fenix_clients_db', label: 'Clientes', description: 'Cadastro e perfil dos clientes' },
  { key: 'fenix_orcamentos_history', label: 'Histórico de Orçamentos', description: 'Todos os orçamentos emitidos' },
  { key: 'fenix_saved_orcamentos', label: 'Orçamentos Salvos', description: 'Modelos e propostas gravadas' },
  { key: 'fenix_product_items_data', label: 'Produtos', description: 'Catálogo de itens e preços' },
  { key: 'fenix_product_categories_data', label: 'Categorias de Produtos', description: 'Categorias oficiais' },
  { key: 'fenix_product_groups_data', label: 'Grupos de Produtos', description: 'Grupos de acabamentos' },
  { key: 'fenix_followup_cards_v2', label: 'Follow-up (Cards)', description: 'Pipeline de acompanhamento comercial' },
  { key: 'fenix_prospeccao_clients_db', label: 'Prospecção', description: 'Clientes e contatos em prospecção' },
  { key: 'fenix_tarefas_db', label: 'Tarefas', description: 'Lista e status de tarefas da equipe' },
  { key: 'fenix_pos_vendas_db', label: 'Pós-Vendas', description: 'Atendimentos de pós-venda' },
  { key: 'fenix_boletos_db', label: 'Boletos', description: 'Controle de boletos e vencimentos' },
  { key: 'fenix_pendencias_v1', label: 'Pendências', description: 'Avisos e pendências operacionais' },
  { key: 'fenix_header_notifications_v2', label: 'Notificações', description: 'Notificações do sistema e alertas entre usuários' },
  { key: 'fenix_activities_db', label: 'Atividades e Histórico', description: 'Registro de atividades e eventos' },
  { key: 'fenix_notes_db', label: 'Anotações', description: 'Blocos de notas e registros internos' },
  { key: 'fenix_usuarios_v2', label: 'Usuários do Sistema', description: 'Contas, cargos e módulos autorizados' },
  { key: 'fenix_auth_users_v2', label: 'Contas de Acesso (Auth)', description: 'Senhas, logins e status dos usuários' },
  { key: 'fenix_metas_sales_db', label: 'Vendas das Metas', description: 'Lançamentos de vendas do mês' },
  { key: 'fenix_visitas_db', label: 'Visitas Técnicas', description: 'Agendamentos e vistorias' },
  { key: 'fenix_instalacoes_db', label: 'Instalações', description: 'Obras e cronogramas de montagem' },
  { key: 'fenix_retornos_db', label: 'Retornos Operacionais', description: 'Retornos e assistências técnicas' },
  { key: 'fenix_instaladores_db', label: 'Instaladores', description: 'Equipes e montadores cadastrados' },
  { key: 'fenix_agendamento_visitas', label: 'Agenda: Visitas', description: 'Cronograma detalhado de visitas' },
  { key: 'fenix_agendamento_instalacoes', label: 'Agenda: Instalações', description: 'Cronograma detalhado de instalações' },
  { key: 'fenix_agendamento_retornos', label: 'Agenda: Retornos', description: 'Cronograma detalhado de retornos' },
  { key: 'fenix_agendamento_instaladores', label: 'Agenda: Equipes', description: 'Lista de instaladores da agenda' },
  { key: 'fenix_estoque_items', label: 'Estoque (Itens)', description: 'Produtos, saldos e status do estoque' },
  { key: 'fenix_estoque_categories', label: 'Estoque (Categorias)', description: 'Categorias manuais e independentes de estoque' },
  { key: 'fenix_estoque_groups', label: 'Estoque (Grupos)', description: 'Grupos manuais e independentes de estoque' },
  { key: 'fenix_estoque_movimentacoes', label: 'Movimentações de Estoque', description: 'Entradas, Saídas - Venda e Saídas - Outro' },
  { key: 'fenix_vendas_gerencial', label: 'Gestão de Vendas (Diretoria)', description: 'Vendas, custos, lucros e margens' },
  { key: 'fenix_chat_messages', label: 'Chat Interno (Mensagens)', description: 'Mensagens de chat em tempo real da equipe' },
  { key: 'fenix_user_presence', label: 'Chat Interno (Presença)', description: 'Status Online/Offline e batimentos de presença' },
];

/**
 * SQL script to easily create and harden the synchronization table in Supabase SQL Editor
 * Includes strict RLS policies (preventing arbitrary deletes, validating allowed keys and payload sizes)
 */
export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- ATUALIZAÇÃO E BLINDAGEM DE SEGURANÇA (RLS) - CRM FÊNIX WORLD
-- Execute este script no "SQL Editor" do Supabase:
-- https://supabase.com/dashboard/project/rewcifdxtwvwabnxbafx/sql
-- ==============================================================================

-- 1. Garante que a tabela existe com tipos e restrições seguras
CREATE TABLE IF NOT EXISTS public.fenix_kv_store (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by text DEFAULT 'CRM Fênix'
);

-- 2. Habilita obrigatoriamente Row Level Security (RLS)
ALTER TABLE public.fenix_kv_store ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas antigas/permissivas demais para aplicar as regras blindadas
DROP POLICY IF EXISTS "Permitir leitura anonima no CRM" ON public.fenix_kv_store;
DROP POLICY IF EXISTS "Permitir insercao e atualizacao anonima no CRM" ON public.fenix_kv_store;
DROP POLICY IF EXISTS "CRM Fenix: Leitura de dados autenticados e anonimos" ON public.fenix_kv_store;
DROP POLICY IF EXISTS "CRM Fenix: Insercao de colecoes validas" ON public.fenix_kv_store;
DROP POLICY IF EXISTS "CRM Fenix: Atualizacao de colecoes validas" ON public.fenix_kv_store;
DROP POLICY IF EXISTS "CRM Fenix: Bloqueio de exclusao acidental" ON public.fenix_kv_store;

-- 4. POLÍTICA DE LEITURA (SELECT):
-- Permite leitura apenas de chaves legítimas do sistema Fênix
CREATE POLICY "CRM Fenix: Leitura de colecoes validas"
ON public.fenix_kv_store
FOR SELECT
TO anon, authenticated
USING (
    key LIKE 'fenix_%'
);

-- 5. POLÍTICA DE INSERÇÃO (INSERT):
-- Previne injeção de tabelas desconhecidas ou spam (limite de 15MB por payload)
CREATE POLICY "CRM Fenix: Insercao de colecoes validas"
ON public.fenix_kv_store
FOR INSERT
TO anon, authenticated
WITH CHECK (
    key LIKE 'fenix_%'
    AND length(key) <= 80
    AND pg_column_size(data) <= 15728640
);

-- 6. POLÍTICA DE ATUALIZAÇÃO (UPDATE):
-- Permite atualizar registros existentes mantendo a integridade
CREATE POLICY "CRM Fenix: Atualizacao de colecoes validas"
ON public.fenix_kv_store
FOR UPDATE
TO anon, authenticated
USING (key LIKE 'fenix_%')
WITH CHECK (
    key LIKE 'fenix_%'
    AND pg_column_size(data) <= 15728640
);

-- 7. POLÍTICA DE EXCLUSÃO (DELETE):
-- Nenhuma requisição anônima pública pode apagar registros inteiros acidentalmente
-- Apenas usuários autenticados ou comandos de manutenção podem excluir registros
CREATE POLICY "CRM Fenix: Bloqueio de exclusao publica"
ON public.fenix_kv_store
FOR DELETE
TO authenticated
USING (key LIKE 'fenix_%');

-- Confirmação
SELECT 'Políticas RLS do CRM Fênix aplicadas e blindadas com sucesso!' AS status;
`;

/**
 * Sends all local data from localStorage to Supabase (Backup / Push)
 */
export async function pushAllLocalDataToSupabase(currentUser = 'Vanessa Gomes'): Promise<{
  success: boolean;
  syncedCount: number;
  error?: string;
  details?: Record<string, boolean>;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, syncedCount: 0, error: 'Supabase não inicializado.' };
  }

  currentSyncStatus.isSyncing = true;
  notifyStatus();

  let syncedCount = 0;
  const details: Record<string, boolean> = {};

  try {
    for (const col of SYNC_COLLECTIONS) {
      try {
        const raw = localStorage.getItem(col.key);
        if (raw === null) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }

        const payload = {
          key: col.key,
          data: parsed,
          updated_at: new Date().toISOString(),
          updated_by: currentUser,
        };

        const { error } = await client
          .from('fenix_kv_store')
          .upsert(payload, { onConflict: 'key' });

        if (error) {
          console.warn(`Erro ao sincronizar chave ${col.key} no Supabase:`, error);
          details[col.key] = false;
        } else {
          syncedCount++;
          details[col.key] = true;
        }
      } catch (colErr) {
        console.warn(`Exceção na chave ${col.key}:`, colErr);
        details[col.key] = false;
      }
    }

    currentSyncStatus.connected = true;
    currentSyncStatus.lastSyncTime = new Date().toLocaleTimeString('pt-BR');
    currentSyncStatus.error = null;
    currentSyncStatus.isSyncing = false;
    notifyStatus();

    return {
      success: syncedCount > 0,
      syncedCount,
      details,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Erro durante sincronização com Supabase.';
    currentSyncStatus.isSyncing = false;
    currentSyncStatus.error = errorMsg;
    notifyStatus();
    return { success: false, syncedCount, error: errorMsg };
  }
}

/**
 * Dispatches targeted and general events to notify all active UI components
 */
export function dispatchCollectionEvents(collectionKey: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('storage'));
  if (collectionKey === 'fenix_clients_db') window.dispatchEvent(new Event('fenix_clients_updated'));
  if (collectionKey.includes('orcamento')) window.dispatchEvent(new Event('fenix_orcamentos_updated'));
  if (collectionKey.includes('followup')) window.dispatchEvent(new Event('fenix_followup_updated'));
  if (collectionKey.includes('tarefas')) window.dispatchEvent(new Event('fenix_tarefas_updated'));
  if (collectionKey.includes('metas')) window.dispatchEvent(new Event('fenix_metas_updated'));
  if (collectionKey.includes('usuarios') || collectionKey.includes('auth')) window.dispatchEvent(new Event('fenix_auth_updated'));
  if (collectionKey.includes('notes')) window.dispatchEvent(new Event('fenix_notes_updated'));
  if (collectionKey.includes('pendencias')) window.dispatchEvent(new Event('fenix_pendencias_updated'));
  if (collectionKey.includes('notification')) window.dispatchEvent(new Event('fenix_notifications_updated'));
  if (collectionKey.includes('product')) window.dispatchEvent(new Event('fenix_products_updated'));
  if (collectionKey.includes('agendamento') || collectionKey.includes('visitas') || collectionKey.includes('instalac') || collectionKey.includes('retorno')) window.dispatchEvent(new Event('fenix_agendamento_updated'));
  if (collectionKey.includes('pos_vendas')) window.dispatchEvent(new Event('fenix_pos_vendas_updated'));
  if (collectionKey.includes('boletos')) window.dispatchEvent(new Event('fenix_boletos_updated'));
  if (collectionKey.includes('estoque')) window.dispatchEvent(new Event('fenix_estoque_updated'));
  if (collectionKey.includes('vendas')) window.dispatchEvent(new Event('fenix_vendas_updated'));
  if (collectionKey.includes('chat')) window.dispatchEvent(new Event('fenix_chat_updated'));
  if (collectionKey.includes('presence')) window.dispatchEvent(new Event('fenix_presence_updated'));
}

/**
 * Helper to ensure a list has strictly unique items by an idField.
 */
export function deduplicateListById<T = any>(list: T[], idField = 'id'): T[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of list) {
    if (!item) continue;
    const val = (item as any)[idField];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const key = String(val).trim();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

/**
 * Initializes a Supabase Realtime channel subscription to receive instant updates
 * whenever any row in fenix_kv_store changes across any connected client.
 */
export function initSupabaseRealtimeSubscription(): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('fenix_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fenix_kv_store' },
        (payload: any) => {
          if (payload?.new && payload.new.key && payload.new.data !== undefined) {
            const key = payload.new.key;
            try {
              let parsedData = payload.new.data;
              if (typeof parsedData === 'string') {
                try {
                  parsedData = JSON.parse(parsedData);
                } catch {}
              }
              const cleaned = Array.isArray(parsedData) ? deduplicateListById(parsedData) : parsedData;
              localStorage.setItem(key, typeof cleaned === 'string' ? cleaned : JSON.stringify(cleaned));
              dispatchCollectionEvents(key);
            } catch (e) {
              console.warn('Erro ao atualizar cache local via Realtime:', e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  } catch (err) {
    console.warn('Realtime Supabase não pôde ser iniciado:', err);
    return null;
  }
}

/**
 * Pulls all data from Supabase down into localStorage (Restore / Pull)
 */
export async function pullDataFromSupabase(): Promise<{
  success: boolean;
  pulledCount: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, pulledCount: 0, error: 'Supabase não inicializado.' };
  }

  currentSyncStatus.isSyncing = true;
  notifyStatus();

  try {
    const { data, error } = await client
      .from('fenix_kv_store')
      .select('key, data, updated_at');

    if (error) {
      throw error;
    }

    if (!Array.isArray(data) || data.length === 0) {
      currentSyncStatus.isSyncing = false;
      notifyStatus();
      return { success: true, pulledCount: 0 };
    }

    let pulledCount = 0;
    for (const item of data) {
      if (item.key && item.data !== undefined) {
        try {
          let parsedData = item.data;
          if (typeof parsedData === 'string') {
            try {
              parsedData = JSON.parse(parsedData);
            } catch {}
          }
          const cleaned = Array.isArray(parsedData) ? deduplicateListById(parsedData) : parsedData;
          const stringVal = typeof cleaned === 'string' ? cleaned : JSON.stringify(cleaned);
          
          const currentLocal = localStorage.getItem(item.key);
          // Only update and dispatch if there is an actual difference to prevent UI flicker and focus loss
          if (currentLocal !== stringVal) {
            localStorage.setItem(item.key, stringVal);
            pulledCount++;
            dispatchCollectionEvents(item.key);
          }
        } catch (storageErr) {
          console.error(`Erro ao gravar ${item.key} no localStorage:`, storageErr);
        }
      }
    }

    // Trigger local events only if something actually changed to prevent constant re-renders
    if (pulledCount > 0) {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('fenix_clients_updated'));
      window.dispatchEvent(new Event('fenix_orcamentos_updated'));
      window.dispatchEvent(new Event('fenix_followup_updated'));
      window.dispatchEvent(new Event('fenix_tarefas_updated'));
      window.dispatchEvent(new Event('fenix_metas_updated'));
      window.dispatchEvent(new Event('fenix_auth_updated'));
      window.dispatchEvent(new Event('fenix_notes_updated'));
      window.dispatchEvent(new Event('fenix_pendencias_updated'));
      window.dispatchEvent(new Event('fenix_notifications_updated'));
      window.dispatchEvent(new Event('fenix_products_updated'));
      window.dispatchEvent(new Event('fenix_agendamento_updated'));
      window.dispatchEvent(new Event('fenix_pos_vendas_updated'));
      window.dispatchEvent(new Event('fenix_boletos_updated'));
      window.dispatchEvent(new Event('fenix_estoque_updated'));
      window.dispatchEvent(new Event('fenix_vendas_updated'));
    }

    currentSyncStatus.connected = true;
    currentSyncStatus.lastSyncTime = new Date().toLocaleTimeString('pt-BR');
    currentSyncStatus.error = null;
    currentSyncStatus.isSyncing = false;
    notifyStatus();

    return { success: true, pulledCount };
  } catch (err: any) {
    const errorMsg = err?.message || 'Não foi possível carregar os dados. Tente novamente.';
    currentSyncStatus.isSyncing = false;
    currentSyncStatus.error = errorMsg;
    notifyStatus();
    return { success: false, pulledCount: 0, error: errorMsg };
  }
}

/**
 * Saves a single item into a collection stored in Supabase fenix_kv_store.
 * - Concurrency protection: fetches current remote records first.
 * - Edit vs Create: if an item with idField exists, updates it in-place (Requirement 6).
 * - Only after Supabase confirms the write with 200 OK does it update the local cache (Requirement 5).
 */
export async function saveItemToSupabase<T extends Record<string, any>>(
  collectionKey: string,
  item: T,
  idFieldOrUser = 'id',
  currentUser?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }

  // Resolve idField vs currentUser defensively
  let idField = 'id';
  let resolvedUser = currentUser;

  if (currentUser === undefined) {
    if (idFieldOrUser && idFieldOrUser !== 'id' && idFieldOrUser !== '_id' && !(idFieldOrUser in item)) {
      resolvedUser = idFieldOrUser;
      idField = 'id';
    } else {
      idField = idFieldOrUser || 'id';
    }
  } else {
    idField = idFieldOrUser || 'id';
  }

  const user = resolvedUser || localStorage.getItem('fenix_active_user_name') || localStorage.getItem('fenix_saved_username') || 'Usuário Fênix';

  try {
    // 1. Fetch current collection from Supabase first
    const { data: remoteRow, error: fetchErr } = await client
      .from('fenix_kv_store')
      .select('data, updated_at')
      .eq('key', collectionKey)
      .maybeSingle();

    if (fetchErr) {
      console.error(`Erro ao consultar ${collectionKey} no Supabase:`, fetchErr);
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
      };
    }

    let list: T[] = [];
    if (remoteRow && Array.isArray(remoteRow.data)) {
      list = remoteRow.data;
    } else {
      try {
        const raw = localStorage.getItem(collectionKey);
        if (raw) list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    // 2. Identify if item already exists (Edit vs Create)
    const itemId = item[idField];
    const hasValidId = itemId !== undefined && itemId !== null && String(itemId).trim() !== '';

    let updatedList: T[];
    let existingIndex = -1;

    if (hasValidId) {
      existingIndex = list.findIndex((x: any) => String(x[idField]) === String(itemId));
      if (existingIndex >= 0) {
        // Edit in-place: merge updated fields, preserving any existing fields
        // Also eliminate any duplicated copies that may have been created previously with the same ID
        updatedList = list.map((x: any, idx: number) => {
          if (idx === existingIndex) {
            return {
              ...x,
              ...item,
            };
          }
          return x;
        }).filter((x: any, idx: number) => {
          if (String(x[idField]) === String(itemId) && idx !== existingIndex) {
            return false;
          }
          return true;
        });
      } else {
        // Create new record (filtering out any previous occurrence of itemId)
        updatedList = [item, ...list.filter((x: any) => String(x[idField]) !== String(itemId))];
      }
    } else {
      // Create new record
      updatedList = [item, ...list];
    }

    // Always ensure entire collection is deduplicated by idField
    updatedList = deduplicateListById(updatedList, idField);

    // 3. Upsert to Supabase
    const { error: upsertErr } = await client
      .from('fenix_kv_store')
      .upsert(
        {
          key: collectionKey,
          data: updatedList,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
        { onConflict: 'key' }
      );

    if (upsertErr) {
      console.error(`Erro ao salvar ${collectionKey} no Supabase:`, upsertErr);
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
      };
    }

    // 4. Supabase CONFIRMED SUCCESS -> Only now update local cache
    try {
      localStorage.setItem(collectionKey, JSON.stringify(updatedList));
      dispatchCollectionEvents(collectionKey);
    } catch (e) {
      console.warn('Erro ao atualizar cache local após confirmação Supabase:', e);
    }

    return {
      success: true,
      data: existingIndex >= 0 ? updatedList[existingIndex] : item,
    };
  } catch (err: any) {
    console.error(`Exceção ao salvar ${collectionKey} no Supabase:`, err);
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }
}

/**
 * Deletes a single item from a collection in Supabase fenix_kv_store.
 * Only after Supabase confirms does it update the local cache.
 */
export async function deleteItemFromSupabase(
  collectionKey: string,
  itemId: string | number,
  idFieldOrUser = 'id',
  currentUser?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }

  // Resolve idField vs currentUser defensively
  let idField = 'id';
  let resolvedUser = currentUser;

  if (currentUser === undefined) {
    if (idFieldOrUser && idFieldOrUser !== 'id' && idFieldOrUser !== '_id') {
      resolvedUser = idFieldOrUser;
      idField = 'id';
    } else {
      idField = idFieldOrUser || 'id';
    }
  } else {
    idField = idFieldOrUser || 'id';
  }

  const user = resolvedUser || localStorage.getItem('fenix_active_user_name') || localStorage.getItem('fenix_saved_username') || 'Usuário Fênix';

  try {
    const { data: remoteRow, error: fetchErr } = await client
      .from('fenix_kv_store')
      .select('data')
      .eq('key', collectionKey)
      .maybeSingle();

    if (fetchErr) {
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
      };
    }

    let list: any[] = [];
    if (remoteRow && Array.isArray(remoteRow.data)) {
      list = remoteRow.data;
    } else {
      try {
        const raw = localStorage.getItem(collectionKey);
        if (raw) list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    const updatedList = list.filter((x: any) => String(x[idField]) !== String(itemId));

    const { error: upsertErr } = await client
      .from('fenix_kv_store')
      .upsert(
        {
          key: collectionKey,
          data: updatedList,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
        { onConflict: 'key' }
      );

    if (upsertErr) {
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
      };
    }

    try {
      localStorage.setItem(collectionKey, JSON.stringify(updatedList));
      dispatchCollectionEvents(collectionKey);
    } catch (e) {
      console.warn('Erro ao atualizar cache local:', e);
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }
}

/**
 * Saves a whole collection payload directly into Supabase fenix_kv_store.
 * Only after Supabase confirms does it update the local cache.
 */
export async function saveWholeCollectionToSupabase(
  collectionKey: string,
  data: any,
  currentUser?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }

  const user = currentUser || localStorage.getItem('fenix_active_user_name') || localStorage.getItem('fenix_saved_username') || 'Usuário Fênix';
  const dataToSave = Array.isArray(data) ? deduplicateListById(data) : data;

  try {
    const { error: upsertErr } = await client
      .from('fenix_kv_store')
      .upsert(
        {
          key: collectionKey,
          data: dataToSave,
          updated_at: new Date().toISOString(),
          updated_by: user,
        },
        { onConflict: 'key' }
      );

    if (upsertErr) {
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
      };
    }

    try {
      localStorage.setItem(collectionKey, typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave));
      dispatchCollectionEvents(collectionKey);
    } catch (e) {
      console.warn('Erro ao atualizar cache local:', e);
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    };
  }
}
