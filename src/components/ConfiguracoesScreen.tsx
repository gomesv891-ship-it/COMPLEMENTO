import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Settings,
  Users,
  Bell,
  Shield,
  Search,
  UserPlus,
  KeyRound,
  Pencil,
  Trash2,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Target,
  Calendar,
  Clock,
  TrendingUp,
  RotateCcw,
  HelpCircle,
  DollarSign,
  Info,
  PhoneCall,
  CheckSquare,
  FileText,
  Package,
} from 'lucide-react';
import { CustosVariaveisConfigView } from './CustosVariaveisConfigView';
import { CustosConfigView } from './custos/CustosConfigView';
import { UserAvatar } from './UserAvatar';
import {
  adminUpdateUserAccount,
  adminResetUserPassword,
  updateUserPasswordDirectly,
  adminCreateOrUpdateUserAccount,
  adminDeleteUserAccount,
  adminDeleteUserAccountAsync,
  normalizeAuthorizedName,
  AuthorizedUserName,
  isEderPerez,
} from '../utils/auth';
import {
  playNotificationSound,
  NotificationSoundType,
  SOUND_OPTIONS,
} from '../utils/soundAlerts';
import {
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  UserNotificationPreferences,
  NotificationCategoryType,
  DEFAULT_SOUNDS_PER_TYPE,
} from '../utils/userNotificationPreferences';
import {
  getOrcamentoMessageTemplate,
  saveOrcamentoMessageTemplate,
  formatOrcamentoMessage,
  DEFAULT_ORCAMENTO_MESSAGE,
  getWhatsAppMessageTemplate,
  saveWhatsAppMessageTemplate,
  WhatsAppCategory,
  WHATSAPP_CATEGORIES,
  DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY,
  getDynamicGreeting,
  getMetasParametersConfig,
  saveMetasParametersConfig,
  calculateCurrentMetasDates,
  DEFAULT_METAS_CONFIG,
  MetasParametersConfig,
} from '../utils/configOrcamentoEMetas';

interface ConfiguracoesScreenProps {
  currentUserName?: string;
  onUpdateUserName?: (name: string) => void;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type TabType =
  | 'Gestão de Usuários'
  | 'Custos'
  | 'Custos Variáveis'
  | 'Notificações & Alertas'
  | 'Segurança & Acesso'
  | 'Mensagem WhatsApp'
  | 'Mensagem de Orçamento'
  | 'Configurações de Metas';

export interface FenixUser {
  id: string;
  nome: string;
  email: string;
  cargo: 'Consultor Comercial' | 'Consultora Comercial' | 'Marketplace' | 'Marketing' | 'Representante' | 'Diretor' | 'Gerente de Vendas' | 'Financeiro';
  acesso: string;
  status: 'Ativo' | 'Inativo';
  modulos: string[];
  loginSugerido: string;
  avatarIniciais: string;
  avatarBg: string;
}

const ALL_MODULES = [
  'Clientes',
  'Calculadora',
  'Orçamentos',
  'Follow-up',
  'Metas',
  'Vendas',
  'Estoque',
  'Controle de Estoque',
  'Produtos',
  'Tarefas',
  'Pós-Vendas',
  'Boletos',
  'Pendências',
  'Notas',
  'Configurações',
];

const STORAGE_USERS_KEY = 'fenix_usuarios_v2';
const STORAGE_NOTIF_KEY = 'fenix_notificacoes_config_v2';

const INITIAL_USERS: FenixUser[] = [
  {
    id: 'usr-1',
    nome: 'Vanessa Gomes',
    email: 'vanessa@fenixworld.com.br',
    cargo: 'Consultora Comercial',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Controle de Estoque', 'Produtos', 'Tarefas', 'Pós-Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'vanessa.gomes',
    avatarIniciais: 'VG',
    avatarBg: 'bg-[#1D4ED8]',
  },
  {
    id: 'usr-2',
    nome: 'Jhessica Camargo',
    email: 'jhessica@fenixworld.com.br',
    cargo: 'Consultora Comercial',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Controle de Estoque', 'Produtos', 'Tarefas', 'Pós-Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'jhessica.camargo',
    avatarIniciais: 'JC',
    avatarBg: 'bg-[#0B2046]',
  },
  {
    id: 'usr-3',
    nome: 'Eder Perez',
    email: 'eder@fenixworld.com.br',
    cargo: 'Diretor',
    acesso: 'Administrador Geral',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Vendas', 'Controle de Estoque', 'Produtos', 'Tarefas', 'Pós-Vendas', 'Boletos', 'Pendências', 'Notas', 'Configurações'],
    loginSugerido: 'eder.perez',
    avatarIniciais: 'EP',
    avatarBg: 'bg-emerald-700',
  },
  {
    id: 'usr-4',
    nome: 'Jeferson Trolesi',
    email: 'jeferson@fenixworld.com.br',
    cargo: 'Marketplace',
    acesso: 'CRM Completo',
    status: 'Ativo',
    modulos: ['Clientes', 'Calculadora', 'Orçamentos', 'Follow-up', 'Metas', 'Controle de Estoque', 'Produtos', 'Tarefas', 'Pós-Vendas', 'Boletos', 'Pendências', 'Notas'],
    loginSugerido: 'jeferson.trolesi',
    avatarIniciais: 'JT',
    avatarBg: 'bg-amber-600',
  },
];

export const ConfiguracoesScreen: React.FC<ConfiguracoesScreenProps> = ({
  currentUserName = 'Vanessa Gomes',
}) => {
  // Verificação estrita de privilégios: Somente Éder Perez pode criar, editar ou gerenciar outros usuários
  const isDirector = isEderPerez(currentUserName);
  const canManageUsers = isDirector;

  // Aba ativa: padrão "Gestão de Usuários"
  const [activeTab, setActiveTab] = useState<TabType>('Gestão de Usuários');

  // Feedback Toast flutuante
  const [toastMessage, setToastMessage] = useState<string>('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // ==========================================
  // ESTADO: MENSAGEM WHATSAPP POR CATEGORIA
  // ==========================================
  const [selectedWhatsAppCategory, setSelectedWhatsAppCategory] =
    useState<WhatsAppCategory>('Envio de Orçamento');
  const [orcamentoMsgTemplate, setOrcamentoMsgTemplate] = useState<string>(() =>
    getWhatsAppMessageTemplate('Envio de Orçamento')
  );
  const textareaOrcamentoRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSelectWhatsAppCategory = (cat: WhatsAppCategory) => {
    setSelectedWhatsAppCategory(cat);
    setOrcamentoMsgTemplate(getWhatsAppMessageTemplate(cat));
  };

  const handleInsertTagOrcamento = (tag: string) => {
    const el = textareaOrcamentoRef.current;
    if (!el) {
      setOrcamentoMsgTemplate((prev) => prev + ` ${tag}`);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const text = orcamentoMsgTemplate;
    const next = text.substring(0, start) + tag + text.substring(end);
    setOrcamentoMsgTemplate(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSaveOrcamentoMsg = () => {
    saveWhatsAppMessageTemplate(selectedWhatsAppCategory, orcamentoMsgTemplate);
    showToast(`✓ Mensagem WhatsApp para "${selectedWhatsAppCategory}" salva com sucesso!`);
  };

  const handleResetOrcamentoMsg = () => {
    const def =
      DEFAULT_WHATSAPP_TEMPLATES_BY_CATEGORY[selectedWhatsAppCategory] ||
      DEFAULT_ORCAMENTO_MESSAGE;
    setOrcamentoMsgTemplate(def);
    saveWhatsAppMessageTemplate(selectedWhatsAppCategory, def);
    showToast(`✓ Mensagem para "${selectedWhatsAppCategory}" restaurada para o modelo original!`);
  };

  // Preview dinâmico da mensagem de orçamento no WhatsApp
  const previewOrcamentoMessage = useMemo(() => {
    return formatOrcamentoMessage(orcamentoMsgTemplate, {
      clientName: 'Carlos Andrade',
      totalFinal: 38500,
      consultoraName: currentUserName || 'Vanessa Gomes',
      items: [
        { qtd: '25', unidade: 'm²', descricao: 'Mármore Travertino Romano Resinador', total: 25000 },
        { qtd: '15', unidade: 'm²', descricao: 'Granito Preto São Gabriel Polido', total: 13500 },
      ],
      freteAtivo: false,
      freteValor: 0,
      freteEndereco: 'São Paulo - SP',
      numeroOrcamento: 'ORC-2026-084',
      categoria: selectedWhatsAppCategory,
    });
  }, [orcamentoMsgTemplate, currentUserName, selectedWhatsAppCategory]);

  // ==========================================
  // ESTADO: CONFIGURAÇÕES DE METAS
  // ==========================================
  const [metasConfig, setMetasConfig] = useState<MetasParametersConfig>(() =>
    getMetasParametersConfig()
  );

  // Cálculos reativos considerando sempre a data atual
  const metasCalculated = useMemo(() => {
    return calculateCurrentMetasDates(metasConfig);
  }, [metasConfig]);

  const handleSaveMetasConfig = () => {
    saveMetasParametersConfig(metasConfig);
    showToast('✓ Parâmetros e dias úteis da meta salvos com sucesso!');
  };

  const handleResetMetasConfig = () => {
    setMetasConfig(DEFAULT_METAS_CONFIG);
    saveMetasParametersConfig(DEFAULT_METAS_CONFIG);
    showToast('✓ Configurações de metas restauradas para o cálculo automático oficial!');
  };

  // ==========================================
  // ESTADO: GESTÃO DE USUÁRIOS
  // ==========================================
  const [users, setUsers] = useState<FenixUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed: FenixUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let merged = [...parsed];

          // Garantir que Éder Perez esteja presente
          const hasEder = merged.some(
            (u) => u.nome === 'Eder Perez' || u.cargo === 'Diretor' || u.loginSugerido === 'eder.perez'
          );
          if (!hasEder) {
            const eder = INITIAL_USERS.find((u) => u.nome === 'Eder Perez');
            if (eder) merged.push(eder);
          }

          // Garantir que Jeferson Trolesi esteja presente
          const hasJeferson = merged.some(
            (u) => u.nome === 'Jeferson Trolesi' || u.loginSugerido === 'jeferson.trolesi'
          );
          if (!hasJeferson) {
            const jeferson = INITIAL_USERS.find((u) => u.nome === 'Jeferson Trolesi');
            if (jeferson) merged.push(jeferson);
          }

          // Garantir que Vanessa e Jéssica possuam a permissão de 'Configurações' por padrão
          merged = merged.map((u) => {
            const isVanessaOrJessica =
              u.nome === 'Vanessa Gomes' ||
              u.nome === 'Jhessica Camargo' ||
              u.nome.toLowerCase().includes('vanessa') ||
              u.nome.toLowerCase().includes('jhessica') ||
              u.nome.toLowerCase().includes('jessica');
            if (isVanessaOrJessica && Array.isArray(u.modulos) && !u.modulos.includes('Configurações')) {
              return { ...u, modulos: [...u.modulos, 'Configurações'] };
            }
            return u;
          });

          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Campos do formulário do Drawer
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: 'Consultora Comercial' as FenixUser['cargo'],
    status: 'Ativo' as 'Ativo' | 'Inativo',
    modulos: [...ALL_MODULES],
    loginSugerido: '',
    senhaInicial: '',
  });

  // Modal para Redefinir / Gerar Senha (com poderes administrativos da Diretoria)
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    user: FenixUser | null;
    customPass: string;
    requireChangeOnNextLogin: boolean;
  }>({
    isOpen: false,
    user: null,
    customPass: '',
    requireChangeOnNextLogin: true,
  });

  // Modal para confirmação de exclusão
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    user: FenixUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Salvar lista de usuários no localStorage
  const saveUsersList = (updatedUsers: FenixUser[]) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
      window.dispatchEvent(new Event('fenix_users_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  // Gerar senha aleatória forte
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pass = 'Fnx#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Abrir Drawer para cadastrar novo usuário
  const handleOpenNewUser = () => {
    setEditingUserId(null);
    const initialPass = generateRandomPassword();
    setFormData({
      nome: '',
      email: '',
      cargo: 'Consultora Comercial',
      status: 'Ativo',
      modulos: [...ALL_MODULES],
      loginSugerido: '',
      senhaInicial: initialPass,
    });
    setIsDrawerOpen(true);
  };

  // Abrir Drawer para editar usuário existente
  const handleOpenEditUser = (user: FenixUser) => {
    setEditingUserId(user.id);
    setFormData({
      nome: user.nome,
      email: user.email,
      cargo: user.cargo,
      status: user.status,
      modulos: user.modulos.length > 0 ? user.modulos : [...ALL_MODULES],
      loginSugerido: user.loginSugerido || user.email.split('@')[0],
      senhaInicial: '',
    });
    setIsDrawerOpen(true);
  };

  // Sugerir login baseado no nome/email
  const handleNameChange = (nome: string) => {
    const cleaned = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '.');

    setFormData((prev) => ({
      ...prev,
      nome,
      loginSugerido: prev.loginSugerido ? prev.loginSugerido : cleaned,
    }));
  };

  // Salvar dados do Drawer
  const handleSaveUserFromDrawer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para gerenciar usuários.');
      return;
    }

    if (!formData.nome.trim()) {
      showToast('Por favor, informe o Nome Completo.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      showToast('Por favor, informe um E-mail Corporativo válido.');
      return;
    }

    const nameParts = formData.nome.trim().split(' ');
    const initials =
      nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : formData.nome.slice(0, 2).toUpperCase();

    const determineAccess = (cargo: string) => {
      if (cargo === 'Diretor') return 'Administrador Geral';
      if (cargo === 'Gerente de Vendas') return 'Gerência Comercial';
      if (cargo === 'Financeiro') return 'Módulo Financeiro & Boletos';
      return 'CRM Completo';
    };

    if (editingUserId) {
      // Atualizar existente
      const updated = users.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            nome: formData.nome.trim(),
            email: formData.email.trim(),
            cargo: formData.cargo,
            status: formData.status,
            modulos: formData.modulos,
            acesso: determineAccess(formData.cargo),
            loginSugerido: formData.loginSugerido || u.loginSugerido,
            avatarIniciais: initials,
          };
        }
        return u;
      });
      saveUsersList(updated);

      // Sincronizar credenciais no módulo central de autenticação
      adminCreateOrUpdateUserAccount({
        name: formData.nome.trim(),
        id: editingUserId,
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        active: formData.status === 'Ativo',
        modulos: formData.modulos,
        loginSugerido: formData.loginSugerido,
        avatarInitials: initials,
        password: formData.senhaInicial && formData.senhaInicial.trim().length >= 4 ? formData.senhaInicial.trim() : undefined,
      });

      showToast(`✓ Login e dados de "${formData.nome.trim()}" atualizados com sucesso!`);
    } else {
      // Criar novo
      const newUser: FenixUser = {
        id: `usr-${Date.now()}`,
        nome: formData.nome.trim(),
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        modulos: formData.modulos,
        acesso: determineAccess(formData.cargo),
        loginSugerido: formData.loginSugerido || formData.email.split('@')[0],
        avatarIniciais: initials,
        avatarBg: 'bg-[#1D4ED8]',
      };
      saveUsersList([newUser, ...users]);

      // Cadastrar no sistema de autenticação (aparece automaticamente no login)
      adminCreateOrUpdateUserAccount({
        name: formData.nome.trim(),
        id: newUser.id,
        email: formData.email.trim(),
        cargo: formData.cargo,
        status: formData.status,
        active: formData.status === 'Ativo',
        modulos: formData.modulos,
        loginSugerido: newUser.loginSugerido,
        avatarInitials: initials,
        password: formData.senhaInicial && formData.senhaInicial.trim().length >= 4 ? formData.senhaInicial.trim() : '1234',
        mustChangePassword: true,
      });

      showToast(`✓ Usuário "${formData.nome.trim()}" cadastrado com sucesso!`);
    }

    setIsDrawerOpen(false);
  };

  // 7. REMOÇÃO DE USUÁRIO — DIRETOR ÉDER PEREZ:
  // Exclusão definitiva de usuário: remove completamente do sistema, Supabase e autenticação
  const handleExecuteDeleteUser = async () => {
    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para excluir usuários.');
      return;
    }
    if (!deleteConfirmModal.user) return;
    const target = deleteConfirmModal.user;

    // 1. Remove da lista de usuários completamente (não deve permanecer como inativo)
    const filtered = users.filter((u) => u.id !== target.id && u.nome !== target.nome);
    saveUsersList(filtered);
    setUsers(filtered);

    // 2. Exclusão definitiva da conta de autenticação (Supabase e local)
    try {
      await adminDeleteUserAccountAsync(target.nome);
    } catch {
      // fallback
    }
    adminDeleteUserAccount(target.nome);

    showToast(`✓ Usuário "${target.nome}" foi excluído permanentemente do sistema.`);
    setDeleteConfirmModal({ isOpen: false, user: null });
  };

  // Abrir modal de redefinição de senha
  const handleOpenResetPassword = (user: FenixUser) => {
    const newPass = generateRandomPassword();
    setResetPasswordModal({
      isOpen: true,
      user,
      customPass: newPass,
      requireChangeOnNextLogin: true,
    });
  };

  // Confirmar e aplicar a redefinição de senha do funcionário
  const handleConfirmResetPassword = () => {
    if (!isDirector) {
      showToast('Apenas o Diretor Éder Perez possui permissão para redefinir senhas de usuários.');
      return;
    }
    if (!resetPasswordModal.user) return;
    const targetUser = resetPasswordModal.user;
    const pass = resetPasswordModal.customPass.trim();

    if (!pass || pass.length < 4) {
      showToast('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    const canonicalName = normalizeAuthorizedName(targetUser.nome);
    if (canonicalName) {
      adminResetUserPassword(
        canonicalName,
        pass,
        resetPasswordModal.requireChangeOnNextLogin
      );
    }

    try {
      navigator.clipboard.writeText(pass);
    } catch {
      // ignore
    }

    showToast(`✓ Senha do login de "${targetUser.nome}" atualizada com sucesso!`);
    setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true });
  };

  // Filtragem da tabela de usuários
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cargo.toLowerCase().includes(q) ||
      u.acesso.toLowerCase().includes(q)
    );
  });

  // ==========================================
  // ESTADO: NOTIFICAÇÕES & ALERTAS (POR USUÁRIO)
  // ==========================================
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>(() =>
    getUserNotificationPreferences(currentUserName)
  );

  useEffect(() => {
    setNotifPrefs(getUserNotificationPreferences(currentUserName));
  }, [currentUserName]);

  // Salvar configurações de notificação
  const handleSaveNotifConfig = () => {
    try {
      saveUserNotificationPreferences(currentUserName, notifPrefs);
      showToast('✓ Preferências de Notificação salvas com sucesso!');
      if (notifPrefs.volumePercent > 0) {
        playNotificationSound(notifPrefs.soundType, notifPrefs.volumePercent);
      }
    } catch {
      showToast('✓ Preferências salvas!');
    }
  };

  // Demonstração sonora
  const handlePlaySoundDemo = () => {
    playNotificationSound(notifPrefs.soundType, notifPrefs.volumePercent);
    showToast(`Tocando: ${notifPrefs.soundType}`);
  };

  // Demonstração sonora por categoria específica
  const handlePlayCategorySoundDemo = (sound: NotificationSoundType) => {
    playNotificationSound(sound, notifPrefs.volumePercent);
    showToast(`Tocando: ${sound}`);
  };

  const notifSoundCategories: {
    id: NotificationCategoryType;
    label: string;
    description: string;
    icon: any;
  }[] = [
    {
      id: 'followup',
      label: 'Follow-up de Orçamentos',
      description: 'Lembrete de orçamentos pendentes de retorno há 2 dias',
      icon: PhoneCall,
    },
    {
      id: 'estoque',
      label: 'Movimentações de Estoque',
      description: 'Toque para entradas e saídas de mercadorias no estoque',
      icon: Package,
    },
    {
      id: 'pendencias',
      label: 'Pendências Comerciais',
      description: 'Avisos de cadastros ou documentos pendentes de clientes',
      icon: AlertCircle,
    },
    {
      id: 'metas',
      label: 'Metas Comerciais',
      description: 'Alerta celebrativo de marcos atingidos (50%, 75%, 100%)',
      icon: Target,
    },
    {
      id: 'boletos',
      label: 'Boletos & Financeiro',
      description: 'Avisos de boletos aguardando envio ou em vencimento',
      icon: DollarSign,
    },
    {
      id: 'tarefas',
      label: 'Tarefas e Prazos',
      description: 'Avisos de tarefas do dia e prazos expirados',
      icon: CheckSquare,
    },
    {
      id: 'chat',
      label: 'Notificação de Chat',
      description: 'Toque ao receber mensagens no chat interno',
      icon: MessageSquare,
    },
    {
      id: 'notas',
      label: 'Notas e Lembretes',
      description: 'Avisos para notas e anotações rápidas agendadas',
      icon: FileText,
    },
  ];

  // ==========================================
  // ESTADO: SEGURANÇA & ACESSO
  // ==========================================
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: '',
  });
  const [showPassword, setShowPassword] = useState({
    atual: false,
    nova: false,
    confirmar: false,
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!passwordData.senhaAtual.trim()) {
      setPasswordMessage({ type: 'error', text: 'Informe sua senha atual.' });
      return;
    }
    if (!passwordData.novaSenha.trim()) {
      setPasswordMessage({ type: 'error', text: 'Informe a nova senha.' });
      return;
    }
    if (passwordData.novaSenha.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'A nova senha deve ter no mínimo 6 caracteres.',
      });
      return;
    }
    if (passwordData.novaSenha !== passwordData.confirmarNovaSenha) {
      setPasswordMessage({
        type: 'error',
        text: 'A confirmação de senha não confere com a nova senha.',
      });
      return;
    }

    const canonical = normalizeAuthorizedName(currentUserName);
    if (canonical) {
      const res = updateUserPasswordDirectly(canonical, passwordData.novaSenha);
      if (!res.success) {
        setPasswordMessage({
          type: 'error',
          text: res.error || 'Erro ao atualizar senha no banco de dados.',
        });
        return;
      }
    }

    setPasswordMessage({
      type: 'success',
      text: '✓ Senha corporativa atualizada com sucesso!',
    });
    setPasswordData({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    showToast('✓ Senha atualizada com sucesso!');
  };

  // Efeito para fechar o Drawer com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) setIsDrawerOpen(false);
        if (resetPasswordModal.isOpen) setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true });
        if (deleteConfirmModal.isOpen) setDeleteConfirmModal({ isOpen: false, user: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, resetPasswordModal.isOpen, deleteConfirmModal.isOpen]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 text-slate-800 font-sans">
      {/* Toast flutuante de feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B2046] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Card quadrado com borda azul e ícone de engrenagem */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/90 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Gerencie usuários, notificações, alertas sonoros e segurança do sistema.
            </p>
          </div>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO ENTRE ABAS INTERNAS (PÍLULAS) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-2.5 shadow-xs flex items-center gap-1.5 overflow-x-auto select-none custom-scrollbar">
        {(
          [
            { id: 'Gestão de Usuários', label: 'Gestão de Usuários', icon: Users },
            ...(isDirector
              ? [
                  {
                    id: 'Custos' as TabType,
                    label: 'Custos',
                    icon: DollarSign,
                    isExclusiveDirector: true,
                  },
                ]
              : []),
            { id: 'Notificações & Alertas', label: 'Notificações & Alertas', icon: Bell },
            { id: 'Segurança & Acesso', label: 'Segurança & Acesso', icon: Shield },
            { id: 'Mensagem WhatsApp', label: 'Mensagem WhatsApp', icon: MessageSquare },
            { id: 'Configurações de Metas', label: 'Configurações de Metas', icon: Target },
          ] as { id: TabType; label: string; icon: React.FC<{ className?: string }>; isExclusiveDirector?: boolean }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-[#1D4ED8] text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.isExclusiveDirector && (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Diretor
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. CONTEÚDO DA ABA 1: GESTÃO DE USUÁRIOS */}
      {activeTab === 'Gestão de Usuários' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* BANNER EXCLUSIVO DA DIRETORIA (EDER PEREZ) */}
          {isDirector ? (
            <div className="bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Painel de Gestão da Diretoria — Eder Perez</p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                      Gestão Central de Logins
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Como Diretor Geral, você pode <strong>mexer no login, redefinir senhas, ativar/inativar e configurar permissões</strong> de cada funcionário da equipe.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-amber-900 bg-amber-100/90 border border-amber-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>🔒</span>
                  <span>Modo Administrador Ativo</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                Visualização do quadro de colaboradores. A alteração de acessos, senhas e logins de outros colaboradores é restrita ao <strong>Diretor Eder Perez</strong>.
              </span>
            </div>
          )}

          {/* Barra superior com campo de busca e botão "+ Novo Usuário" */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, e-mail ou cargo..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-slate-50/70 focus:bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Limpar
                </button>
              )}
            </div>

            {canManageUsers && (
              <button
                type="button"
                onClick={handleOpenNewUser}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all cursor-pointer flex-shrink-0"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Novo Usuário</span>
              </button>
            )}
          </div>

          {/* Tabela em Card Branco */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                    <th className="py-3.5 px-4">Cargo / Função</th>
                    <th className="py-3.5 px-4">Acesso ao Sistema</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        Nenhum usuário encontrado para a busca realizada.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isTargetDirector = user.cargo === 'Diretor' || user.nome.toLowerCase().includes('eder');
                      const canManageThisUser = isDirector;

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/60 transition-colors group"
                        >
                          {/* Usuário (Avatar Oficial + Nome e E-mail) */}
                          <td className="py-3.5 px-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                userName={user.nome}
                                avatarColor={(user as any).avatarColor}
                                size="sm"
                                className="shadow-xs"
                              />
                              <div>
                                <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                                  <span>{user.nome}</span>
                                  {isTargetDirector && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                      👑 Diretor
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-normal">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cargo / Função */}
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {user.cargo}
                          </td>

                          {/* Acesso ao Sistema */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#1D4ED8] border border-blue-200/80">
                              {user.acesso}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                user.status === 'Ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {user.status}
                            </span>
                          </td>

                          {/* Ações na linha */}
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManageThisUser ? (
                                <>
                                  {/* Gerar/Redefinir Senha do Funcionário */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenResetPassword(user)}
                                    title={`Gerar/Alterar Senha de ${user.nome}`}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-[#1D4ED8] transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-xs"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    {isDirector && <span className="hidden xl:inline text-[11px] font-semibold">Senha</span>}
                                  </button>

                                  {/* Editar Login e Permissões */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditUser(user)}
                                    title={`Editar Login e Acessos de ${user.nome}`}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-700 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-xs"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {isDirector && <span className="hidden xl:inline text-[11px] font-semibold">Editar</span>}
                                  </button>

                                  {/* Excluir / Desativar (Apenas Diretor Eder Perez e não para si mesmo) */}
                                  {isDirector && !isTargetDirector && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmModal({ isOpen: true, user })
                                      }
                                      title={`Desativar/Excluir ${user.nome}`}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              ) : (
                                <span
                                  title="Apenas o Diretor Eder Perez pode alterar este login"
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center gap-1 text-[11px]"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span className="hidden sm:inline">Bloqueado</span>
                                </span>
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

            {/* Rodapé da tabela com contagem */}
            <div className="bg-slate-50/50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-700">{filteredUsers.length}</strong> de{' '}
                <strong className="text-slate-700">{users.length}</strong> usuários cadastrados
              </span>
              <span className="text-[11px] text-slate-400">
                Acessos e senhas controlados pela administração Fênix World
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DA ABA 2: NOTIFICAÇÕES & ALERTAS (COM ALERTA SONORO POR USUÁRIO) */}
      {activeTab === 'Notificações & Alertas' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-8 animate-in fade-in duration-200 max-w-4xl">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Notificações e Avisos do Sistema
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0057ff]">
                {currentUserName}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Personalize seus alertas sonoros e gatilhos no sininho para eventos comerciais, prazos e metas.
            </p>
          </div>

          {/* Bloco de Efeitos Sonoros */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {notifPrefs.volumePercent > 0 ? (
                    <Volume2 className="w-5 h-5 stroke-[2.2]" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Sons de Alerta e Notificação
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reproduzir toque sonoro característico quando um novo alerta entrar no seu sininho.
                  </p>
                </div>
              </div>

              {/* Botão de teste rápido */}
              <button
                type="button"
                onClick={handlePlaySoundDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-[#1D4ED8] text-xs font-bold transition-colors cursor-pointer shadow-2xs flex-shrink-0"
                title="Ouvir demonstração com Web Audio API nativa"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ouvir demonstração</span>
              </button>
            </div>

            {/* Controles de Toque e Volume */}
            <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Seletor de Toque Sonoro */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Seletor de Toque Sonoro
                </label>
                <select
                  value={notifPrefs.soundType}
                  onChange={(e) =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      soundType: e.target.value as NotificationSoundType,
                    }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white font-semibold focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 cursor-pointer shadow-2xs"
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} ({opt.durationLabel})
                    </option>
                  ))}
                </select>
                {/* Descrição do toque selecionado */}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {SOUND_OPTIONS.find((s) => s.id === notifPrefs.soundType)?.description}
                </p>
              </div>

              {/* Slider de Volume */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Volume da Notificação
                  </label>
                  <span className="text-xs font-bold text-[#1D4ED8]">
                    {notifPrefs.volumePercent}%
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={notifPrefs.volumePercent}
                    onChange={(e) =>
                      setNotifPrefs((prev) => ({
                        ...prev,
                        volumePercent: Number(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1D4ED8]"
                  />
                  <Volume2 className="w-4 h-4 text-[#1D4ED8] flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Defina 0% para silenciar os alertas sonoros sem desativar os avisos visuais.
                </p>
              </div>
            </div>

            {/* Sons Individuais por Tipo de Notificação */}
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Sons Individuais por Tipo de Notificação
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Personalize o toque de cada tipo de evento do sistema para identificar a origem pelo som.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {notifSoundCategories.map((cat) => {
                  const currentCategorySound: NotificationSoundType =
                    notifPrefs.soundsPerType?.[cat.id] ||
                    DEFAULT_SOUNDS_PER_TYPE[cat.id] ||
                    notifPrefs.soundType;
                  const IconComp = cat.icon;

                  return (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0 border border-blue-100">
                            <IconComp className="w-3.5 h-3.5 stroke-[2.2]" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{cat.label}</h5>
                            <p className="text-[10px] text-slate-500 leading-tight">{cat.description}</p>
                          </div>
                        </div>

                        {/* Botão para ouvir prévia do som desta categoria */}
                        <button
                          type="button"
                          onClick={() => handlePlayCategorySoundDemo(currentCategorySound)}
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-[#1D4ED8] text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title={`Ouvir ${currentCategorySound}`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Ouvir</span>
                        </button>
                      </div>

                      {/* Seletor de som para este tipo */}
                      <select
                        value={currentCategorySound}
                        onChange={(e) => {
                          const newSound = e.target.value as NotificationSoundType;
                          setNotifPrefs((prev) => ({
                            ...prev,
                            soundsPerType: {
                              ...(prev.soundsPerType || DEFAULT_SOUNDS_PER_TYPE),
                              [cat.id]: newSound,
                            },
                          }));
                          if (notifPrefs.volumePercent > 0) {
                            playNotificationSound(newSound, notifPrefs.volumePercent);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/70 font-semibold focus:outline-none focus:border-[#1D4ED8] focus:bg-white cursor-pointer shadow-2xs"
                      >
                        {SOUND_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label} ({opt.durationLabel})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gatilhos de Notificação no Sininho (Switches liga/desliga) */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Gatilhos de Notificação no Sininho
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione quais eventos comerciais devem acionar avisos visuais e sonoros no sininho.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl p-2 bg-white">
              {/* Gatilho 0: Notificação de Chat */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      Notificação de Chat
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Disparar alerta sonoro e visual ao receber novas mensagens privadas ou em grupo no chat corporativo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, chat: !prev.alerts?.chat },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts?.chat ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts?.chat}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts?.chat ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {/* Gatilho 1: Alertas de Boletos Pendentes */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alertas de Boletos Pendentes
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Notificar no sininho (com som) quando um boleto estiver aguardando envio ou em atraso.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, boletos: !prev.alerts.boletos },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.boletos ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.boletos}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.boletos ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 2: Alerta de Follow-up */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alerta de Follow-up
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Disparar aviso no sininho (com som) quando um orçamento enviado estiver sem retorno há 2 dias.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, followup: !prev.alerts.followup },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.followup ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.followup}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.followup ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 2.5: Alerta de Movimentações de Estoque */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alertas de Movimentação de Estoque
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Disparar aviso no sininho (com som) a cada nova Entrada ou Saída registrada no estoque.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, estoque: !prev.alerts?.estoque },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts?.estoque !== false ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts?.estoque !== false}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts?.estoque !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 3: Alerta de Tarefas */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alerta de Tarefas e Prazos
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Avisar no sininho sobre tarefas do dia e pendências com prazo expirado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, tarefas: !prev.alerts.tarefas },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.tarefas ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.tarefas}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.tarefas ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 4: Alerta de Pendências de Documentos */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alertas de Pendências Documentais
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Notificar quando houver comprovantes, cadastros ou documentos pendentes de clientes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, pendencias: !prev.alerts.pendencias },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.pendencias ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.pendencias}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.pendencias ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 5: Alerta de Notas */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Alertas de Notas e Lembretes
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Avisar quando houver lembretes e notas de clientes agendados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, notas: !prev.alerts.notas },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.notas ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.notas}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.notas ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Gatilho 6: Notificar Marcos de Meta */}
              <div className="py-3 px-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    Notificar Marcos de Metas Comerciais
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Exibir aviso celebrativo e toque sonoro ao atingir os percentuais de meta configurados abaixo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({
                      ...prev,
                      alerts: { ...prev.alerts, metas: !prev.alerts.metas },
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    notifPrefs.alerts.metas ? 'bg-[#1D4ED8]' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={notifPrefs.alerts.metas}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      notifPrefs.alerts.metas ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-painel de Marcos de Meta por Periodicidade */}
          {notifPrefs.alerts.metas && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0057ff]" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Marcos de Progresso para Notificação
                </h4>
              </div>
              <p className="text-[11px] text-slate-600">
                Escolha em quais níveis de atingimento o sistema deve disparar alerta no sininho para cada período:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Meta Diária */}
                <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2">
                  <p className="text-xs font-bold text-slate-800">Meta Diária</p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.diaria.pct50}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              diaria: { ...p.metaAlerts.diaria, pct50: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>50% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.diaria.pct75}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              diaria: { ...p.metaAlerts.diaria, pct75: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>75% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.diaria.pct100}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              diaria: { ...p.metaAlerts.diaria, pct100: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>100% Meta Batida 🎉</span>
                    </label>
                  </div>
                </div>

                {/* Meta Semanal */}
                <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2">
                  <p className="text-xs font-bold text-slate-800">Meta Semanal</p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.semanal.pct50}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              semanal: { ...p.metaAlerts.semanal, pct50: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>50% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.semanal.pct75}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              semanal: { ...p.metaAlerts.semanal, pct75: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>75% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.semanal.pct100}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              semanal: { ...p.metaAlerts.semanal, pct100: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>100% Meta Batida 🎉</span>
                    </label>
                  </div>
                </div>

                {/* Meta Mensal */}
                <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2">
                  <p className="text-xs font-bold text-slate-800">Meta Mensal</p>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.mensal.pct50}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              mensal: { ...p.metaAlerts.mensal, pct50: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>50% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.mensal.pct75}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              mensal: { ...p.metaAlerts.mensal, pct75: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>75% Atingido</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs.metaAlerts.mensal.pct100}
                        onChange={(e) =>
                          setNotifPrefs((p) => ({
                            ...p,
                            metaAlerts: {
                              ...p.metaAlerts,
                              mensal: { ...p.metaAlerts.mensal, pct100: e.target.checked },
                            },
                          }))
                        }
                        className="rounded border-slate-300 text-[#0057ff] focus:ring-[#0057ff]"
                      />
                      <span>100% Meta Batida 🎉</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Rodapé: Salvar Preferências de Notificação */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotifConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Salvar Preferências de Notificação</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. CONTEÚDO DA ABA 3: SEGURANÇA & ACESSO */}
      {activeTab === 'Segurança & Acesso' && (
        <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
          {/* Card: Formulário de alteração de senha */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Segurança e Credenciais de Acesso
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Atualize sua senha de acesso corporativa para garantir a proteção dos dados.
              </p>
            </div>

            {passwordMessage && (
              <div
                className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Senha Atual */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Senha Atual *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.atual ? 'text' : 'password'}
                    value={passwordData.senhaAtual}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, senhaAtual: e.target.value })
                    }
                    placeholder="Digite sua senha atual"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({ ...showPassword, atual: !showPassword.atual })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.atual ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nova Senha *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.nova ? 'text' : 'password'}
                    value={passwordData.novaSenha}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, novaSenha: e.target.value })
                    }
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({ ...showPassword, nova: !showPassword.nova })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.nova ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmar Nova Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword.confirmar ? 'text' : 'password'}
                    value={passwordData.confirmarNovaSenha}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmarNovaSenha: e.target.value,
                      })
                    }
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword({
                        ...showPassword,
                        confirmar: !showPassword.confirmar,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.confirmar ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botão: "Atualizar Senha" (azul royal) */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Atualizar Senha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* 6. CONTEÚDO DA ABA 4: MENSAGEM WHATSAPP */}
      {(activeTab === 'Mensagem WhatsApp' || activeTab === 'Mensagem de Orçamento') && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card Principal: Editor do Modelo de Mensagem */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center flex-shrink-0 border border-blue-200">
                  <MessageSquare className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Mensagem WhatsApp
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Saudação Dinâmica: {getDynamicGreeting()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personalize os textos automáticos para envio via WhatsApp por categoria de cliente com saudação automática pelo horário.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetOrcamentoMsg}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Restaurar mensagem padrão desta categoria"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrcamentoMsg}
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Mensagem</span>
                </button>
              </div>
            </div>

            {/* SELETOR DE CATEGORIA */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Escolha a Categoria:</span>
                <span className="text-[11px] font-normal text-slate-500">Cada categoria possui sua mensagem personalizada</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {WHATSAPP_CATEGORIES.map((cat) => {
                  const isSelected = selectedWhatsAppCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleSelectWhatsAppCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1D4ED8] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo de Texto da Mensagem */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Texto da Mensagem para <strong>{selectedWhatsAppCategory}</strong>:</span>
                  <span className="text-[11px] font-normal text-slate-400">(Suporta formatação padrão do WhatsApp: *negrito*, _itálico_)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {orcamentoMsgTemplate.length} caracteres
                </span>
              </div>
              <textarea
                ref={textareaOrcamentoRef}
                rows={10}
                value={orcamentoMsgTemplate || ''}
                onChange={(e) => setOrcamentoMsgTemplate(e.target.value)}
                placeholder="Digite o modelo de mensagem..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-mono leading-relaxed focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Pré-visualização em Tempo Real estilo WhatsApp */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pré-visualização no WhatsApp ({selectedWhatsAppCategory})
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Saudação ativa: "{getDynamicGreeting()}"
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#ECE5DD] border border-slate-300/80 shadow-inner">
                <div className="max-w-xl bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-emerald-100 text-xs text-slate-800 space-y-2 whitespace-pre-wrap leading-relaxed relative">
                  <div className="text-[11px] font-bold text-[#1D4ED8] pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span>Fênix World Distribuidora</span>
                    <span className="text-slate-400 text-[10px]">Hoje</span>
                  </div>
                  <div>{previewOrcamentoMessage}</div>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                    <span>10:30</span>
                    <span className="text-blue-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                * As tags dinâmicas como {'{CLIENTE}'}, {'{VALOR_TOTAL}'} e {'{SAUDACAO}'} são resolvidas automaticamente na hora do envio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7. CONTEÚDO DA ABA 5: CONFIGURAÇÕES DE METAS */}
      {activeTab === 'Configurações de Metas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner: Status Dinâmico da Data Atual */}
          <div className="bg-gradient-to-r from-[#07162e] via-[#0b2146] to-[#07162e] text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    Cálculo Inteligente Baseado na Data Atual
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Período Comercial: {metasCalculated.monthYearLabel}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                  Hoje: {metasCalculated.currentDateFormatted} ({metasCalculated.dayOfWeekName})
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl font-normal">
              A aba <strong>Metas</strong> sincroniza em tempo real com a <strong>data atual</strong>. Os cálculos de <strong>dias decorridos</strong>, <strong>dias restantes</strong>, <strong>dias úteis restantes</strong> e <strong>ritmo diário necessário</strong> são recalculados dinamicamente conforme os dias passam, garantindo que o ritmo comercial nunca fique desatualizado.
            </p>
          </div>

          {/* Cards Resumo dos Cálculos da Data Atual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Dias Decorridos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Decorridos
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {metasCalculated.diasDecorridos} <span className="text-xs font-normal text-slate-400">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Do dia 1 até hoje ({metasCalculated.currentDay} de {metasCalculated.monthName})
              </p>
            </div>

            {/* 2. Dias Restantes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Restantes
                </span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#1D4ED8] mt-2">
                {metasCalculated.diasRestantes} <span className="text-xs font-normal text-slate-400">dias</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Até o fim do mês ({metasCalculated.totalDaysInMonth} dias no total)
              </p>
            </div>

            {/* 3. Dias Úteis no Mês */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dias Úteis no Mês
                </span>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-900 mt-2">
                {metasCalculated.totalWorkingDays} <span className="text-xs font-normal text-slate-400">úteis</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Segunda a Sexta-feira
              </p>
            </div>

            {/* 4. Dias Úteis Restantes */}
            <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Dias Úteis Restantes
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">
                {metasCalculated.remainingWorkingDays} <span className="text-xs font-normal text-emerald-600">úteis</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                Base para o ritmo diário da meta
              </p>
            </div>
          </div>

          {/* Configurações dos Parâmetros da Meta */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Parâmetros de Cálculo da Meta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina como os dias úteis e o valor padrão devem ser calculados pela aba Metas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMetasConfig}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="Restaurar padrão automático"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restaurar Padrão</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveMetasConfig}
                  className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>

            {/* Modo de Cálculo: Automático vs Manual */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Modo de Determinação dos Dias Úteis *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Opção 1: Automático */}
                <div
                  onClick={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: true }))}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    metasConfig.usarCalculoAutomatico
                      ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_dias_uteis"
                    checked={metasConfig.usarCalculoAutomatico}
                    onChange={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: true }))}
                    className="mt-0.5 text-[#1D4ED8] focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Cálculo Automático por Data Atual</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Calcula diariamente com precisão matemática os dias úteis (Segunda a Sexta) a partir da data de hoje ({metasCalculated.currentDateFormatted}) até o final do mês.
                    </p>
                  </div>
                </div>

                {/* Opção 2: Manual */}
                <div
                  onClick={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: false }))}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    !metasConfig.usarCalculoAutomatico
                      ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="modo_dias_uteis"
                    checked={!metasConfig.usarCalculoAutomatico}
                    onChange={() => setMetasConfig((prev) => ({ ...prev, usarCalculoAutomatico: false }))}
                    className="mt-0.5 text-[#1D4ED8] focus:ring-blue-500"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900">
                      Definição Manual dos Dias Úteis
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Permite estipular manualmente os dias úteis do período comercial (ideal para compensar feriados prolongados ou calendários especiais).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campos de ajuste manual quando ativo */}
            {!metasConfig.usarCalculoAutomatico && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Ajuste Manual dos Dias Úteis do Período</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Total de Dias Úteis do Período
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={metasConfig.diasUteisTotaisManual ?? metasCalculated.totalWorkingDays ?? 22}
                      onChange={(e) =>
                        setMetasConfig((prev) => ({
                          ...prev,
                          diasUteisTotaisManual: Math.max(1, parseInt(e.target.value) || 22),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Total de dias úteis comerciais considerados no mês completo.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Dias Úteis Restantes do Período
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={metasConfig.diasUteisRestantesManual ?? metasCalculated.remainingWorkingDays ?? 1}
                      onChange={(e) =>
                        setMetasConfig((prev) => ({
                          ...prev,
                          diasUteisRestantesManual: Math.max(1, parseInt(e.target.value) || 1),
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Dias restantes a partir de hoje para dividir o valor faltante.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Parâmetros Globais: Valor da Meta e Semanas Comerciais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valor Padrão da Meta Mensal (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={metasConfig.metaValor ?? 400000}
                    onChange={(e) =>
                      setMetasConfig((prev) => ({
                        ...prev,
                        metaValor: Math.max(1000, parseFloat(e.target.value) || 400000),
                      }))
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-bold focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Valor utilizado como objetivo da equipe comercial na aba Metas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Semanas Comerciais no Mês *
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={metasConfig.semanasComerciais ?? 4}
                  onChange={(e) =>
                    setMetasConfig((prev) => ({
                      ...prev,
                      semanasComerciais: Math.max(1, parseInt(e.target.value) || 4),
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Divisor utilizado no Card de Ritmo Semanal (padrão: 4 semanas).
                </span>
              </div>
            </div>

            {/* Simulação em Tempo Real do Ritmo com estes parâmetros */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Info className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Simulação do Ritmo Diário com os Parâmetros Atuais:</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Considerando uma meta de <strong>R$ {metasConfig.metaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> com <strong>{metasCalculated.remainingWorkingDays} dias úteis restantes</strong>, o ritmo médio necessário para atingir o objetivo é de aproximadamente:
              </p>
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ritmo Diário / Dia Útil</span>
                  <span className="text-base font-black text-[#1D4ED8]">
                    R$ {(metasConfig.metaValor / metasCalculated.remainingWorkingDays).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Ritmo Semanal / Semana</span>
                  <span className="text-base font-black text-purple-700">
                    R$ {(metasConfig.metaValor / (metasConfig.semanasComerciais || 4)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CONTEÚDO DA ABA 6: CUSTOS & PARÂMETROS GERAIS          */}
      {/* ======================================================== */}
      {isDirector && (activeTab === 'Custos' || activeTab === 'Custos Variáveis') && (
        <CustosConfigView
          currentUserName={currentUserName}
          isDirector={isDirector}
          showToast={showToast}
        />
      )}

      {/* ======================================================== */}
      {/* DRAWER LATERAL: "Cadastrar / Editar Usuário"             */}
      {/* ======================================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop escurecido suave */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer painel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header do Drawer */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure as credenciais e permissões de acesso ao CRM.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário do Drawer */}
            <form
              id="user-drawer-form"
              onSubmit={handleSaveUserFromDrawer}
              className="p-6 space-y-5 flex-1"
            >
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Carlos Albuquerque"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>

              {/* E-mail Corporativo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  E-mail Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="exemplo@fenixworld.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>

              {/* Cargo / Função e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Cargo / Função *
                  </label>
                  <select
                    value={formData.cargo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cargo: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
                  >
                    <option value="Consultor Comercial">Consultor Comercial</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Representante">Representante</option>
                    <option value="Diretor">Diretor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Status da Conta
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white font-medium focus:outline-none focus:border-[#1D4ED8] cursor-pointer"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Módulos com Permissão (Checkboxes) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Módulos com Permissão de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {ALL_MODULES.map((modulo) => {
                    const isEderUser = formData.nome.toLowerCase().includes('eder') || formData.cargo === 'Diretor';
                    // Requisito crítico: a aba Vendas é exclusiva de Éder Perez, não deve sequer ser atribuível a outros usuários
                    if (modulo === 'Vendas' && !isEderUser) {
                      return null;
                    }
                    const isChecked = formData.modulos.includes(modulo);
                    return (
                      <label
                        key={modulo}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none p-1 rounded hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormData((prev) => {
                              const exists = prev.modulos.includes(modulo);
                              const updated = exists
                                ? prev.modulos.filter((m) => m !== modulo)
                                : [...prev.modulos, modulo];
                              return { ...prev, modulos: updated };
                            });
                          }}
                          className="rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8] w-4 h-4"
                        />
                        <span>{modulo}</span>
                        {modulo === 'Vendas' && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold ml-auto">
                            Diretoria
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bloco: Gerador automático de login e senha inicial */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>Acesso & Senha Inicial</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newPass = generateRandomPassword();
                      setFormData((prev) => ({ ...prev, senhaInicial: newPass }));
                      showToast('Nova senha aleatória gerada!');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Gerar senha aleatória</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Login Sugerido
                    </span>
                    <input
                      type="text"
                      value={formData.loginSugerido}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          loginSugerido: e.target.value,
                        }))
                      }
                      placeholder="usuario"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Senha Inicial
                    </span>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.senhaInicial}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            senhaInicial: e.target.value,
                          }))
                        }
                        placeholder={editingUserId ? '(Manter atual)' : 'Senha'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none"
                      />
                      {formData.senhaInicial && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.senhaInicial);
                            showToast('Senha copiada para a área de transferência!');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          title="Copiar senha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  O usuário poderá alterar a senha ao realizar o primeiro login no sistema.
                </p>
              </div>
            </form>

            {/* Botões no rodapé do Drawer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-drawer-form"
                className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>✓ Salvar Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REDEFINIR / GERAR SENHA                           */}
      {/* ======================================================== */}
      {resetPasswordModal.isOpen && resetPasswordModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() =>
              setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true })
            }
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full space-y-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">
                    Definir Senha do Colaborador
                  </h3>
                  {isDirector && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                      👑 Gestão do Diretor
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {resetPasswordModal.user.nome} &bull; <span className="font-mono text-slate-700">{resetPasswordModal.user.email}</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 block">
                  Nova senha para o login:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const pass = generateRandomPassword();
                    setResetPasswordModal((prev) => ({ ...prev, customPass: pass }));
                  }}
                  className="text-[11px] font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Gerar aleatória</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resetPasswordModal.customPass}
                  onChange={(e) =>
                    setResetPasswordModal((prev) => ({
                      ...prev,
                      customPass: e.target.value,
                    }))
                  }
                  placeholder="Digite a nova senha ou use a gerada"
                  className="flex-1 p-2.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8] focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPasswordModal.customPass);
                    showToast('Senha copiada com sucesso!');
                  }}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                  title="Copiar para a área de transferência"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {/* Opção de exigir redefinição no próximo acesso */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={resetPasswordModal.requireChangeOnNextLogin}
                  onChange={(e) =>
                    setResetPasswordModal((prev) => ({
                      ...prev,
                      requireChangeOnNextLogin: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded text-[#1D4ED8] focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 font-normal leading-tight">
                  Exigir que o colaborador crie uma nova senha pessoal no próximo acesso (fluxo de primeiro acesso).
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setResetPasswordModal({ isOpen: false, user: null, customPass: '', requireChangeOnNextLogin: true })
                }
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
              >
                ✓ Aplicar Senha ao Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO                     */}
      {/* ======================================================== */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full space-y-4 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Usuário Permanentemente?
                </h3>
                <p className="text-xs text-slate-500">
                  Remoção definitiva no Supabase e revogação imediata de acesso.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir o usuário{' '}
              <strong className="text-slate-900">{deleteConfirmModal.user.nome}</strong>{' '}
              ({deleteConfirmModal.user.email})? O usuário será removido completamente do sistema e não poderá mais fazer login.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, user: null })}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
