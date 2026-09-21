import React, { useState, useMemo, useEffect } from 'react';
import {
  PhoneCall,
  MessageCircle,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Home,
  User,
  Store,
  Building2,
  Wrench,
  PenTool,
  HardHat,
  RotateCcw,
  Clock,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  UserCheck,
  DollarSign,
  FileText,
  UserPlus,
  Pencil,
} from 'lucide-react';
import {
  FollowUpItem,
  FollowUpStatus,
  FollowUpHistoryEntry,
  ClientRecord,
  PosVendaItem,
} from '../types';
import { ProspeccaoView } from './followup/ProspeccaoView';
import { isRecordOfResponsible, getSellerIdForUser } from '../utils/userDataFilter';
import { getUserIdByName } from '../utils/auth';
import { triggerTwoDayAlert } from '../utils/followupNotifications';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import { saveWholeCollectionToSupabase } from '../utils/supabaseClient';

interface FollowUpScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const STORAGE_KEY = 'fenix_followup_cards_v2';
const CLIENTS_STORAGE_KEY = 'fenix_clients_db';
const POS_VENDAS_STORAGE_KEY = 'fenix_pos_vendas_db';
const METAS_SALES_STORAGE_KEY = 'fenix_metas_sales_db';
const ORCAMENTOS_HISTORY_KEY = 'fenix_orcamentos_history';

// Official Follow-up statuses requested by the user:
// "Status/filtros: Todos, Orçamento Enviado, Aguardando Retorno, Negociando, Vendido e Perdido."
export type OfficialFollowUpStatus =
  | 'Orçamento Enviado'
  | 'Aguardando Retorno'
  | 'Negociando'
  | 'Vendido'
  | 'Perdido';

export const STATUS_LIST: OfficialFollowUpStatus[] = [
  'Orçamento Enviado',
  'Aguardando Retorno',
  'Negociando',
  'Vendido',
  'Perdido',
];

type FilterTab = 'Todos' | OfficialFollowUpStatus;

const INITIAL_FOLLOW_UPS: FollowUpItem[] = [];

// Normalize legacy statuses if loaded from previous storage
const normalizeStatus = (statusStr: string): FollowUpStatus => {
  if (statusStr === 'Em Contato' || statusStr === 'Aguardando Resposta') {
    return 'Aguardando Retorno';
  }
  if (statusStr === 'Negociação') {
    return 'Negociando';
  }
  if (
    statusStr === 'Orçamento Enviado' ||
    statusStr === 'Aguardando Retorno' ||
    statusStr === 'Negociando' ||
    statusStr === 'Vendido' ||
    statusStr === 'Perdido'
  ) {
    return statusStr;
  }
  return 'Orçamento Enviado';
};

// Client Card Color config by client type requested:
// "Cliente Final azul, Revenda roxo, Construtora verde, Instalador laranja, Arquiteto lilás e Engenheiro azul. NÃO usar cards todos brancos."
const getClientTypeVisual = (type?: string) => {
  switch (type) {
    case 'Cliente Final':
      return {
        cardBorder: 'border-blue-200 hover:border-blue-300',
        cardBg: 'bg-blue-50/70',
        headerHover: 'hover:bg-blue-100/40',
        badgeBg: 'bg-blue-100/80 text-[#0052cc] border border-blue-200',
        iconBg: 'bg-white text-[#0052cc] border border-blue-100 shadow-2xs',
        Icon: User,
        dotColor: 'bg-[#0052cc]',
        colorName: 'azul',
      };
    case 'Revenda':
      return {
        cardBorder: 'border-purple-200 hover:border-purple-300',
        cardBg: 'bg-purple-50/70',
        headerHover: 'hover:bg-purple-100/40',
        badgeBg: 'bg-purple-100/80 text-purple-700 border border-purple-200',
        iconBg: 'bg-white text-purple-600 border border-purple-100 shadow-2xs',
        Icon: Store,
        dotColor: 'bg-purple-600',
        colorName: 'roxo',
      };
    case 'Construtora':
      return {
        cardBorder: 'border-emerald-200 hover:border-emerald-300',
        cardBg: 'bg-emerald-50/70',
        headerHover: 'hover:bg-emerald-100/40',
        badgeBg: 'bg-emerald-100/80 text-emerald-700 border border-emerald-200',
        iconBg: 'bg-white text-emerald-600 border border-emerald-100 shadow-2xs',
        Icon: Building2,
        dotColor: 'bg-emerald-600',
        colorName: 'verde',
      };
    case 'Instalador':
      return {
        cardBorder: 'border-orange-200 hover:border-orange-300',
        cardBg: 'bg-orange-50/70',
        headerHover: 'hover:bg-orange-100/40',
        badgeBg: 'bg-orange-100/80 text-orange-700 border border-orange-200',
        iconBg: 'bg-white text-orange-600 border border-orange-100 shadow-2xs',
        Icon: Wrench,
        dotColor: 'bg-orange-600',
        colorName: 'laranja',
      };
    case 'Arquiteto':
      return {
        cardBorder: 'border-violet-200 hover:border-violet-300',
        cardBg: 'bg-violet-50/70',
        headerHover: 'hover:bg-violet-100/40',
        badgeBg: 'bg-violet-100/80 text-violet-700 border border-violet-200',
        iconBg: 'bg-white text-violet-600 border border-violet-100 shadow-2xs',
        Icon: PenTool,
        dotColor: 'bg-violet-600',
        colorName: 'lilás',
      };
    case 'Engenheiro':
      return {
        cardBorder: 'border-sky-200 hover:border-sky-300',
        cardBg: 'bg-sky-50/70',
        headerHover: 'hover:bg-sky-100/40',
        badgeBg: 'bg-sky-100/80 text-sky-700 border border-sky-200',
        iconBg: 'bg-white text-sky-600 border border-sky-100 shadow-2xs',
        Icon: HardHat,
        dotColor: 'bg-sky-600',
        colorName: 'azul',
      };
    default:
      return {
        cardBorder: 'border-blue-200 hover:border-blue-300',
        cardBg: 'bg-blue-50/70',
        headerHover: 'hover:bg-blue-100/40',
        badgeBg: 'bg-blue-100/80 text-[#0052cc] border border-blue-200',
        iconBg: 'bg-white text-[#0052cc] border border-blue-100 shadow-2xs',
        Icon: User,
        dotColor: 'bg-[#0052cc]',
        colorName: 'azul',
      };
  }
};

// Status visual helper
const getStatusBadgeStyle = (status: FollowUpStatus) => {
  switch (status) {
    case 'Orçamento Enviado':
      return 'bg-blue-50 text-[#0052cc] border-blue-200';
    case 'Aguardando Retorno':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Negociando':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Vendido':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Perdido':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

// Helper to format currency safely
const formatCurrency = (val?: number | null) => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `R$ ${num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper to format date display (DD/MM/YYYY) - Exibe SOMENTE data (ex: 12/09/2026), sem horário
const formatDateOnly = (dateStr?: string | number) => {
  if (!dateStr) return '—';
  try {
    const str = String(dateStr).trim();
    if (!str) return '—';
    // Se já estiver no padrão com barras (ex: 12/09/2026 14:30 ou 12/09/2026), remove o horário
    if (str.includes('/')) {
      return str.split(' ')[0];
    }
    // Se estiver no formato ISO ou YYYY-MM-DD
    if (str.includes('-')) {
      const onlyDate = str.split('T')[0];
      const parts = onlyDate.split('-');
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    return str.split(' ')[0];
  } catch {
    return String(dateStr).split(' ')[0];
  }
};

// Helper to format date & time display (DD/MM/YYYY HH:mm)
const formatDateTime = (dateStr?: string) => {
  return formatDateOnly(dateStr);
};

export const FollowUpScreen: React.FC<FollowUpScreenProps> = ({
  currentUserName = 'Vinicius Gestor',
  onNavigateTab,
}) => {
  // Follow-up budgets list (garante a eliminação de cadastro fantasma)
  const [items, setItems] = useState<FollowUpItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter((it: FollowUpItem) => !(it.cliente || '').toLowerCase().includes('roberto silveira'))
            .map((it: FollowUpItem) => ({
              ...it,
              status: normalizeStatus(it.status as string),
            }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Top section toggle: 'orcamentos' | 'prospeccao'
  const [activeSection, setActiveSection] = useState<'orcamentos' | 'prospeccao'>(() => {
    try {
      const saved = localStorage.getItem('fenix_followup_active_subtab');
      if (saved === 'prospeccao' || saved === 'orcamentos') return saved;
    } catch {
      // ignore
    }
    return 'orcamentos';
  });

  useEffect(() => {
    try {
      localStorage.setItem('fenix_followup_active_subtab', activeSection);
    } catch {
      // ignore
    }
  }, [activeSection]);

  // Clients database for accurate clientType lookup
  const [clients, setClients] = useState<ClientRecord[]>([]);

  // Requirement 6: Visualização por Dia e Mês
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [periodMode, setPeriodMode] = useState<'dia' | 'mes' | 'todos'>('mes');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Active status filter: 'Todos' | 'Orçamento Enviado' | 'Aguardando Retorno' | 'Negociando' | 'Vendido' | 'Perdido'
  const [activeTab, setActiveTab] = useState<FilterTab>('Todos');

  // Responsável filter for Diretor Éder Perez
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  // Search input state (GLOBAL search across all clients and budgets)
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded client cards state: { [clientKey]: boolean }
  const [expandedClients, setExpandedClients] = useState<{ [clientKey: string]: boolean }>({});

  // Status transition modal
  const [transitioningBudget, setTransitioningBudget] = useState<FollowUpItem | null>(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState<FollowUpStatus>('Orçamento Enviado');
  const [statusComment, setStatusComment] = useState('');
  const [statusError, setStatusError] = useState('');
  const [numeroPedidoInput, setNumeroPedidoInput] = useState('');
  const [pedidoError, setPedidoError] = useState('');
  const [formaPagamentoInput, setFormaPagamentoInput] = useState<'Pix' | 'Boleto' | 'Cartão'>('Pix');
  const [parcelasInput, setParcelasInput] = useState<string>('1x');

  // History modal for viewing timeline of a budget
  const [viewingHistoryBudget, setViewingHistoryBudget] = useState<FollowUpItem | null>(null);

  // Card com destaque visual ao ser acionado diretamente via notificação do sino
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Handler para abrir diretamente o card exato quando acionado via notificação do sino
  useEffect(() => {
    const handleOpenTargetCard = (targetId?: string, targetClient?: string) => {
      const fupId = targetId || (typeof window !== 'undefined' ? sessionStorage.getItem('fenix_target_followup_id') : null);
      const client = targetClient || (typeof window !== 'undefined' ? sessionStorage.getItem('fenix_target_followup_client') : null);

      if (!fupId && !client) return;

      try {
        sessionStorage.removeItem('fenix_target_followup_id');
        sessionStorage.removeItem('fenix_target_followup_client');
      } catch {}

      setActiveSection('orcamentos');
      setPeriodMode('todos');
      setActiveTab('Todos');
      setSearchTerm('');

      // Encontra o card do follow-up
      const matched = items.find(
        (it) => it.id === fupId || (client && it.cliente?.toLowerCase().trim() === client.toLowerCase().trim())
      );

      if (matched) {
        const clientKey = matched.cliente.toLowerCase().trim();
        setExpandedClients((prev) => ({ ...prev, [clientKey]: true }));
        setHighlightedCardId(matched.id);

        setTimeout(() => {
          const el = document.getElementById(`fup_card_${matched.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

        setTimeout(() => {
          setHighlightedCardId((curr) => (curr === matched.id ? null : curr));
        }, 5000);
      }
    };

    // Checa ao montar
    handleOpenTargetCard();

    // Ouve evento customizado disparado ao clicar no sino
    const listener = (e: any) => {
      const detail = e.detail || {};
      handleOpenTargetCard(detail.followUpId, detail.clientName);
    };
    window.addEventListener('fenix_open_followup_card', listener);
    return () => {
      window.removeEventListener('fenix_open_followup_card', listener);
    };
  }, [items]);

  // Helper para calcular dias corridos decorridos a partir da data de criação/entrada
  const getElapsedCalendarDays = (dateStr?: string): number => {
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
  };

  // Load clients and sync any new budgets from fenix_orcamentos_history
  const syncWithStorage = () => {
    try {
      // 1. Load clients
      const storedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (storedClients) {
        setClients(JSON.parse(storedClients));
      }

      // 2. Load followup items
      const savedFollowup = localStorage.getItem(STORAGE_KEY);
      let currentItems: FollowUpItem[] = [];
      if (savedFollowup) {
        const parsed = JSON.parse(savedFollowup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentItems = parsed
            .filter((it: FollowUpItem) => !(it.cliente || '').toLowerCase().includes('roberto silveira'))
            .map((it) => ({
              ...it,
              status: normalizeStatus(it.status),
            }));
        }
      }

      // 3. Auto-sync budgets from fenix_orcamentos_history:
      // "Após 2 dias corridos que um orçamento foi criado e ainda NÃO foi vendido, ele entre automaticamente em cobrança/Follow-up."
      // "Usar a data de criação/entrada do orçamento para essa contagem."
      // "O registro de Follow-up deve pertencer ao mesmo usuário/vendedor do orçamento original."
      const savedOrcamentos = localStorage.getItem(ORCAMENTOS_HISTORY_KEY);
      if (savedOrcamentos) {
        const orcamentosList: any[] = JSON.parse(savedOrcamentos);
        let updated = false;

        orcamentosList.forEach((orc) => {
          const exists = currentItems.some(
            (it) => it.orcamentoId === orc.id || it.id === `fup_${orc.id}`
          );
          const creationDate = orc.savedAt || orc.createdAt || orc.dataCriacao || orc.data || new Date().toISOString();
          const elapsedDays = getElapsedCalendarDays(creationDate);
          const isSold = orc.status === 'Fechado' || orc.status === 'Fechados' || orc.status === 'Vendido';
          const shouldBeInCobranca = elapsedDays >= 2 && !isSold;

          const sellerName = orc.consultoraName || orc.vendedor || orc.registeredBy || currentUserName || 'Consultora Fênix';
          const sellerId = orc.vendedorId || orc.consultoraId || getUserIdByName(sellerName) || getSellerIdForUser(sellerName);

          if (!exists) {
            const initialStatus: FollowUpStatus = shouldBeInCobranca ? 'Aguardando Retorno' : 'Orçamento Enviado';
            const historyEntries: FollowUpHistoryEntry[] = [
              {
                id: `h_init_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                data: formatDateOnly(creationDate),
                hora: new Date(creationDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                statusAnterior: '-',
                novoStatus: 'Orçamento Enviado',
                observacao: 'Orçamento gerado e cadastrado no Follow-up comercial.',
                usuario: sellerName,
                timestamp: new Date(creationDate).getTime(),
              },
            ];

            if (shouldBeInCobranca) {
              historyEntries.unshift({
                id: `h_cobranca_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                data: formatDateOnly(new Date().toISOString()),
                hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                statusAnterior: 'Orçamento Enviado',
                novoStatus: 'Aguardando Retorno',
                observacao: `Cobrança automática: orçamento atingiu ${elapsedDays} dias corridos desde a criação sem registro de venda.`,
                usuario: 'Sistema Fênix (Cobrança Automática)',
                timestamp: Date.now(),
              });
            }

            const newItem: FollowUpItem = {
              id: `fup_${orc.id}`,
              pedido: orc.id.replace('orc_', '').slice(-4) || String(Math.floor(1000 + Math.random() * 9000)),
              orcamentoId: orc.id,
              clientId: orc.clientId,
              cliente: orc.clientName || 'Cliente Sem Nome',
              clientType: orc.clientType || 'Cliente Final',
              nomeOrcamento: orc.nomeOrcamento || 'Orçamento de Materiais',
              produto: orc.items?.[0]?.descricao || 'Pisos e Revestimentos Fênix',
              telefone: orc.clientContact || '',
              valor: Number(orc.totalFinal) || 0,
              dataCriacao: creationDate.includes('T') ? creationDate.split('T')[0] : creationDate,
              dataEntradaFollowUp: creationDate,
              dataAtualizacao: new Date().toISOString(),
              dataUltimaCobranca: shouldBeInCobranca ? new Date().toISOString() : undefined,
              cobrancaAutomaticaGerada: shouldBeInCobranca,
              status: initialStatus,
              observacao: orc.observacoes || (shouldBeInCobranca ? 'Orçamento em cobrança de retorno automático (2+ dias).' : 'Orçamento gerado e enviado diretamente para a esteira comercial.'),
              vendedor: sellerName,
              vendedorId: sellerId,
              criadoPor: sellerName,
              criadoPorId: sellerId,
              creatorId: sellerId,
              responsavel: sellerName,
              responsavelId: sellerId,
              createdAt: creationDate,
              historico: historyEntries,
            };

            if (shouldBeInCobranca) {
              triggerTwoDayAlert(newItem);
            }

            currentItems = [newItem, ...currentItems];
            updated = true;
          }
        });

        // 4. Checar itens existentes: se atingiram 2 dias corridos desde a data de criação/entrada e ainda NÃO foram vendidos
        currentItems = currentItems.map((item) => {
          if (item.status !== 'Vendido' && item.status !== 'Perdido') {
            const creationDate = item.dataEntradaFollowUp || item.dataCriacao || item.createdAt;
            const elapsedDays = getElapsedCalendarDays(creationDate);
            
            if (elapsedDays >= 2 && !item.cobrancaAutomaticaGerada) {
              updated = true;
              triggerTwoDayAlert(item);
              const nowIso = new Date().toISOString();
              const todayFormatted = formatDateOnly(nowIso);
              const timeFormatted = new Date(nowIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              const cobrancaEntry: FollowUpHistoryEntry = {
                id: `h_cobranca_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                data: todayFormatted,
                hora: timeFormatted,
                statusAnterior: item.status,
                novoStatus: item.status === 'Orçamento Enviado' ? 'Aguardando Retorno' : item.status,
                observacao: `Cobrança automática: orçamento atingiu ${elapsedDays} dias corridos desde a emissão sem registro de venda.`,
                usuario: 'Sistema Fênix (Cobrança Automática)',
                timestamp: Date.now(),
              };

              const sellerId = item.vendedorId || (item.vendedor ? getUserIdByName(item.vendedor) || getSellerIdForUser(item.vendedor) : null);

              return {
                ...item,
                status: item.status === 'Orçamento Enviado' ? 'Aguardando Retorno' : item.status,
                cobrancaAutomaticaGerada: true,
                dataUltimaCobranca: nowIso,
                dataAtualizacao: nowIso,
                vendedorId: sellerId || item.vendedorId,
                criadoPorId: item.criadoPorId || sellerId,
                creatorId: item.creatorId || sellerId,
                responsavelId: item.responsavelId || sellerId,
                historico: [cobrancaEntry, ...(item.historico || [])],
              };
            }
          }
          return item;
        });

        if (updated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
          saveWholeCollectionToSupabase(STORAGE_KEY, currentItems).catch(() => {});
        }
      }

      setItems(currentItems);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    syncWithStorage();

    const handleSync = () => syncWithStorage();
    window.addEventListener('fenix_followup_updated', handleSync);
    window.addEventListener('fenix_orcamentos_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('fenix_followup_updated', handleSync);
      window.removeEventListener('fenix_orcamentos_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Save to localStorage and central Supabase when items update
  const persistItems = (newItems: FollowUpItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      saveWholeCollectionToSupabase(STORAGE_KEY, newItems).catch(() => {});
      window.dispatchEvent(new Event('fenix_followup_updated'));
    } catch {
      // ignore
    }
  };

  // Helper to resolve client type accurately
  const resolveClientType = (item: FollowUpItem): string => {
    if (item.clientType) return item.clientType;
    const match = clients.find(
      (c) =>
        (item.clientId && c.id === item.clientId) ||
        (c.name && item.cliente && c.name.trim().toLowerCase() === item.cliente.trim().toLowerCase()) ||
        ((c as any).nome && item.cliente && (c as any).nome.trim().toLowerCase() === item.cliente.trim().toLowerCase())
    );
    return match?.clientType || 'Cliente Final';
  };

  // Helper to resolve client phone / whatsapp from budget or registered clients
  const resolveBudgetPhone = (budget?: FollowUpItem | null): string => {
    if (!budget) return '';
    if (budget.telefone && budget.telefone.trim()) return budget.telefone.trim();
    const match = clients.find(
      (c) =>
        (budget.clientId && c.id === budget.clientId) ||
        (c.name && budget.cliente && c.name.trim().toLowerCase() === budget.cliente.trim().toLowerCase()) ||
        ((c as any).nome && budget.cliente && (c as any).nome.trim().toLowerCase() === budget.cliente.trim().toLowerCase())
    );
    return match?.whatsapp || (match as any)?.telefone || '';
  };

  // Requirement 6: Helper para extrair data e mês de cada item de follow-up
  const getItemDateParts = (item: FollowUpItem): { dateStr: string; monthStr: string } => {
    const raw = item.dataEntradaFollowUp || item.dataCriacao || item.createdAt || item.dataAtualizacao || '';
    if (!raw) return { dateStr: '', monthStr: '' };

    if (raw.includes('-')) {
      const parts = raw.split('T')[0].split('-');
      if (parts.length >= 3 && parts[0].length === 4) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
      }
    }
    if (raw.includes('/')) {
      const parts = raw.split(' ')[0].split('/');
      if (parts.length === 3) {
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return { dateStr: `${y}-${m}-${d}`, monthStr: `${y}-${m}` };
      }
    }
    const slice10 = raw.slice(0, 10);
    return { dateStr: slice10, monthStr: slice10.slice(0, 7) };
  };

  const matchesPeriod = (item: FollowUpItem): boolean => {
    if (periodMode === 'todos') return true;
    const { dateStr, monthStr } = getItemDateParts(item);
    if (periodMode === 'dia') {
      return dateStr === selectedDate;
    }
    if (periodMode === 'mes') {
      return monthStr === selectedMonth;
    }
    return true;
  };

  // Responsible counts for Director Éder Perez
  const responsibleCounts = useMemo(() => {
    if (!isDirector) return undefined;
    const periodFiltered = items.filter((item) => matchesPeriod(item));
    return {
      todos: periodFiltered.length,
      eder: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Éder')).length,
      vanessa: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Vanessa')).length,
      jhessica: periodFiltered.filter((i) => isRecordOfResponsible(i, 'Jhessica')).length,
      demais: periodFiltered.filter((i) => isRecordOfResponsible(i, 'demais')).length,
    };
  }, [items, isDirector, periodMode, selectedDate, selectedMonth]);

  // Scoped items based on director tab or logged in common user
  // REGRA ESTRITA: Usuário comum consulta exclusivamente seus próprios Follow-ups
  // "Nunca mostrar Follow-ups pertencentes a outro usuário."
  const userItems = useMemo(() => {
    const periodFiltered = items.filter((item) => matchesPeriod(item));
    if (isDirector) {
      if (responsibleTab === 'Todos') return periodFiltered;
      return periodFiltered.filter((item) => isRecordOfResponsible(item, responsibleTab));
    }
    // Usuário comum visualiza somente seus próprios registros no período selecionado
    return periodFiltered.filter((item) => isRecordOfResponsible(item, currentUserName || ''));
  }, [items, isDirector, responsibleTab, currentUserName, periodMode, selectedDate, selectedMonth]);

  // 1. TOTAL PERÍODO: quantidade total e valor total de orçamentos no período
  const totalPeriodCount = useMemo(() => {
    return userItems.length;
  }, [userItems]);

  const totalPeriodValor = useMemo(() => {
    return userItems.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  }, [userItems]);

  // 2. TOTAL VENDIDO: quantidade de vendas realizadas e valor total vendido no período
  const totalVendidoCount = useMemo(() => {
    return userItems.filter((item) => item.status === 'Vendido').length;
  }, [userItems]);

  const totalVendidoValor = useMemo(() => {
    return userItems
      .filter((item) => item.status === 'Vendido')
      .reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  }, [userItems]);

  // Group budgets by client: "Manter o Follow-up em CARDS, um único card por cliente. Se houver vários orçamentos do mesmo cliente, NÃO criar outro card. Manter todos no mesmo card."
  interface ClientCardGroup {
    clientKey: string;
    clientName: string;
    clientType: string;
    orcamentos: FollowUpItem[];
    orcamentosCount: number;
    totalValue: number;
  }

  const clientGroups = useMemo<ClientCardGroup[]>(() => {
    const groupsMap = new Map<string, ClientCardGroup>();

    userItems.forEach((item) => {
      const cType = resolveClientType(item);
      const normalizedKey = item.clientId || item.cliente.trim().toLowerCase();

      if (!groupsMap.has(normalizedKey)) {
        groupsMap.set(normalizedKey, {
          clientKey: normalizedKey,
          clientName: item.cliente,
          clientType: cType,
          orcamentos: [],
          orcamentosCount: 0,
          totalValue: 0,
        });
      }

      const group = groupsMap.get(normalizedKey)!;
      group.orcamentos.push(item);
      group.orcamentosCount += 1;
      group.totalValue += Number(item.valor) || 0;
    });

    return Array.from(groupsMap.values());
  }, [userItems, clients]);

  // GLOBAL SEARCH & STATUS FILTER:
  // "No topo manter a busca 'Buscar por nome do cliente...'. Ela deve ser GLOBAL e encontrar qualquer cliente/orçamento, independente da aba ou filtro selecionado."
  const isGlobalSearching = searchTerm.trim().length > 0;

  const filteredClientGroups = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    // 1. If global search is active: search GLOBALLY across all clients and budgets
    if (query) {
      return clientGroups.filter((group) => {
        const matchesClientName = group.clientName.toLowerCase().includes(query);
        const matchesBudget = group.orcamentos.some(
          (b) =>
            (b.nomeOrcamento || '').toLowerCase().includes(query) ||
            (b.produto || '').toLowerCase().includes(query) ||
            (b.pedido || '').includes(query) ||
            (b.telefone || '').includes(query)
        );
        return matchesClientName || matchesBudget;
      });
    }

    // 2. Otherwise filter by selected tab:
    // If 'Todos', return all client cards.
    // If specific status, return client cards that contain at least one budget in that status.
    if (activeTab === 'Todos') {
      return clientGroups;
    }

    return clientGroups
      .map((group) => {
        const matchingBudgets = group.orcamentos.filter((b) => b.status === activeTab);
        if (matchingBudgets.length === 0) return null;
        return {
          ...group,
          // When filtering by specific status, we can keep all or focus on the matching ones
          orcamentos: group.orcamentos,
        };
      })
      .filter((g): g is ClientCardGroup => g !== null);
  }, [clientGroups, activeTab, searchTerm]);

  // Dynamic counts for status tabs
  const statusCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      Todos: userItems.length,
      'Orçamento Enviado': 0,
      'Aguardando Retorno': 0,
      Negociando: 0,
      Vendido: 0,
      Perdido: 0,
    };

    userItems.forEach((it) => {
      const st = it.status as FilterTab;
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
    });

    return counts;
  }, [userItems]);

  // Toggle card expansion
  const toggleCard = (clientKey: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientKey]: !prev[clientKey],
    }));
  };

  // Open Status Change Modal
  const handleOpenStatusModal = (budget: FollowUpItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTransitioningBudget(budget);
    setSelectedNewStatus(budget.status);
    setStatusComment('');
    setStatusError('');
    setNumeroPedidoInput(budget.pedido ? String(budget.pedido).replace(/^#+/, '') : '');
    setPedidoError('');
    setFormaPagamentoInput(budget.formaPagamento || 'Pix');
    setParcelasInput(budget.parcelas || '1x');
  };

  // Save Status Change
  const handleSaveStatusChange = () => {
    if (!transitioningBudget) return;

    const cleanPedido = numeroPedidoInput.trim().replace(/^#+/, '');

    // Se o status for Vendido, o número do pedido é obrigatório
    if (selectedNewStatus === 'Vendido') {
      if (!cleanPedido) {
        setPedidoError('Informe o número do pedido para registrar a venda.');
        return;
      }
    }

    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const ano = now.getFullYear();
    const hora = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const commentText = statusComment.trim();

    const newHistoryEntry: FollowUpHistoryEntry = {
      id: `h_${Date.now()}`,
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${min}`,
      statusAnterior: transitioningBudget.status,
      novoStatus: selectedNewStatus,
      observacao:
        selectedNewStatus === 'Vendido'
          ? `Venda confirmada. Pedido #${cleanPedido} • ${formaPagamentoInput}${formaPagamentoInput === 'Cartão' ? ` (${parcelasInput})` : ''}${commentText ? ` — ${commentText}` : ''}`
          : commentText || `Status alterado para ${selectedNewStatus}`,
      usuario: currentUserName,
      timestamp: now.getTime(),
    };

    const updatedBudget: FollowUpItem = {
      ...transitioningBudget,
      status: selectedNewStatus,
      pedido: selectedNewStatus === 'Vendido' ? cleanPedido : transitioningBudget.pedido,
      formaPagamento: selectedNewStatus === 'Vendido' ? formaPagamentoInput : transitioningBudget.formaPagamento,
      parcelas: selectedNewStatus === 'Vendido' && formaPagamentoInput === 'Cartão' ? parcelasInput : transitioningBudget.parcelas,
      dataAtualizacao: now.toISOString(),
      observacao: commentText || transitioningBudget.observacao,
      historico: [newHistoryEntry, ...(transitioningBudget.historico || [])],
    };

    const updatedItems = items.map((it) =>
      it.id === transitioningBudget.id ? updatedBudget : it
    );
    persistItems(updatedItems);

    // VENDIDO ACTIONS:
    if (selectedNewStatus === 'Vendido') {
      const clientPhone = resolveBudgetPhone(transitioningBudget);
      const saleId = `v_orc_${transitioningBudget.id}`;

      // 1. Contabilizar o valor da venda em Metas (Evitar duplicidade)
      try {
        const storedMetas = localStorage.getItem(METAS_SALES_STORAGE_KEY);
        let salesList: any[] = [];
        if (storedMetas) {
          salesList = JSON.parse(storedMetas);
        }

        const newSale = {
          id: saleId,
          orcamentoId: transitioningBudget.id,
          pedido: cleanPedido,
          valor: Number(transitioningBudget.valor) || 0,
          cliente: transitioningBudget.cliente,
          whatsapp: clientPhone || '',
          tipoCliente: transitioningBudget.clientType || 'Cliente Final',
          formaPagamento: formaPagamentoInput,
          parcelas: formaPagamentoInput === 'Cartão' ? parcelasInput : undefined,
          data: `${ano}-${mes}-${dia}`,
        };

        // Verificar se a venda desse orçamento ou desse pedido já existe para não duplicar
        const existingSaleIndex = salesList.findIndex(
          (s: any) =>
            s.orcamentoId === transitioningBudget.id ||
            s.id === saleId ||
            (s.pedido === cleanPedido && s.cliente.trim().toLowerCase() === transitioningBudget.cliente.trim().toLowerCase())
        );

        let updatedSales: any[];
        if (existingSaleIndex >= 0) {
          // Atualiza registro existente sem criar duplicatas
          updatedSales = [...salesList];
          updatedSales[existingSaleIndex] = {
            ...updatedSales[existingSaleIndex],
            ...newSale,
            id: salesList[existingSaleIndex].id || saleId,
          };
        } else {
          // Adiciona novo registro de venda
          updatedSales = [newSale, ...salesList];
        }

        localStorage.setItem(METAS_SALES_STORAGE_KEY, JSON.stringify(updatedSales));
        window.dispatchEvent(new Event('fenix_metas_updated'));
      } catch (err) {
        console.error('Erro ao contabilizar em Metas:', err);
      }

      // 2. Enviar esse orçamento/cliente para Pós-Vendas (Evitar duplicidade)
      try {
        const storedPosVendas = localStorage.getItem(POS_VENDAS_STORAGE_KEY);
        let posVendasList: PosVendaItem[] = [];
        if (storedPosVendas) {
          posVendasList = JSON.parse(storedPosVendas);
        }

        const nextFollowUp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextDia = String(nextFollowUp.getDate()).padStart(2, '0');
        const nextMes = String(nextFollowUp.getMonth() + 1).padStart(2, '0');
        const nextAno = nextFollowUp.getFullYear();

        const pvId = `pv_orc_${transitioningBudget.id}`;
        const newPosVenda: PosVendaItem = {
          id: pvId,
          orderNumber: cleanPedido,
          clientId: transitioningBudget.clientId,
          clientName: transitioningBudget.cliente,
          clientPhone: clientPhone || '(11) 98765-4321',
          clientType: (transitioningBudget.clientType as any) || 'Cliente Final',
          valor: Number(transitioningBudget.valor) || 0,
          origem: 'followup',
          orcamentoId: transitioningBudget.id,
          projectDescription:
            transitioningBudget.nomeOrcamento ||
            transitioningBudget.produto ||
            'Orçamento Aprovado',
          installerName: 'A Definir',
          completionDate: `${ano}-${mes}-${dia}`,
          satisfactionRating: 0,
          status: 'Aguardando Contato',
          type: 'Contato de Satisfação',
          feedback: '',
          nextFollowUpDate: `${nextAno}-${nextMes}-${nextDia}`,
          notes: `Venda concluída no Follow-up Comercial. Pedido #${cleanPedido}. Valor: ${formatCurrency(
            transitioningBudget.valor
          )}${commentText ? `. Comentário: ${commentText}` : ''}`,
          createdAt: now.toISOString(),
        };

        const existingPvIndex = posVendasList.findIndex(
          (pv) =>
            pv.id === pvId ||
            (pv.orcamentoId && pv.orcamentoId === transitioningBudget.id) ||
            (cleanPedido && pv.orderNumber === cleanPedido)
        );

        let updatedPosVendas: PosVendaItem[];
        if (existingPvIndex >= 0) {
          updatedPosVendas = [...posVendasList];
          updatedPosVendas[existingPvIndex] = {
            ...updatedPosVendas[existingPvIndex],
            ...newPosVenda,
            id: posVendasList[existingPvIndex].id,
          };
        } else {
          updatedPosVendas = [newPosVenda, ...posVendasList];
        }

        localStorage.setItem(POS_VENDAS_STORAGE_KEY, JSON.stringify(updatedPosVendas));
        window.dispatchEvent(new Event('fenix_pos_vendas_updated'));

        showToast(`✓ Venda confirmada! Pedido #${cleanPedido} enviado para Pós-Vendas e registrado em Metas.`);
      } catch (err) {
        console.error('Erro ao transferir para Pós-Vendas:', err);
        showToast('✓ Status atualizado para Vendido com sucesso.');
      }
    } else {
      showToast(`✓ Status atualizado para "${selectedNewStatus}" com sucesso.`);
    }

    setTransitioningBudget(null);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6 font-sans">
      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-2xs">
            <PhoneCall className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#091122] tracking-tight">
              Follow-up Comercial
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-normal">
              {activeSection === 'orcamentos'
                ? 'Acompanhamento de orçamentos por cliente e esteira comercial.'
                : 'Acompanhamento independente de clientes prospectados.'}
            </p>
          </div>
        </div>

        {/* Duas opções no topo: [ ORÇAMENTOS ] [ PROSPECÇÃO ] */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSection('orcamentos')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
              activeSection === 'orcamentos'
                ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Orçamentos</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('prospeccao')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
              activeSection === 'prospeccao'
                ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Prospecção</span>
          </button>
        </div>
      </div>

      {activeSection === 'prospeccao' ? (
        <ProspeccaoView currentUserName={currentUserName} />
      ) : (
        <>
          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-4 rounded-2xl bg-white border border-blue-200 text-slate-800 shadow-md flex items-center gap-3.5 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052cc] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">{toastMessage}</p>
            </div>
          )}

      {/* Visão da Diretoria: Separação por Responsável (Éder | Vanessa | Jhessica | demais usuários) */}
      {isDirector && (
        <ResponsibleFilterTabs
          activeTab={responsibleTab}
          onSelectTab={setResponsibleTab}
          counts={responsibleCounts}
          label="Follow-up por Responsável"
        />
      )}

      {/* REQ 6: SELETOR DE VISUALIZAÇÃO POR DIA E MÊS + INDICADORES TOTAL E PERSONALIZADO */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Alternador de Modo: Dia | Mês | Todos os Períodos */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 self-start">
            <button
              type="button"
              onClick={() => setPeriodMode('dia')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'dia'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Por Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('mes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'mes'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Mês</span>
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('todos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'todos'
                  ? 'bg-white text-[#0052cc] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos os Períodos</span>
            </button>
          </div>

          {/* Controles de Navegação da Data / Mês */}
          {periodMode === 'dia' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#0052cc] outline-none shadow-2xs cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + 'T12:00:00');
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().slice(0, 10));
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold transition-colors cursor-pointer"
              >
                Hoje
              </button>
            </div>
          )}

          {periodMode === 'mes' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const prevM = m === 1 ? 12 : m - 1;
                  const prevY = m === 1 ? y - 1 : y;
                  setSelectedMonth(`${prevY}-${String(prevM).padStart(2, '0')}`);
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:border-[#0052cc] outline-none shadow-2xs cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const nextM = m === 12 ? 1 : m + 1;
                  const nextY = m === 12 ? y + 1 : y;
                  setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
                }}
                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold transition-colors cursor-pointer"
              >
                Mês Atual
              </button>
            </div>
          )}
        </div>

        {/* INDICADORES: TOTAL PERÍODO E TOTAL VENDIDO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-[#0052cc] flex items-center justify-center font-bold shadow-2xs">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Total Período
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {periodMode === 'dia'
                    ? `Dia ${selectedDate.split('-').reverse().join('/')}`
                    : periodMode === 'mes'
                    ? `Mês ${selectedMonth.split('-').reverse().join('/')}`
                    : 'Todos os períodos'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 block leading-tight">
                {totalPeriodCount}
              </span>
              <span className="text-xs font-bold text-[#0052cc]">
                {formatCurrency(totalPeriodValor)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                  Total Vendido
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  Vendas realizadas no período
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 block leading-tight">
                {totalVendidoCount}
              </span>
              <span className="text-xs font-bold text-emerald-800">
                {formatCurrency(totalVendidoValor)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs (Na mesma linha, com contadores) */}
      {/* "Status/filtros: Todos, Orçamento Enviado, Aguardando Retorno, Negociando, Vendido e Perdido." */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar select-none">
        {(['Todos', ...STATUS_LIST] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const count = statusCounts[tab];

          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                if (searchTerm) setSearchTerm('');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0052cc] text-white shadow-sm shadow-blue-600/20'
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  isActive ? 'bg-[#003d99] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Search Bar (GLOBAL Search) */}
      {/* "No topo manter a busca “Buscar por nome do cliente...”. Ela deve ser GLOBAL e encontrar qualquer cliente/orçamento, independente da aba ou filtro selecionado." */}
      <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do cliente..."
            className="w-full h-10.5 pl-10 pr-9 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#0052cc] rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            {isGlobalSearching && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0052cc] border border-blue-200">
                Busca global em todos os clientes
              </span>
            )}
            <span>
              Exibindo <strong className="text-slate-900 font-bold">{filteredClientGroups.length}</strong>{' '}
              {filteredClientGroups.length === 1 ? 'cliente' : 'clientes'}
            </span>
          </div>

          {(searchTerm || activeTab !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('Todos');
              }}
              className="inline-flex items-center gap-1 font-semibold text-[#0052cc] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* CARDS DO CLIENTE LIST:
          "Manter o Follow-up em CARDS, um único card por cliente.
          Se houver vários orçamentos do mesmo cliente, NÃO criar outro card. Manter todos no mesmo card.
          CARD DO CLIENTE: Mostrar somente:
          - ícone do tipo de cliente;
          - tipo de cliente;
          - nome do cliente;
          - quantidade de orçamentos;
          - valor total dos orçamentos.
          A cor do card deve corresponder ao tipo de cliente:
          Cliente Final azul, Revenda roxo, Construtora verde, Instalador laranja, Arquiteto lilás e Engenheiro azul.
          Não mostrar datas no resumo do cliente." */}
      {filteredClientGroups.length === 0 ? (
        <div className="bg-white rounded-[24px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-2xs">
            <PhoneCall className="w-7 h-7 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-[#091122]">Nenhum cliente no Follow-up</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Nenhum cliente ou orçamento corresponde ao termo pesquisado.'
              : 'Nenhum orçamento encontrado nesta categoria de status.'}
          </p>
          {(searchTerm || activeTab !== 'Todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setActiveTab('Todos');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0052cc]" />
              <span>Ver todos os clientes</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClientGroups.map((group) => {
            const isExpanded = !!expandedClients[group.clientKey];
            const visual = getClientTypeVisual(group.clientType);
            const TypeIcon = visual.Icon;

            return (
              <div
                key={group.clientKey}
                className={`rounded-[22px] sm:rounded-[26px] border ${visual.cardBorder} ${visual.cardBg} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all overflow-hidden`}
              >
                {/* CABEÇALHO DO CARD DO CLIENTE (RESUMO):
                    Mostrar SOMENTE:
                    - ícone do tipo de cliente;
                    - tipo de cliente;
                    - nome do cliente;
                    - quantidade de orçamentos;
                    - valor total dos orçamentos.
                    NÃO mostrar datas no resumo do cliente! */}
                <div
                  onClick={() => toggleCard(group.clientKey)}
                  className={`p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none ${visual.headerHover} transition-colors`}
                >
                  {/* Esquerda: Ícone do tipo + Tipo de cliente + Nome do cliente */}
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}>
                      <TypeIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    <div className="min-w-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${visual.badgeBg} mb-1`}>
                        {group.clientType}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#091122] tracking-tight truncate">
                        {group.clientName}
                      </h3>
                    </div>
                  </div>

                  {/* Direita: Contato rápido + Quantidade de orçamentos + Valor total dos orçamentos + Seta de expansão */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06] flex-wrap">
                    {/* Botões de Contato Rápido no Header do Cliente */}
                    {(() => {
                      const firstBudget = group.orcamentos[0];
                      const clientPhone = resolveBudgetPhone(firstBudget);
                      const cleanDigits = clientPhone.replace(/\D/g, '');
                      const waLink = cleanDigits ? `https://wa.me/55${cleanDigits}` : null;
                      const telLink = cleanDigits ? `tel:${cleanDigits}` : null;

                      if (!cleanDigits) return null;
                      return (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title={`Conversar no WhatsApp (${clientPhone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}
                          {telLink && (
                            <a
                              href={telLink}
                              className="h-8 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              title={`Fazer Ligação (${clientPhone})`}
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-[#0052cc] stroke-[2.2]" />
                              <span className="hidden sm:inline">Ligação</span>
                            </a>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quantidade de orçamentos */}
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Orçamentos
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {group.orcamentosCount} {group.orcamentosCount === 1 ? 'orçamento' : 'orçamentos'}
                      </span>
                    </div>

                    {/* Valor total dos orçamentos */}
                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                        Valor Total
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#091122]">
                        {formatCurrency(group.totalValue)}
                      </span>
                    </div>

                    {/* Seta de expansão com animação */}
                    <div
                      className={`w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-2xs border border-black/[0.05] ${
                        isExpanded ? 'rotate-180 bg-white text-[#0052cc]' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* ÁREA EXPANDIDA DO CARD:
                    "Ao expandir o card, mostrar cada orçamento separadamente com:
                    - nome dado ao orçamento;
                    - valor;
                    - Cadastro;
                    - Última Atualização;
                    - Status com seta." */}
                {isExpanded && (
                  <div className="border-t border-black/[0.06] bg-white/40 p-4 sm:p-6 space-y-3 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                      Orçamentos deste Cliente ({group.orcamentos.length})
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {group.orcamentos.map((budget) => {
                        const statusBadgeClass = getStatusBadgeStyle(budget.status);
                        const isCobrancaActive =
                          (budget.cobrancaAutomaticaGerada ||
                            getElapsedCalendarDays(
                              budget.dataEntradaFollowUp || budget.dataCriacao || budget.createdAt
                            ) >= 2) &&
                          budget.status !== 'Vendido' &&
                          budget.status !== 'Perdido';

                        return (
                          <div
                            key={budget.id}
                            id={`fup_card_${budget.id}`}
                            className={`bg-white rounded-2xl border p-4 sm:p-4.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                              highlightedCardId === budget.id
                                ? 'border-[#0052cc] ring-4 ring-[#0052cc]/30 bg-blue-50/50 scale-[1.01]'
                                : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                          >
                            {/* 1. Nome dado ao orçamento */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-[#091122] truncate">
                                  {budget.nomeOrcamento || budget.produto || 'Orçamento de Materiais'}
                                </h4>
                                {isCobrancaActive && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shadow-2xs"
                                    title="Orçamento sem venda há mais de 2 dias corridos — Cobrança de retorno ativa"
                                  >
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Cobrança (2+ dias)
                                  </span>
                                )}
                              </div>
                              {budget.produto && budget.nomeOrcamento && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {budget.produto}
                                </p>
                              )}

                              {/* Follow-up "Vendido": Pedido, Pagamento e Parcelas, mantendo campos editáveis */}
                              {budget.status === 'Vendido' && (
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenStatusModal(budget, e)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 text-emerald-900 text-xs font-bold transition-colors shadow-2xs cursor-pointer group"
                                    title="Clique para editar número do pedido, pagamento ou parcelas"
                                  >
                                    <span>Pedido #{budget.pedido || '—'}</span>
                                    <Pencil className="w-2.5 h-2.5 text-emerald-600 group-hover:text-emerald-800 transition-colors" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenStatusModal(budget, e)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors shadow-2xs cursor-pointer group"
                                    title="Clique para editar forma de pagamento ou parcelas"
                                  >
                                    <span>
                                      {budget.formaPagamento || 'Pix'}
                                      {budget.parcelas && budget.formaPagamento === 'Cartão'
                                        ? ` (${budget.parcelas})`
                                        : ''}
                                    </span>
                                    <Pencil className="w-2.5 h-2.5 text-emerald-600 group-hover:text-emerald-800 transition-colors" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* 2. Valor */}
                            <div className="flex-shrink-0 md:text-right min-w-[120px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Valor
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                                {formatCurrency(budget.valor)}
                              </span>
                            </div>

                            {/* 3. Cadastro */}
                            <div className="flex-shrink-0 md:text-right min-w-[100px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Cadastro
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center md:justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDateOnly(budget.dataCriacao || budget.createdAt)}</span>
                              </span>
                            </div>

                            {/* 4. Última Atualização - Somente data, sem horário */}
                            <div className="flex-shrink-0 md:text-right min-w-[110px]">
                              <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                                Última Atualização
                              </span>
                              <span className="text-xs font-semibold text-slate-600 flex items-center md:justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatDateOnly(budget.dataAtualizacao)}</span>
                              </span>
                            </div>

                            {/* 5. Ações de Contato: WhatsApp e Ligação */}
                            {(() => {
                              const budgetPhone = resolveBudgetPhone(budget);
                              const cleanDigits = budgetPhone.replace(/\D/g, '');
                              const waUrl = cleanDigits ? `https://wa.me/55${cleanDigits}` : null;
                              const telUrl = cleanDigits ? `tel:${cleanDigits}` : null;

                              return (
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {waUrl ? (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-8.5 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                      title={`Conversar no WhatsApp (${budgetPhone})`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
                                      <span>WhatsApp</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showToast('Cliente sem telefone cadastrado.');
                                      }}
                                      className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                      title="Telefone não informado"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>WhatsApp</span>
                                    </button>
                                  )}

                                  {telUrl ? (
                                    <a
                                      href={telUrl}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-8.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0052cc] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                      title={`Fazer Ligação (${budgetPhone})`}
                                    >
                                      <PhoneCall className="w-3.5 h-3.5 text-[#0052cc] stroke-[2.2]" />
                                      <span>Ligação</span>
                                    </a>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showToast('Cliente sem telefone cadastrado.');
                                      }}
                                      className="h-8.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                      title="Telefone não informado"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                      <span>Ligação</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 6. Status com seta (Botão interativo para alterar o status) */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleOpenStatusModal(budget, e)}
                                title="Clique para alterar o status deste orçamento"
                                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:shadow-2xs active:scale-95 ${statusBadgeClass}`}
                              >
                                <span>{budget.status}</span>
                                <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              {/* Botão sutil para ver histórico de anotações daquele orçamento */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingHistoryBudget(budget);
                                }}
                                title="Ver histórico deste orçamento"
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ALTERAR STATUS DO ORÇAMENTO:
          "Ao alterar o status, abrir uma caixa pequena para adicionar um comentário.
          O comentário é OPCIONAL: deve ser possível salvar a alteração sem escrever comentário.
          Ao salvar:
          - atualizar o status;
          - atualizar automaticamente a Última Atualização;
          - se houver comentário, salvar;
          - registrar no histórico do orçamento." */}
      {transitioningBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#091122]">Atualizar Status</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  {transitioningBudget.cliente}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTransitioningBudget(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nome do Orçamento e Valor */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-700">
              <span className="font-semibold block text-slate-900 truncate">
                {transitioningBudget.nomeOrcamento || transitioningBudget.produto}
              </span>
              <span className="font-bold text-[#0052cc]">
                Valor: {formatCurrency(transitioningBudget.valor)}
              </span>
            </div>

            {/* Seletor de Novo Status */}
            <div>
              <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                Novo Status
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {STATUS_LIST.map((st) => {
                  const isSelected = selectedNewStatus === st;
                  const isVendido = st === 'Vendido';
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedNewStatus(st)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                        isSelected
                          ? isVendido
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-[#0052cc] text-white border-[#0052cc] shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : st === 'Vendido'
                              ? 'bg-emerald-500'
                              : st === 'Perdido'
                              ? 'bg-rose-500'
                              : st === 'Negociando'
                              ? 'bg-purple-500'
                              : st === 'Aguardando Retorno'
                              ? 'bg-amber-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span>{st}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>

              {selectedNewStatus === 'Vendido' && (
                <div className="bg-emerald-50/90 border-2 border-emerald-400/80 rounded-2xl p-4 space-y-4 mt-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Dados da Venda
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                      Registro Comercial & Metas
                    </span>
                  </div>

                  {/* Número do Pedido */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">
                      Número do Pedido: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={numeroPedidoInput}
                      onChange={(e) => {
                        setNumeroPedidoInput(e.target.value.replace(/^#+/, ''));
                        if (pedidoError) setPedidoError('');
                      }}
                      placeholder="Ex: 1052"
                      className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-slate-900 outline-none transition-all shadow-2xs"
                    />
                    {pedidoError && (
                      <p className="text-xs font-bold text-rose-600 mt-1 animate-in fade-in duration-150">
                        {pedidoError}
                      </p>
                    )}
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                      Forma de Pagamento: <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Pix', 'Boleto', 'Cartão'] as const).map((forma) => {
                        const isSelected = formaPagamentoInput === forma;
                        return (
                          <button
                            key={forma}
                            type="button"
                            onClick={() => setFormaPagamentoInput(forma)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all border text-center cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                                : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/60'
                            }`}
                          >
                            {forma}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Parcelas (se Cartão) */}
                  {formaPagamentoInput === 'Cartão' && (
                    <div className="animate-in fade-in duration-150 pt-1">
                      <label className="block text-xs font-bold text-emerald-950 mb-1">
                        Parcelas: <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={parcelasInput}
                        onChange={(e) => setParcelasInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-sm font-bold text-slate-900 outline-none transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="1x">1x à vista</option>
                        {Array.from({ length: 11 }, (_, i) => i + 2).map((p) => (
                          <option key={p} value={`${p}x`}>
                            {p}x no cartão
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-[11px] text-emerald-900 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-emerald-200/70 space-y-0.5">
                    <p>• <strong>Valor da venda:</strong> {formatCurrency(transitioningBudget.valor)}</p>
                    <p>• <strong>Cliente vinculado:</strong> {transitioningBudget.cliente}</p>
                    <p>• A venda será lançada na aba <strong>Metas</strong> com os dados de pagamento selecionados.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comentário da Atualização (Opcional) */}
            <div>
              <label className="block text-xs font-bold text-[#091122] mb-1.5 uppercase tracking-wider">
                Comentário <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                rows={3}
                value={statusComment}
                autoFocus
                onChange={(e) => {
                  setStatusComment(e.target.value);
                  if (statusError) setStatusError('');
                }}
                placeholder="Adicione um comentário ou observação sobre esta atualização (opcional)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-[#0052cc] focus:bg-white rounded-xl text-xs sm:text-sm text-slate-800 outline-none transition-all resize-none"
              />
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransitioningBudget(null)}
                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStatusChange}
                className="h-9 px-5 rounded-xl bg-[#0052cc] hover:bg-[#0047b3] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Salvar Atualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DO ORÇAMENTO */}
      {viewingHistoryBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#091122]">Histórico do Orçamento</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingHistoryBudget.cliente}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingHistoryBudget(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Linha do Tempo */}
            <div className="overflow-y-auto flex-1 custom-scrollbar space-y-3 pr-1">
              {!viewingHistoryBudget.historico || viewingHistoryBudget.historico.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhum registro histórico adicional.
                </p>
              ) : (
                viewingHistoryBudget.historico.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-[#0052cc]">{entry.novoStatus}</span>
                      <span>
                        {entry.data} às {entry.hora}
                      </span>
                    </div>
                    {entry.observacao && (
                      <p className="text-slate-700 font-medium">{entry.observacao}</p>
                    )}
                    {entry.usuario && (
                      <p className="text-[10px] text-slate-400">Por: {entry.usuario}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setViewingHistoryBudget(null)}
                className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
