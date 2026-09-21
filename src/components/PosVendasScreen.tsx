import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  HeartHandshake,
  Plus,
  Search,
  Calendar,
  Phone,
  MessageCircle,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ruler,
  AlertTriangle,
  FileText,
  MoreVertical,
  X,
  Check,
  ClipboardList,
  Wrench,
  ThumbsUp,
  User,
  ShieldCheck,
  Edit3,
  PhoneCall,
  Store,
  Building2,
  PenTool,
  HardHat,
  LayoutGrid,
  List,
  DollarSign,
  Tag,
  Trash2,
} from 'lucide-react';
import { PosVendaItem, PosVendaStatus, PosVendaTipo, ClientRecord } from '../types';
import { syncPosVendasDatabase } from '../utils/syncPosVendas';
import { isRecordOfResponsible, getSellerIdForUser } from '../utils/userDataFilter';
import { getUserIdByName } from '../utils/auth';
import { ResponsibleFilterTabs } from './ResponsibleFilterTabs';
import { saveWholeCollectionToSupabase } from '../utils/supabaseClient';

// Cores e Ícones específicos por Tipo de Cliente (Idêntico ao Follow-up)
export const getClientTypeVisual = (type?: string) => {
  switch (type) {
    case 'Cliente Final':
    case 'Consumidor Final':
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

export const formatCurrencyBRL = (val?: number) => {
  if (typeof val !== 'number' || isNaN(val) || val <= 0) return '';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface PosVendasScreenProps {
  currentUserName?: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

const INITIAL_POS_VENDAS: PosVendaItem[] = [];

const STATUS_CONFIG: Record<
  PosVendaStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  'Vendido': {
    label: 'Vendido',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dotBg: 'bg-indigo-500',
    icon: CheckCircle2,
  },
  'Aguardando Contato': {
    label: 'Aguardando Contato',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dotBg: 'bg-amber-500',
    icon: Clock,
  },
  'Instalação Pendente': {
    label: 'Instalação Pendente',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    dotBg: 'bg-cyan-500',
    icon: Wrench,
  },
  'Vistoria Agendada': {
    label: 'Vistoria Agendada',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dotBg: 'bg-[#1D4ED8]',
    icon: Ruler,
  },
  'Assistência Aberta': {
    label: 'Assistência Aberta',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dotBg: 'bg-rose-500',
    icon: AlertTriangle,
  },
  'Finalizado / Satisfeito': {
    label: 'Finalizado / Satisfeito',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dotBg: 'bg-emerald-500',
    icon: CheckCircle2,
  },
};

const ALL_STATUSES: PosVendaStatus[] = [
  'Vendido',
  'Aguardando Contato',
  'Instalação Pendente',
  'Vistoria Agendada',
  'Assistência Aberta',
  'Finalizado / Satisfeito',
];

type FilterPill =
  | 'Todos'
  | 'Contato 7 Dias'
  | 'Vistoria Pendente'
  | 'Assistência Técnica'
  | 'Finalizados';

const renderStars = (rating: number = 0) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3.5 h-3.5 ${
          star <= rating
            ? 'text-amber-400 fill-amber-400'
            : 'text-slate-200 fill-slate-100'
        }`}
      />
    ))}
  </div>
);

export const PosVendasScreen: React.FC<PosVendasScreenProps> = ({
  currentUserName = 'Vinicius Gestor',
  onBackToCadastro,
  onNavigateTab,
}) => {
  // State: list of records
  const [records, setRecords] = useState<PosVendaItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_pos_vendas_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: PosVendaItem) => ({
            ...item,
            orderNumber: (item.orderNumber || '').replace(/#/g, ''),
          }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Clients from CRM for dropdown
  const [registeredClients, setRegisteredClients] = useState<ClientRecord[]>([]);

  // Search & Filter pills
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterPill>('Todos');

  // Responsável filter for Diretor Éder Perez
  const isDirector = (currentUserName || '').toLowerCase().includes('eder');
  const [responsibleTab, setResponsibleTab] = useState<string>('Todos');

  // Modo de Visualização: 'cards' (Padrão e idêntico ao Follow-up) ou 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Interactive inline status dropdown
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Actions menu dropdown (•••)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination (8 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Modals
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<PosVendaItem | null>(null);
  const [editingFeedbackRecord, setEditingFeedbackRecord] = useState<PosVendaItem | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PosVendaItem | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // Form State for "+ Novo Registro"
  const [formPedido, setFormPedido] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formProjeto, setFormProjeto] = useState('');
  const [formInstalador, setFormInstalador] = useState('');
  const [formDataConclusao, setFormDataConclusao] = useState('2026-09-06');
  const [formTipo, setFormTipo] = useState<PosVendaTipo>('Contato de Satisfação');
  const [formAvaliacao, setFormAvaliacao] = useState<number>(5);
  const [formFeedback, setFormFeedback] = useState('');
  const [formDataRetorno, setFormDataRetorno] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Form State for "Adicionar Nota de Feedback"
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save to localStorage whenever records change (without triggering cascading sync loops)
  useEffect(() => {
    try {
      localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(records));
    } catch {
      // ignore
    }
  }, [records]);

  // Load clients from CRM and listen to pos-vendas updates from Follow-up and Metas
  useEffect(() => {
    const loadStoredRecords = () => {
      // Se a alteração acabou de ser feita localmente por esta tela, não reprocessar para não piscar
      if (isInternalUpdateRef.current) return;

      try {
        const stored = localStorage.getItem('fenix_pos_vendas_db');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecords((prev) => {
              // Previne re-renderização desnecessária e efeito de piscar se o conteúdo for idêntico
              if (JSON.stringify(prev) === stored) {
                return prev;
              }
              return parsed;
            });
            return;
          }
        }
        const synced = syncPosVendasDatabase();
        if (synced && synced.length > 0) {
          setRecords((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(synced)) return prev;
            return synced;
          });
        }
      } catch {
        // ignore
      }
    };

    loadStoredRecords();

    window.addEventListener('fenix_pos_vendas_updated', loadStoredRecords);
    window.addEventListener('fenix_metas_updated', loadStoredRecords);
    window.addEventListener('fenix_followup_updated', loadStoredRecords);
    window.addEventListener('storage', loadStoredRecords);

    try {
      const storedClients = localStorage.getItem('fenix_clients_db');
      if (storedClients) {
        setRegisteredClients(JSON.parse(storedClients));
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('fenix_pos_vendas_updated', loadStoredRecords);
      window.removeEventListener('fenix_metas_updated', loadStoredRecords);
      window.removeEventListener('fenix_followup_updated', loadStoredRecords);
      window.removeEventListener('storage', loadStoredRecords);
    };
  }, []);

  // Close open dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-posvenda-dropdown="true"]')) {
        setOpenStatusDropdownId(null);
      }
      if (!target.closest('[data-posvenda-action-menu="true"]')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Responsible counts for Director Éder Perez
  const responsibleCounts = useMemo(() => {
    if (!isDirector) return undefined;
    return {
      todos: records.length,
      eder: records.filter((r) => isRecordOfResponsible(r, 'Éder')).length,
      vanessa: records.filter((r) => isRecordOfResponsible(r, 'Vanessa')).length,
      jhessica: records.filter((r) => isRecordOfResponsible(r, 'Jhessica')).length,
      demais: records.filter((r) => isRecordOfResponsible(r, 'demais')).length,
    };
  }, [records, isDirector]);

  // Scoped records:
  // 2. PÓS-VENDAS — ÉDER PEREZ:
  // Na aba Pós-Vendas do Éder Perez, mostrar somente:
  // - Follow-ups que o próprio Éder marcou como “Vendido”.
  // - Vendas cadastradas pelo próprio Éder na própria aba Metas.
  // Não misturar informações de outros usuários.
  const userRecords = useMemo(() => {
    if (isDirector) {
      return records.filter((r) => {
        const isEder =
          isRecordOfResponsible(r, 'Éder') ||
          isRecordOfResponsible(r, currentUserName || 'Éder Perez');
        if (!isEder) return false;

        // Somente Follow-ups que o próprio Éder marcou como "Vendido" ou Vendas cadastradas pelo próprio Éder na aba Metas
        return r.origem === 'followup' || r.origem === 'metas' || !r.origem;
      });
    }
    // Usuário comum visualiza somente seus próprios registros
    return records.filter((r) => isRecordOfResponsible(r, currentUserName || ''));
  }, [records, isDirector, currentUserName]);

  // Dynamic KPIs
  const metrics = useMemo(() => {
    const total = userRecords.length;
    let contatoSatisfacao = 0;
    let vistoriaPendente = 0;
    let satisfeitosConcluidos = 0;

    userRecords.forEach((item) => {
      if (item.status === 'Aguardando Contato' || item.type === 'Contato de Satisfação') {
        contatoSatisfacao++;
      }
      if (item.status === 'Vistoria Agendada' || item.type === 'Vistoria Final') {
        vistoriaPendente++;
      }
      if (item.status === 'Finalizado / Satisfeito' || (item.satisfactionRating && item.satisfactionRating >= 4)) {
        satisfeitosConcluidos++;
      }
    });

    return { total, contatoSatisfacao, vistoriaPendente, satisfeitosConcluidos };
  }, [userRecords]);

  // Filtered rows
  const filteredRecords = useMemo(() => {
    return userRecords.filter((item) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesClient = item.clientName.toLowerCase().includes(query);
        const matchesOrder = item.orderNumber.toLowerCase().includes(query);
        const matchesInstaller = (item.installerName || '').toLowerCase().includes(query);
        const matchesProject = item.projectDescription.toLowerCase().includes(query);
        if (!matchesClient && !matchesOrder && !matchesInstaller && !matchesProject) {
          return false;
        }
      }

      // 2. Pill filter
      if (activeFilter === 'Todos') return true;
      if (activeFilter === 'Contato 7 Dias') {
        return item.status === 'Aguardando Contato' || item.type === 'Contato de Satisfação';
      }
      if (activeFilter === 'Vistoria Pendente') {
        return item.status === 'Vistoria Agendada' || item.type === 'Vistoria Final';
      }
      if (activeFilter === 'Assistência Técnica') {
        return item.status === 'Assistência Aberta' || item.type === 'Assistência Técnica';
      }
      if (activeFilter === 'Finalizados') {
        return item.status === 'Finalizado / Satisfeito';
      }
      return true;
    });
  }, [userRecords, searchTerm, activeFilter]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Date formatter (DD/MM/AAAA)
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '--/--/----';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Change status directly in row or card (instant visual feedback, stable screen, zero reload)
  const handleStatusChange = (id: string, newStatus: PosVendaStatus, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    isInternalUpdateRef.current = true;

    setRecords((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      });
      try {
        localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(updated));
        saveWholeCollectionToSupabase('fenix_pos_vendas_db', updated, currentUserName).catch(() => {});
      } catch {
        // ignore
      }
      return updated;
    });

    setOpenStatusDropdownId(null);
    showToast(`Status alterado para "${newStatus}"`);

    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 600);
  };

  // Action: Encerrar acompanhamento
  const handleEncerrarAcompanhamento = (id: string) => {
    handleStatusChange(id, 'Finalizado / Satisfeito');
    setOpenActionMenuId(null);
  };

  // Action: Excluir registro com confirmação e persistência (Requisito 7)
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeletingRecord(true);
    isInternalUpdateRef.current = true;

    try {
      const updated = records.filter((r) => r.id !== recordToDelete.id);
      setRecords(updated);
      localStorage.setItem('fenix_pos_vendas_db', JSON.stringify(updated));
      await saveWholeCollectionToSupabase('fenix_pos_vendas_db', updated, currentUserName);
      showToast(`Acompanhamento de "${recordToDelete.cliente}" excluído com sucesso.`);
      setRecordToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir registro de pós-venda:', err);
      showToast('Erro ao excluir registro. Tente novamente.');
    } finally {
      setIsDeletingRecord(false);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 600);
    }
  };

  // Open Modal "+ Novo Registro"
  const handleOpenNewModal = () => {
    // Generate next order number (purely numeric, without '#')
    const maxNumber = records.reduce((max, r) => {
      const num = parseInt((r.orderNumber || '').replace(/[^0-9]/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 1045);
    setFormPedido(`${maxNumber + 1}`);
    setFormCliente('');
    setFormTelefone('');
    setFormProjeto('Piso Vinílico SPC - 45m²');
    setFormInstalador('Carlos Silva & Equipe');
    setFormDataConclusao('2026-09-06');
    setFormTipo('Contato de Satisfação');
    setFormAvaliacao(5);
    setFormFeedback('');
    setFormDataRetorno('2026-09-13');
    setFormErrors({});
    setIsNewRecordModalOpen(true);
  };

  // Save new record
  const handleSaveNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const cleanOrderNumber = formPedido.trim().replace(/#/g, '');

    if (!cleanOrderNumber) {
      errors.pedido = 'Informe o número do pedido';
    }
    if (!formCliente.trim()) {
      errors.cliente = 'Digite o nome do cliente';
    }
    if (!formDataConclusao) {
      errors.dataConclusao = 'Informe a data de conclusão da obra';
    }
    if (!formTipo) {
      errors.tipo = 'Selecione o tipo de acompanhamento';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let initialStatus: PosVendaStatus = 'Aguardando Contato';
    if (formTipo === 'Vistoria Final') initialStatus = 'Vistoria Agendada';
    if (formTipo === 'Assistência Técnica') initialStatus = 'Assistência Aberta';
    if (formAvaliacao >= 4 && formFeedback.trim().length > 0) initialStatus = 'Finalizado / Satisfeito';

    const userSellerId = getSellerIdForUser(currentUserName || '');
    const userId = getUserIdByName(currentUserName || '') || userSellerId;

    const newRecord: PosVendaItem = {
      id: `pv_${Date.now()}`,
      orderNumber: cleanOrderNumber,
      clientName: formCliente.trim(),
      clientPhone: formTelefone.trim() || '(11) 98765-4321',
      projectDescription: formProjeto.trim() || 'Piso Vinílico SPC e Rodapés',
      installerName: formInstalador.trim() || 'Equipe Especializada',
      completionDate: formDataConclusao,
      satisfactionRating: formAvaliacao,
      status: initialStatus,
      type: formTipo,
      feedback: formFeedback.trim(),
      nextFollowUpDate: formDataRetorno,
      vendedor: currentUserName,
      vendedorId: userSellerId,
      responsavel: currentUserName,
      responsavelId: userId,
      criadoPor: currentUserName,
      criadoPorId: userId,
      creatorId: userId,
      createdAt: new Date().toISOString(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    setIsNewRecordModalOpen(false);
    showToast('Novo registro de pós-venda cadastrado com sucesso!');
  };

  // Handle client selection in New Record modal
  const handleClientSelectChange = (clientName: string) => {
    setFormCliente(clientName);
    const found = registeredClients.find((c) => c.name === clientName);
    if (found && found.whatsapp) {
      setFormTelefone(found.whatsapp);
    }
  };

  // Open "Adicionar nota de feedback"
  const handleOpenFeedbackModal = (record: PosVendaItem) => {
    setEditingFeedbackRecord(record);
    setFeedbackRating(record.satisfactionRating && record.satisfactionRating > 0 ? record.satisfactionRating : 5);
    setFeedbackText(record.feedback || '');
    setFeedbackNotes(record.notes || '');
    setOpenActionMenuId(null);
  };

  // Save feedback
  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedbackRecord) return;

    setRecords((prev) =>
      prev.map((item) => {
        if (item.id === editingFeedbackRecord.id) {
          return {
            ...item,
            satisfactionRating: feedbackRating,
            feedback: feedbackText.trim(),
            notes: feedbackNotes.trim(),
            status: feedbackRating >= 4 && item.status === 'Aguardando Contato' ? 'Finalizado / Satisfeito' : item.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    setEditingFeedbackRecord(null);
    showToast('Feedback e avaliação atualizados com sucesso!');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 pb-12">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#071a52] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-medium border border-blue-500/30 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="space-y-3">
        {/* Breadcrumb: Início > Pós-Vendas */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 select-none">
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('Início') : onBackToCadastro?.()}
            className="flex items-center gap-1 hover:text-[#1D4ED8] transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </button>
          <span className="text-slate-400 font-normal">›</span>
          <span className="text-slate-800 font-semibold">Pós-Vendas</span>
        </nav>

        {/* Título, Subtítulo e Botão superior direito "+ Novo Registro" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-200/80 shadow-xs">
              <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#071a52] tracking-tight">
                Pós-Vendas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
                Acompanhe a satisfação dos clientes, vistorias finais e garantias após a entrega.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNewModal}
            className="h-10 px-5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm transition-all cursor-pointer self-start sm:self-center active:scale-95"
          >
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* 2. PÓS-VENDAS — ÉDER PEREZ: Mostra somente follow-ups que o próprio Éder marcou como Vendido e vendas da aba Metas cadastradas por ele */}

      {/* 2. CARDS DE RESUMO / MÉTRICAS (KPIs NO TOPO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total em Acompanhamento */}
        <div
          onClick={() => setActiveFilter('Todos')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Todos'
              ? 'border-[#1D4ED8] ring-2 ring-blue-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Ver todos os registros"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total em Acompanhamento
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#071a52] mt-0.5 block">
              {metrics.total}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-100/80">
            <ClipboardList className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Contato de Satisfação */}
        <div
          onClick={() => setActiveFilter('Contato 7 Dias')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Contato 7 Dias'
              ? 'border-amber-500 ring-2 ring-amber-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar contatos de satisfação"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Contato de Satisfação
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5 block">
              {metrics.contatoSatisfacao}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100/80">
            <Phone className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Vistoria Pendente */}
        <div
          onClick={() => setActiveFilter('Vistoria Pendente')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Vistoria Pendente'
              ? 'border-purple-500 ring-2 ring-purple-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar vistorias pendentes"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Vistoria Pendente
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-600 mt-0.5 block">
              {metrics.vistoriaPendente}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100/80">
            <Ruler className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Clientes Satisfeitos / Concluídos */}
        <div
          onClick={() => setActiveFilter('Finalizados')}
          className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
            activeFilter === 'Finalizados'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
          title="Filtrar finalizados e satisfeitos"
        >
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Clientes Satisfeitos
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5 block">
              {metrics.satisfeitosConcluidos}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100/80">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS RÁPIDOS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de busca com ícone de lupa */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido ou instalador..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15 transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pílulas/Abas de filtro de status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar select-none">
          {(
            [
              'Todos',
              'Contato 7 Dias',
              'Vistoria Pendente',
              'Assistência Técnica',
              'Finalizados',
            ] as FilterPill[]
          ).map((pill) => {
            const isActive = activeFilter === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setActiveFilter(pill)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-2xs border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>

        {/* Toggle de Modo de Visualização: Cards (Padrão e idêntico ao Follow-up) ou Tabela */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start md:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualização em Cards individuais (Conceito Follow-up)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Visualização em Tabela"
          >
            <List className="w-3.5 h-3.5" />
            <span>Tabela</span>
          </button>
        </div>
      </div>

      {/* 4. VISUALIZAÇÃO: CARDS (PADRÃO IDÊNTICO AO FOLLOW-UP) OU TABELA */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {paginatedRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 mx-auto flex items-center justify-center mb-3 border border-slate-200/60">
                <HeartHandshake className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum acompanhamento encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {searchTerm || activeFilter !== 'Todos'
                  ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
                  : 'Os registros marcados como "Vendido" no Follow-up e vendas das Metas aparecem aqui automaticamente.'}
              </p>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="mt-3 px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Registro</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedRecords.map((item) => {
                const visual = getClientTypeVisual(item.clientType);
                const TypeIcon = visual.Icon;
                const cleanPhone = (item.clientPhone || '').replace(/\D/g, '');
                const statusCfg =
                  STATUS_CONFIG[item.status] || STATUS_CONFIG['Aguardando Contato'];
                const StatusIcon = statusCfg.icon;
                const isStatusOpen = openStatusDropdownId === item.id;
                const isActionOpen = openActionMenuId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-[22px] sm:rounded-[26px] border ${visual.cardBorder} ${visual.cardBg} p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-md transition-all flex flex-col justify-between relative`}
                  >
                    {/* Top Section */}
                    <div>
                      {/* Cabeçalho do Card */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${visual.iconBg}`}
                            title={`Tipo de Cliente: ${item.clientType || 'Cliente Final'}`}
                          >
                            <TypeIcon className="w-5 h-5 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${visual.badgeBg}`}
                              >
                                {item.clientType || 'Cliente Final'}
                              </span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs">
                                Pedido #{item.orderNumber}
                              </span>
                              {item.origem && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-600 border border-slate-200/70">
                                  {item.origem === 'followup'
                                    ? 'Follow-up'
                                    : item.origem === 'metas'
                                    ? 'Metas'
                                    : 'Pós-Venda'}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black text-[#091122] truncate mt-1">
                              {item.clientName}
                            </h3>
                          </div>
                        </div>

                        {/* Menu de opções (•••) */}
                        <div
                          data-posvenda-action-menu="true"
                          className="relative inline-block flex-shrink-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionMenuId(isActionOpen ? null : item.id)
                            }
                            className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 shadow-2xs"
                            title="Opções do acompanhamento"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isActionOpen && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingRecord(item);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ver detalhes do pedido</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenFeedbackModal(item)}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Adicionar nota de feedback</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              <button
                                type="button"
                                onClick={() => handleEncerrarAcompanhamento(item.id)}
                                className="w-full px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Encerrar acompanhamento</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setRecordToDelete(item);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Excluir registro</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação Imediata: WhatsApp e Ligação (Requisito 3) */}
                      <div className="grid grid-cols-2 gap-2 my-3">
                        {/* Botão WhatsApp com telefone cadastrado */}
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/55${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3 rounded-xl border border-emerald-300 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            title={`Conversar com ${item.clientName} no WhatsApp (${item.clientPhone})`}
                          >
                            <MessageCircle className="w-4 h-4 fill-white text-emerald-500" />
                            <span>WhatsApp</span>
                          </a>
                        ) : (
                          <div className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <MessageCircle className="w-4 h-4 text-slate-400" />
                            <span>Sem Tel.</span>
                          </div>
                        )}

                        {/* Botão Ligação com telefone cadastrado */}
                        {cleanPhone ? (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="h-9 px-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#0052cc] text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                            title={`Ligar para ${item.clientName} (${item.clientPhone})`}
                          >
                            <PhoneCall className="w-4 h-4 text-[#0052cc] stroke-[2.2]" />
                            <span>Ligação</span>
                          </a>
                        ) : (
                          <div className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-100/70 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>Sem Tel.</span>
                          </div>
                        )}
                      </div>

                      {/* Grade de Informações Organizadas */}
                      <div className="bg-white/85 rounded-xl border border-slate-200/80 p-3 space-y-2 text-xs shadow-2xs">
                        {/* Descrição do Projeto / Material */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Projeto / Material
                          </span>
                          <span className="font-bold text-slate-800 line-clamp-2 leading-snug">
                            {item.projectDescription}
                          </span>
                        </div>

                        {/* Linha dupla: Valor e Telefone */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          {item.valor && item.valor > 0 ? (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Valor da Venda
                              </span>
                              <span className="font-extrabold text-emerald-700 text-xs">
                                {formatCurrencyBRL(item.valor)}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Tipo de Contato
                              </span>
                              <span className="font-semibold text-slate-700">
                                {item.type}
                              </span>
                            </div>
                          )}

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Telefone
                            </span>
                            <span className="font-medium text-slate-700 truncate block">
                              {item.clientPhone || 'Não informado'}
                            </span>
                          </div>
                        </div>

                        {/* Linha dupla: Instalador e Data de Conclusão */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Instalador
                            </span>
                            <span className="font-semibold text-slate-700 truncate block">
                              {item.installerName || 'A Definir'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Data Venda/Instalação
                            </span>
                            <span className="font-medium text-slate-700">
                              {formatDateBR(item.completionDate)}
                            </span>
                          </div>
                        </div>

                        {/* Avaliação de Satisfação */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Satisfação:
                          </span>
                          <div
                            onClick={() => handleOpenFeedbackModal(item)}
                            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Clique para avaliar ou alterar nota"
                          >
                            {renderStars(item.satisfactionRating || 0)}
                            <span className="text-[11px] font-bold text-slate-700 ml-1">
                              {item.satisfactionRating && item.satisfactionRating > 0
                                ? `${item.satisfactionRating}.0`
                                : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Feedback ou Notas existentes */}
                      {(item.feedback || item.notes) && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-white/70 border border-slate-200/70 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-1">
                            <ThumbsUp className="w-3 h-3 text-amber-500" />
                            <span>Observações / Feedback:</span>
                          </div>
                          <p className="line-clamp-2 italic text-slate-700 text-[11px]">
                            "{item.feedback || item.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section: Status Selector & Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                      {/* Dropdown de Status do Card */}
                      <div data-posvenda-dropdown="true" className="relative flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenStatusDropdownId(isStatusOpen ? null : item.id)
                          }
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border} hover:brightness-95`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full ${statusCfg.dotBg}`} />
                            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{statusCfg.label}</span>
                          </div>
                          <ChevronDown
                            className={`w-3 h-3 ml-0.5 opacity-70 transition-transform duration-150 flex-shrink-0 ${
                              isStatusOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isStatusOpen && (
                          <div className="absolute left-0 bottom-full mb-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              Alterar Status
                            </div>
                            {ALL_STATUSES.map((statusOption) => {
                              const optCfg = STATUS_CONFIG[statusOption];
                              const isCurrent = item.status === statusOption;
                              const OptIcon = optCfg.icon;

                              return (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={(e) =>
                                    handleStatusChange(item.id, statusOption, e)
                                  }
                                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                    isCurrent
                                      ? 'bg-slate-50/80 font-bold text-[#1D4ED8]'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-2 h-2 rounded-full ${optCfg.dotBg}`}
                                    />
                                    <OptIcon className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{optCfg.label}</span>
                                  </div>
                                  {isCurrent && (
                                    <Check className="w-3.5 h-3.5 text-[#1D4ED8]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Botões secundários */}
                      <button
                        type="button"
                        onClick={() => handleOpenFeedbackModal(item)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-slate-700 hover:text-amber-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                        title="Adicionar avaliação ou feedback"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Feedback</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewingRecord(item)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-[#0052cc] text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                        title="Ver detalhes completos"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Detalhes</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 4. TABELA DE CONTROLE DE PÓS-VENDA */
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600 uppercase tracking-wider select-none">
                <th className="py-4 px-5 w-28">Pedido</th>
                <th className="py-4 px-5">Cliente</th>
                <th className="py-4 px-5">Tipo / Material</th>
                <th className="py-4 px-5 w-36">Instalação</th>
                <th className="py-4 px-5 w-36">Satisfação</th>
                <th className="py-4 px-5 w-52">Status</th>
                <th className="py-4 px-4 w-16 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 px-4 text-center">
                    <div className="max-w-xs mx-auto space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto border border-blue-100">
                        <HeartHandshake className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Nenhum registro encontrado
                      </p>
                      <p className="text-xs text-slate-400">
                        {searchTerm || activeFilter !== 'Todos'
                          ? 'Tente ajustar os filtros ou o termo de busca.'
                          : 'Inicie adicionando um novo registro de pós-venda.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenNewModal}
                        className="mt-2 px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Registro</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['Aguardando Contato'];
                  const StatusIcon = statusCfg.icon;
                  const isStatusOpen = openStatusDropdownId === item.id;
                  const isActionOpen = openActionMenuId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Coluna 1: PEDIDO */}
                      <td className="py-4 px-5 font-bold text-[#071a52] text-sm">
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded-md text-slate-800 font-bold text-xs border border-slate-200/60">
                          {item.orderNumber}
                        </span>
                      </td>

                      {/* Coluna 2: CLIENTE com telefone/whatsapp em cinza */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-800 leading-snug">
                          {item.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.clientPhone}</span>
                        </div>
                      </td>

                      {/* Coluna 3: TIPO / MATERIAL */}
                      <td className="py-4 px-5">
                        <div className="text-slate-700 font-medium leading-snug max-w-xs">
                          {item.projectDescription}
                        </div>
                        {item.installerName && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5 flex items-center gap-1">
                            <span className="text-slate-400">Inst:</span>
                            <span>{item.installerName}</span>
                          </div>
                        )}
                      </td>

                      {/* Coluna 4: DATA DE INSTALAÇÃO/ENTREGA */}
                      <td className="py-4 px-5 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{formatDateBR(item.completionDate)}</span>
                        </div>
                      </td>

                      {/* Coluna 5: SATISFAÇÃO (Estrelas ou Badge Pendente) */}
                      <td className="py-4 px-5">
                        {item.satisfactionRating && item.satisfactionRating > 0 ? (
                          <div className="flex items-center gap-1" title={`${item.satisfactionRating} de 5 estrelas`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= (item.satisfactionRating || 0)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-200 fill-slate-100'
                                }`}
                              />
                            ))}
                            <span className="text-[11px] font-bold text-slate-600 ml-1">
                              {item.satisfactionRating}.0
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                            Pendente
                          </span>
                        )}
                      </td>

                      {/* Coluna 6: STATUS DE ACOMPANHAMENTO (EDITÁVEL DIRETO NA TABELA) */}
                      <td className="py-4 px-5">
                        <div
                          data-posvenda-dropdown="true"
                          className="relative inline-block"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenStatusDropdownId(
                                isStatusOpen ? null : item.id
                              )
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border} shadow-2xs hover:brightness-95 transition-all cursor-pointer select-none active:scale-95`}
                            title="Clique para alterar o status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`}
                            />
                            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{statusCfg.label}</span>
                            <ChevronDown
                              className={`w-3 h-3 ml-0.5 opacity-70 transition-transform duration-150 ${
                                isStatusOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {/* Dropdown Menu com troca em 1 clique */}
                          {isStatusOpen && (
                            <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                Alterar Status
                              </div>
                              {ALL_STATUSES.map((statusOption) => {
                                const optCfg = STATUS_CONFIG[statusOption];
                                const isCurrent = item.status === statusOption;
                                const OptIcon = optCfg.icon;

                                return (
                                  <button
                                    key={statusOption}
                                    type="button"
                                    onClick={(e) =>
                                      handleStatusChange(item.id, statusOption, e)
                                    }
                                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                      isCurrent
                                        ? 'bg-slate-50/80 font-bold text-[#1D4ED8]'
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`w-2 h-2 rounded-full ${optCfg.dotBg}`}
                                      />
                                      <OptIcon className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{optCfg.label}</span>
                                    </div>
                                    {isCurrent && (
                                      <Check className="w-3.5 h-3.5 text-[#1D4ED8]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Coluna 7: AÇÕES (Menu •••) */}
                      <td className="py-4 px-4 text-center">
                        <div
                          data-posvenda-action-menu="true"
                          className="relative inline-block"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionMenuId(
                                isActionOpen ? null : item.id
                              )
                            }
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                            title="Opções do acompanhamento"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Menu Dropdown de Ações */}
                          {isActionOpen && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingRecord(item);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50/50 hover:text-[#1D4ED8] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ver detalhes do pedido</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenFeedbackModal(item)}
                                className="w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50/50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Adicionar nota de feedback</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              <button
                                type="button"
                                onClick={() => handleEncerrarAcompanhamento(item.id)}
                                className="w-full px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Encerrar acompanhamento</span>
                              </button>

                              <div className="h-px bg-slate-100 my-1" />

                              <button
                                type="button"
                                onClick={() => {
                                  setRecordToDelete(item);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Excluir registro</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Paginação Comum no Rodapé (Cards e Tabela) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Mostrando{' '}
          <span className="font-semibold text-slate-700">
            {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>{' '}
          a{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
          </span>{' '}
          de{' '}
          <span className="font-semibold text-slate-700">
            {filteredRecords.length}
          </span>{' '}
          registros
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 select-none">
            {/* Anterior < */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Botões numéricos [1] [2] */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                  currentPage === page
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Próximo > */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 5. MODAL "NOVO REGISTRO DE PÓS-VENDA" (ESTADO CONDICIONAL) */}
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center border border-blue-100 shadow-2xs">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Novo Registro de Pós-Venda
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cadastre o acompanhamento pós-instalação ou entrega do cliente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewRecordModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveNewRecord} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campo 1: Pedido (Digitação manual livre, sem caractere '#') */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Pedido / Orçamento *
                  </label>
                  <input
                    type="text"
                    value={formPedido}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/#/g, '');
                      setFormPedido(cleanVal);
                      if (formErrors.pedido) {
                        setFormErrors((prev) => ({ ...prev, pedido: '' }));
                      }
                    }}
                    placeholder="Ex: 1046"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all ${
                      formErrors.pedido
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-[#1D4ED8]'
                    }`}
                  />
                  {formErrors.pedido && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {formErrors.pedido}
                    </span>
                  )}
                </div>

                {/* Campo 2: Data da Conclusão/Instalação */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Data da Conclusão / Instalação *
                  </label>
                  <input
                    type="date"
                    value={formDataConclusao}
                    onChange={(e) => {
                      setFormDataConclusao(e.target.value);
                      if (formErrors.dataConclusao) {
                        setFormErrors((prev) => ({ ...prev, dataConclusao: '' }));
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all ${
                      formErrors.dataConclusao
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-[#1D4ED8]'
                    }`}
                  />
                  {formErrors.dataConclusao && (
                    <span className="text-[11px] text-rose-500 mt-1 block">
                      {formErrors.dataConclusao}
                    </span>
                  )}
                </div>
              </div>

              {/* Campo 3: Cliente (Input tipo texto normal para digitação manual livre) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Cliente / Empresa *
                </label>
                <input
                  type="text"
                  value={formCliente}
                  onChange={(e) => {
                    setFormCliente(e.target.value);
                    if (formErrors.cliente) {
                      setFormErrors((prev) => ({ ...prev, cliente: '' }));
                    }
                  }}
                  placeholder="Digite o nome do cliente ou empresa..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all ${
                    formErrors.cliente
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-200 focus:border-[#1D4ED8]'
                  }`}
                />
                {formErrors.cliente && (
                  <span className="text-[11px] text-rose-500 mt-1 block">
                    {formErrors.cliente}
                  </span>
                )}
              </div>

              {/* Telefone & Instalador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Instalador / Responsável
                  </label>
                  <input
                    type="text"
                    value={formInstalador}
                    onChange={(e) => setFormInstalador(e.target.value)}
                    placeholder="Ex: Carlos Silva & Equipe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              {/* Descrição do Projeto / Material */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tipo de Material / Projeto
                </label>
                <input
                  type="text"
                  value={formProjeto}
                  onChange={(e) => setFormProjeto(e.target.value)}
                  placeholder="Ex: Piso Vinílico SPC 5mm Click - 42m² + Rodapés 10cm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              {/* Tipo de Acompanhamento & Avaliação de Satisfação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Tipo de Acompanhamento *
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as PosVendaTipo)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                  >
                    <option value="Contato de Satisfação">Contato de Satisfação (7 dias)</option>
                    <option value="Vistoria Final">Vistoria Final / Entrega Técnica</option>
                    <option value="Assistência Técnica">Assistência Técnica</option>
                    <option value="Garantia e Follow-up">Garantia e Follow-up</option>
                  </select>
                </div>

                {/* Avaliação de Satisfação (1 a 5 estrelas clicáveis) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Avaliação de Satisfação
                  </label>
                  <div className="flex items-center gap-2 h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormAvaliacao(star)}
                        className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        title={`${star} estrelas`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= formAvaliacao
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {formAvaliacao} {formAvaliacao === 1 ? 'estrela' : 'estrelas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback do Cliente */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Feedback do Cliente
                </label>
                <textarea
                  rows={2}
                  value={formFeedback}
                  onChange={(e) => setFormFeedback(e.target.value)}
                  placeholder="Relato do cliente sobre a entrega, qualidade da instalação, limpeza e acabamento..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15 resize-none"
                />
              </div>

              {/* Próxima Ação / Data de Retorno */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Próxima Ação / Data de Retorno (opcional)
                </label>
                <input
                  type="date"
                  value={formDataRetorno}
                  onChange={(e) => setFormDataRetorno(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              {/* Botões do Rodapé: "Cancelar" e "Salvar Registro" */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL "VER DETALHES DO PEDIDO" */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center border border-blue-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Ficha de Pós-Venda {viewingRecord.orderNumber}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Informações consolidadas de garantia e satisfação.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Card Resumo do Cliente */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[viewingRecord.status]?.bg} ${STATUS_CONFIG[viewingRecord.status]?.text}`}>
                    {viewingRecord.status}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-800">{viewingRecord.clientName}</div>
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {viewingRecord.clientPhone}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Entregue em: {formatDateBR(viewingRecord.completionDate)}
                  </span>
                </div>
              </div>

              {/* Informações Técnicas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 font-semibold mb-1">Projeto / Material</span>
                  <span className="font-bold text-slate-800">{viewingRecord.projectDescription}</span>
                </div>
                <div className="p-3 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 font-semibold mb-1">Instalador Responsável</span>
                  <span className="font-bold text-slate-800">{viewingRecord.installerName || 'Não informado'}</span>
                </div>
              </div>

              {/* Avaliação */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-1.5">
                <span className="block text-xs text-slate-400 font-semibold">Avaliação de Satisfação</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (viewingRecord.satisfactionRating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">
                    {viewingRecord.satisfactionRating ? `${viewingRecord.satisfactionRating}.0 / 5.0` : 'Ainda não avaliado'}
                  </span>
                </div>
              </div>

              {/* Feedback */}
              {viewingRecord.feedback && (
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1">
                  <span className="block text-xs font-bold text-amber-800 uppercase tracking-wider">Relato do Cliente</span>
                  <p className="text-slate-700 italic">"{viewingRecord.feedback}"</p>
                </div>
              )}

              {/* Observações Internas */}
              {viewingRecord.notes && (
                <div className="p-4 bg-blue-50/40 border border-blue-200/60 rounded-xl space-y-1">
                  <span className="block text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">Notas Internas</span>
                  <p className="text-slate-700">{viewingRecord.notes}</p>
                </div>
              )}

              {/* Próxima Ação */}
              {viewingRecord.nextFollowUpDate && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-purple-800 font-medium">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>Próximo contato programado para: {formatDateBR(viewingRecord.nextFollowUpDate)}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors cursor-pointer text-xs sm:text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL "ADICIONAR NOTA DE FEEDBACK" */}
      {editingFeedbackRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Nota de Feedback {editingFeedbackRecord.orderNumber}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {editingFeedbackRecord.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFeedbackRecord(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="p-6 space-y-4 text-xs sm:text-sm">
              {/* Seletor de estrelas */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Avaliação Geral do Cliente
                </label>
                <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= feedbackRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {feedbackRating}.0 / 5.0
                  </span>
                </div>
              </div>

              {/* Relato do cliente */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Depoimento / Relato do Cliente
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="O que o cliente relatou sobre o piso, a equipe de instalação e a pontualidade..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15 resize-none"
                />
              </div>

              {/* Observações internas da equipe */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Observações Internas da Fênix
                </label>
                <textarea
                  rows={2}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="Anotações para garantia, reposição futura ou indicação..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/15 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingFeedbackRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Salvar Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Acompanhamento (Requisito 7) */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Excluir Acompanhamento?
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Tem certeza de que deseja excluir o acompanhamento do cliente{' '}
              <strong className="text-slate-900">{recordToDelete.cliente}</strong> (Pedido #{recordToDelete.pedido})? Esta alteração será salva no sistema e não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRecord ? 'Excluindo...' : 'Sim, Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
