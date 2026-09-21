import React, { useState, useMemo, useEffect } from 'react';
import {
  Store,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Plus,
  CheckCircle2,
  DollarSign,
  Edit2,
  X,
  Trash2,
  Search,
  Filter,
  Package,
  ShoppingBag,
  ExternalLink,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  BarChart3,
  Percent,
  Check,
  Tag,
  Info,
} from 'lucide-react';
import {
  getMetasParametersConfig,
  calculateCurrentMetasDates,
  MetasCalculatedDates,
  getIndividualMetas,
  updateSingleUserMeta,
  normalizeUserMetaKey,
} from '../../utils/configOrcamentoEMetas';
import { saveWholeCollectionToSupabase } from '../../utils/supabaseClient';

export interface MarketplaceSale {
  id: string;
  canal: 'Shopee' | 'Mercado Livre';
  pedido: string;
  data: string; // YYYY-MM-DD
  valor: number;
  quantidadePedidos: number;
  produto?: string;
  observacao?: string;
  status: 'Concluído' | 'Faturado' | 'Em trânsito' | 'Pendente' | 'Cancelado';
  criadoPor: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceChannelMeta {
  shopee: number;
  mercadoLivre: number;
}

const STORAGE_MARKETPLACE_SALES_KEY = 'fenix_marketplace_sales_db';
const STORAGE_MARKETPLACE_METAS_KEY = 'fenix_marketplace_metas_config';

export interface MetasMarketplaceJefersonProps {
  currentUserName?: string;
  isDirector?: boolean;
  onNavigateTab?: (tab: string) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

// Formatação BRL padrão Fênix
export const formatBRL = (val?: number | null): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const parseBRLInput = (raw: string | number | undefined | null): number => {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str) return 0;
  const cleaned = str.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  if (cleaned.includes('.') && cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.')) || 0;
  }
  return parseFloat(cleaned) || 0;
};

export const MetasMarketplaceJeferson: React.FC<MetasMarketplaceJefersonProps> = ({
  currentUserName = 'Jeferson Trolesi',
  isDirector = false,
  selectedDate: externalDate,
  onDateChange,
}) => {
  // Data e Mês selecionado
  const [internalDate, setInternalDate] = useState<Date>(() => new Date());
  const selectedDate = externalDate || internalDate;

  const handlePrevMonth = () => {
    const newD = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
    if (onDateChange) onDateChange(newD);
    else setInternalDate(newD);
  };

  const handleNextMonth = () => {
    const newD = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    if (onDateChange) onDateChange(newD);
    else setInternalDate(newD);
  };

  const monthKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedDate]);

  // Parâmetros de dias úteis e semanas comerciais sincronizados
  const metasDates: MetasCalculatedDates = useMemo(() => {
    const today = new Date();
    const isSameMonthYear =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth();
    const refDate = isSameMonthYear ? today : selectedDate;
    const cfg = getMetasParametersConfig();
    return calculateCurrentMetasDates(cfg, refDate);
  }, [selectedDate]);

  const {
    monthYearLabel,
    monthName,
    currentYear,
    diasDecorridos,
    diasRestantes,
    totalWorkingDays,
    remainingWorkingDays,
    workingDaysElapsed,
    semanasComerciais,
    semanasTotais,
    semanaAtual,
    semanasRestantes,
  } = metasDates;

  // Estado das Metas por Canal (Shopee e Mercado Livre)
  // Padrão inicial: 50k Shopee + 50k Mercado Livre = 100k Meta Marketplace Jeferson
  const [metasByMonth, setMetasByMonth] = useState<Record<string, MarketplaceChannelMeta>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MARKETPLACE_METAS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {}
    return {
      default: { shopee: 50000, mercadoLivre: 50000 },
    };
  });

  // Metas do mês selecionado
  const currentChannelMetas: MarketplaceChannelMeta = useMemo(() => {
    if (metasByMonth[monthKey]) {
      return metasByMonth[monthKey];
    }
    const def = metasByMonth['default'] || { shopee: 50000, mercadoLivre: 50000 };
    return def;
  }, [metasByMonth, monthKey]);

  const metaShopee = currentChannelMetas.shopee ?? 50000;
  const metaMercadoLivre = currentChannelMetas.mercadoLivre ?? 50000;
  // A Meta Marketplace = Meta Shopee + Meta Mercado Livre
  const metaMarketplaceTotal = metaShopee + metaMercadoLivre;

  // Base de vendas de marketplace cadastradas
  const [sales, setSales] = useState<MarketplaceSale[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_MARKETPLACE_SALES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Listener para sincronizar alterações de vendas entre abas ou componentes
  useEffect(() => {
    const handleSalesSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_MARKETPLACE_SALES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setSales(parsed);
        }
      } catch {}
    };
    window.addEventListener('fenix_marketplace_sales_updated', handleSalesSync);
    window.addEventListener('storage', handleSalesSync);
    return () => {
      window.removeEventListener('fenix_marketplace_sales_updated', handleSalesSync);
      window.removeEventListener('storage', handleSalesSync);
    };
  }, []);

  // Vendas do mês selecionado
  const monthSales = useMemo(() => {
    return sales.filter((s) => {
      if (!s.data) return false;
      return s.data.startsWith(monthKey) && s.status !== 'Cancelado';
    });
  }, [sales, monthKey]);

  // Vendas Shopee
  const shopeeSales = useMemo(() => {
    return monthSales.filter((s) => s.canal === 'Shopee');
  }, [monthSales]);

  // Vendas Mercado Livre
  const mlSales = useMemo(() => {
    return monthSales.filter((s) => s.canal === 'Mercado Livre');
  }, [monthSales]);

  // Métricas Shopee
  const realizadoShopee = useMemo(() => {
    return shopeeSales.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  }, [shopeeSales]);

  const pedidosShopee = useMemo(() => {
    return shopeeSales.reduce((acc, s) => acc + (Number(s.quantidadePedidos) || 1), 0);
  }, [shopeeSales]);

  const faltaShopee = Math.max(0, metaShopee - realizadoShopee);
  const percentShopee = metaShopee > 0 ? Number(((realizadoShopee / metaShopee) * 100).toFixed(1)) : 0;
  const ticketMedioShopee = pedidosShopee > 0 ? realizadoShopee / pedidosShopee : 0;

  // Métricas Mercado Livre
  const realizadoML = useMemo(() => {
    return mlSales.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  }, [mlSales]);

  const pedidosML = useMemo(() => {
    return mlSales.reduce((acc, s) => acc + (Number(s.quantidadePedidos) || 1), 0);
  }, [mlSales]);

  const faltaML = Math.max(0, metaMercadoLivre - realizadoML);
  const percentML = metaMercadoLivre > 0 ? Number(((realizadoML / metaMercadoLivre) * 100).toFixed(1)) : 0;
  const ticketMedioML = pedidosML > 0 ? realizadoML / pedidosML : 0;

  // Métricas Consolidadas Marketplace Total
  const realizadoMarketplace = realizadoShopee + realizadoML;
  const pedidosMarketplace = pedidosShopee + pedidosML;
  const faltaMarketplace = Math.max(0, metaMarketplaceTotal - realizadoMarketplace);
  const percentMarketplace =
    metaMarketplaceTotal > 0 ? Number(((realizadoMarketplace / metaMarketplaceTotal) * 100).toFixed(1)) : 0;
  const ticketMedioMarketplace =
    pedidosMarketplace > 0 ? realizadoMarketplace / pedidosMarketplace : 0;

  // Ritmo da Meta Marketplace
  const necessarioPorDia = useMemo(() => {
    if (remainingWorkingDays <= 0) return 0;
    return faltaMarketplace / remainingWorkingDays;
  }, [faltaMarketplace, remainingWorkingDays]);

  const necessarioPorSemana = useMemo(() => {
    const sem = semanasRestantes > 0 ? semanasRestantes : 1;
    return faltaMarketplace / sem;
  }, [faltaMarketplace, semanasRestantes]);

  const mediaDiariaAtual = useMemo(() => {
    const diasComerciaisDecorridos = workingDaysElapsed > 0 ? workingDaysElapsed : (diasDecorridos > 0 ? diasDecorridos : 1);
    return realizadoMarketplace / diasComerciaisDecorridos;
  }, [realizadoMarketplace, workingDaysElapsed, diasDecorridos]);

  // Toast de sucesso
  const [successToast, setSuccessToast] = useState<string>('');
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Estados dos Modais
  // 1. Modal Registrar Venda
  const [isAddSaleOpen, setIsAddSaleOpen] = useState<boolean>(false);
  const [formCanal, setFormCanal] = useState<'Shopee' | 'Mercado Livre'>('Shopee');
  const [formPedido, setFormPedido] = useState<string>('');
  const [formData, setFormData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formValor, setFormValor] = useState<string>('');
  const [formQtd, setFormQtd] = useState<string>('1');
  const [formProduto, setFormProduto] = useState<string>('');
  const [formObservacao, setFormObservacao] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // 2. Modal Editar Meta
  const [isEditMetaOpen, setIsEditMetaOpen] = useState<boolean>(false);
  const [editMetaTargetChannel, setEditMetaTargetChannel] = useState<'Shopee' | 'Mercado Livre' | 'Ambos'>('Shopee');
  const [editMetaValueShopee, setEditMetaValueShopee] = useState<string>('');
  const [editMetaValueML, setEditMetaValueML] = useState<string>('');
  const [editMetaError, setEditMetaError] = useState<string>('');

  // 3. Modal Editar Venda Existente
  const [editingSale, setEditingSale] = useState<MarketplaceSale | null>(null);
  const [editSaleCanal, setEditSaleCanal] = useState<'Shopee' | 'Mercado Livre'>('Shopee');
  const [editSalePedido, setEditSalePedido] = useState<string>('');
  const [editSaleData, setEditSaleData] = useState<string>('');
  const [editSaleValor, setEditSaleValor] = useState<string>('');
  const [editSaleQtd, setEditSaleQtd] = useState<string>('1');
  const [editSaleProduto, setEditSaleProduto] = useState<string>('');
  const [editSaleObservacao, setEditSaleObservacao] = useState<string>('');
  const [editSaleStatus, setEditSaleStatus] = useState<MarketplaceSale['status']>('Concluído');
  const [editSaleError, setEditSaleError] = useState<string>('');

  // 4. Modal Excluir Venda
  const [deletingSale, setDeletingSale] = useState<MarketplaceSale | null>(null);

  // Filtros de Tabela de Pedidos
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableCanalFilter, setTableCanalFilter] = useState<'Todos' | 'Shopee' | 'Mercado Livre'>('Todos');

  // Pedidos Filtrados
  const filteredSales = useMemo(() => {
    return monthSales.filter((s) => {
      if (tableCanalFilter !== 'Todos' && s.canal !== tableCanalFilter) return false;
      if (!tableSearch.trim()) return true;
      const q = tableSearch.toLowerCase().trim();
      const matchPed = (s.pedido || '').toLowerCase().includes(q);
      const matchProd = (s.produto || '').toLowerCase().includes(q);
      const matchObs = (s.observacao || '').toLowerCase().includes(q);
      return matchPed || matchProd || matchObs;
    });
  }, [monthSales, tableCanalFilter, tableSearch]);

  // Formatação de valor R$ no input
  const handleCurrencyInput = (raw: string, setter: (val: string) => void) => {
    const onlyDigits = raw.replace(/\D/g, '');
    if (!onlyDigits) {
      setter('');
      return;
    }
    const num = parseFloat(onlyDigits) / 100;
    setter(
      num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    );
  };

  // Abrir Modal de Edição de Meta
  const handleOpenEditMeta = (target: 'Shopee' | 'Mercado Livre' | 'Ambos') => {
    setEditMetaTargetChannel(target);
    setEditMetaValueShopee(
      metaShopee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );
    setEditMetaValueML(
      metaMercadoLivre.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );
    setEditMetaError('');
    setIsEditMetaOpen(true);
  };

  // Salvar Metas Editadas
  const handleSaveMeta = () => {
    const valShopee = parseBRLInput(editMetaValueShopee);
    const valML = parseBRLInput(editMetaValueML);

    if (valShopee < 0 || valML < 0) {
      setEditMetaError('Os valores das metas devem ser positivos.');
      return;
    }

    const updatedMap = {
      ...metasByMonth,
      [monthKey]: {
        shopee: valShopee,
        mercadoLivre: valML,
      },
      default: {
        shopee: valShopee,
        mercadoLivre: valML,
      },
    };

    setMetasByMonth(updatedMap);
    try {
      localStorage.setItem(STORAGE_MARKETPLACE_METAS_KEY, JSON.stringify(updatedMap));
      // Atualiza também a meta individual de Jeferson no mapa geral do CRM
      const newTotal = valShopee + valML;
      updateSingleUserMeta('Jeferson Trolesi', newTotal);
      window.dispatchEvent(new Event('fenix_metas_config_updated'));
      window.dispatchEvent(new Event('fenix_metas_updated'));
    } catch {}

    setIsEditMetaOpen(false);
    triggerToast(
      `Metas de ${monthName} salvas! Meta Marketplace: ${formatBRL(valShopee + valML)}.`
    );
  };

  // Salvar Nova Venda de Marketplace
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPedido.trim()) {
      setFormError('Informe o número do pedido.');
      return;
    }
    const val = parseBRLInput(formValor);
    if (val <= 0) {
      setFormError('Informe um valor de venda válido maior que zero.');
      return;
    }
    const qtd = parseInt(formQtd, 10) || 1;
    if (qtd <= 0) {
      setFormError('Quantidade de pedidos deve ser no mínimo 1.');
      return;
    }

    const cleanPedido = formPedido.trim().replace(/^#+/, '');
    const newSale: MarketplaceSale = {
      id: `mp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      canal: formCanal,
      pedido: cleanPedido,
      data: formData || new Date().toISOString().split('T')[0],
      valor: val,
      quantidadePedidos: qtd,
      produto: formProduto.trim() || undefined,
      observacao: formObservacao.trim() || undefined,
      status: 'Concluído',
      criadoPor: currentUserName || 'Jeferson Trolesi',
      createdAt: new Date().toISOString(),
    };

    const updated = [newSale, ...sales];
    setSales(updated);

    try {
      localStorage.setItem(STORAGE_MARKETPLACE_SALES_KEY, JSON.stringify(updated));
      saveWholeCollectionToSupabase(STORAGE_MARKETPLACE_SALES_KEY, updated);

      // Sincroniza também no repositório de vendas geral da meta da empresa
      const generalSalesRaw = localStorage.getItem('fenix_metas_sales_db');
      let generalList: any[] = [];
      if (generalSalesRaw) {
        try {
          const parsed = JSON.parse(generalSalesRaw);
          if (Array.isArray(parsed)) generalList = parsed;
        } catch {}
      }
      const syncItem = {
        id: newSale.id,
        pedido: newSale.pedido,
        valor: newSale.valor,
        tipoCliente: 'Cliente Final',
        cliente: `${newSale.canal} - ${newSale.produto || 'Pedido Marketplace'}`,
        data: newSale.data,
        responsavel: 'Jeferson Trolesi',
        vendedor: 'Jeferson Trolesi',
        criadoPor: currentUserName || 'Jeferson Trolesi',
        registeredBy: currentUserName || 'Jeferson Trolesi',
      };
      const updatedGeneral = [syncItem, ...generalList.filter((g: any) => g.id !== newSale.id)];
      localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updatedGeneral));

      window.dispatchEvent(new Event('fenix_marketplace_sales_updated'));
      window.dispatchEvent(new Event('fenix_metas_updated'));
    } catch {}

    // Limpar form
    setFormPedido('');
    setFormValor('');
    setFormQtd('1');
    setFormProduto('');
    setFormObservacao('');
    setFormError('');
    setIsAddSaleOpen(false);

    triggerToast(`Venda #${cleanPedido} registrada com sucesso na ${formCanal}!`);
  };

  // Abrir Modal de Edição de Venda
  const handleOpenEditSale = (item: MarketplaceSale) => {
    setEditingSale(item);
    setEditSaleCanal(item.canal);
    setEditSalePedido(item.pedido);
    setEditSaleData(item.data);
    setEditSaleValor(
      item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    );
    setEditSaleQtd(String(item.quantidadePedidos || 1));
    setEditSaleProduto(item.produto || '');
    setEditSaleObservacao(item.observacao || '');
    setEditSaleStatus(item.status || 'Concluído');
    setEditSaleError('');
  };

  // Salvar Edição de Venda
  const handleSaveEditSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    if (!editSalePedido.trim()) {
      setEditSaleError('Informe o número do pedido.');
      return;
    }
    const val = parseBRLInput(editSaleValor);
    if (val <= 0) {
      setEditSaleError('Informe um valor de venda válido maior que zero.');
      return;
    }
    const qtd = parseInt(editSaleQtd, 10) || 1;
    const cleanPedido = editSalePedido.trim().replace(/^#+/, '');

    const updated = sales.map((s) =>
      s.id === editingSale.id
        ? {
            ...s,
            canal: editSaleCanal,
            pedido: cleanPedido,
            data: editSaleData,
            valor: val,
            quantidadePedidos: qtd,
            produto: editSaleProduto.trim() || undefined,
            observacao: editSaleObservacao.trim() || undefined,
            status: editSaleStatus,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    setSales(updated);
    try {
      localStorage.setItem(STORAGE_MARKETPLACE_SALES_KEY, JSON.stringify(updated));
      saveWholeCollectionToSupabase(STORAGE_MARKETPLACE_SALES_KEY, updated);

      // Sincroniza meta geral
      const generalSalesRaw = localStorage.getItem('fenix_metas_sales_db');
      if (generalSalesRaw) {
        try {
          const parsed = JSON.parse(generalSalesRaw);
          if (Array.isArray(parsed)) {
            const updatedGeneral = parsed.map((g: any) =>
              g.id === editingSale.id
                ? {
                    ...g,
                    pedido: cleanPedido,
                    valor: val,
                    cliente: `${editSaleCanal} - ${editSaleProduto.trim() || 'Pedido Marketplace'}`,
                    data: editSaleData,
                  }
                : g
            );
            localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updatedGeneral));
          }
        } catch {}
      }

      window.dispatchEvent(new Event('fenix_marketplace_sales_updated'));
      window.dispatchEvent(new Event('fenix_metas_updated'));
    } catch {}

    setEditingSale(null);
    triggerToast(`Pedido #${cleanPedido} atualizado com sucesso!`);
  };

  // Excluir Venda
  const handleConfirmDeleteSale = () => {
    if (!deletingSale) return;
    const ped = deletingSale.pedido;
    const updated = sales.filter((s) => s.id !== deletingSale.id);
    setSales(updated);

    try {
      localStorage.setItem(STORAGE_MARKETPLACE_SALES_KEY, JSON.stringify(updated));
      saveWholeCollectionToSupabase(STORAGE_MARKETPLACE_SALES_KEY, updated);

      const generalSalesRaw = localStorage.getItem('fenix_metas_sales_db');
      if (generalSalesRaw) {
        try {
          const parsed = JSON.parse(generalSalesRaw);
          if (Array.isArray(parsed)) {
            const updatedGeneral = parsed.filter((g: any) => g.id !== deletingSale.id);
            localStorage.setItem('fenix_metas_sales_db', JSON.stringify(updatedGeneral));
          }
        } catch {}
      }

      window.dispatchEvent(new Event('fenix_marketplace_sales_updated'));
      window.dispatchEvent(new Event('fenix_metas_updated'));
    } catch {}

    setDeletingSale(null);
    triggerToast(`Pedido #${ped} removido.`);
  };

  // Percentuais de participação por canal
  const shareShopee =
    realizadoMarketplace > 0
      ? Number(((realizadoShopee / realizadoMarketplace) * 100).toFixed(1))
      : 0;
  const shareML =
    realizadoMarketplace > 0
      ? Number(((realizadoML / realizadoMarketplace) * 100).toFixed(1))
      : 0;

  // Evolução diária/semanal para o gráfico
  const dailyChartData = useMemo(() => {
    const totalDaysInMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      0
    ).getDate();

    const daysMap: Record<number, { day: number; shopee: number; ml: number; total: number }> = {};
    for (let d = 1; d <= totalDaysInMonth; d++) {
      daysMap[d] = { day: d, shopee: 0, ml: 0, total: 0 };
    }

    monthSales.forEach((s) => {
      if (!s.data) return;
      const parts = s.data.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (daysMap[dayNum]) {
          const val = Number(s.valor) || 0;
          if (s.canal === 'Shopee') {
            daysMap[dayNum].shopee += val;
          } else {
            daysMap[dayNum].ml += val;
          }
          daysMap[dayNum].total += val;
        }
      }
    });

    return Object.values(daysMap);
  }, [monthSales, selectedDate]);

  const maxDailyValue = useMemo(() => {
    const m = Math.max(...dailyChartData.map((d) => Math.max(d.shopee, d.ml)), 500);
    return m;
  }, [dailyChartData]);

  // Círculo de porcentagem para o card principal
  const circleRadius = 52;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleStrokeOffset =
    circleCircumference - (Math.min(100, percentMarketplace) / 100) * circleCircumference;

  return (
    <div className="w-full space-y-6 text-slate-800 font-sans">
      {/* TOAST DE SUCESSO */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B2046] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm border border-slate-700 animate-in fade-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* 1. TÍTULO, CABEÇALHO, SELETOR DE MÊS & BOTÃO "+ REGISTRAR VENDA" */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Esquerda: Título exatamente como solicitado */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/20">
            <Store className="w-6 h-6 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B2046] tracking-tight">
                Metas - Marketplace
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200">
                {currentUserName || 'Jeferson Trolesi'}
              </span>
              {isDirector && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#0052cc] border border-blue-200">
                  Visão Diretoria
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Acompanhamento das metas e resultados da Shopee e Mercado Livre.
            </p>
          </div>
        </div>

        {/* Direita: Seletor de mês & Botão "+ Registrar Venda" */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          {/* Seletor de mês dinâmico */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/90 rounded-2xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 min-w-[150px] sm:min-w-[170px] justify-center text-xs sm:text-sm font-bold text-[#0B2046]">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>{monthYearLabel}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão + REGISTRAR VENDA */}
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setIsAddSaleOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Registrar Venda</span>
          </button>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL: META MARKETPLACE (Meta Marketplace = Meta Shopee + Meta Mercado Livre) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B2046] via-[#132d5c] to-[#08152e] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-950/20 border border-blue-400/20">
        {/* Efeito luminoso e decorativo de fundo */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Coluna Esquerda: Meta Marketplace */}
          <div className="md:col-span-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-200/90 block">
                Meta Marketplace • {monthName}
              </span>
              <button
                type="button"
                onClick={() => handleOpenEditMeta('Ambos')}
                className="text-blue-200/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Editar metas de Marketplace"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-none">
              {formatBRL(metaMarketplaceTotal)}
            </div>
            <p className="text-[11px] text-blue-200/80 font-medium">
              Meta Shopee ({formatBRL(metaShopee)}) + Meta Mercado Livre ({formatBRL(metaMercadoLivre)})
            </p>
          </div>

          {/* Coluna Central: Indicador circular % da Meta Atingida */}
          <div className="md:col-span-4 flex flex-col items-center justify-center py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="mpProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <circle
                  cx="65"
                  cy="65"
                  r={circleRadius}
                  className="stroke-white/10"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="65"
                  cy="65"
                  r={circleRadius}
                  stroke="url(#mpProgressGrad)"
                  strokeWidth="10"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={circleStrokeOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {percentMarketplace.toString().replace('.', ',')}%
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200/90 mt-0.5">
                  Atingido
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Realizado e Falta para a Meta */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4">
            <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl p-4 border border-blue-300/20 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                Realizado
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block mt-1">
                {formatBRL(realizadoMarketplace)}
              </span>
              <span className="text-[10px] text-blue-200/80 font-medium block mt-0.5">
                {pedidosMarketplace} {pedidosMarketplace === 1 ? 'pedido faturado' : 'pedidos faturados'}
              </span>
            </div>

            <div className="bg-white/[0.08] backdrop-blur-md rounded-2xl p-4 border border-blue-300/20 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200 block">
                Falta para a Meta
              </span>
              <span className="text-xl sm:text-2xl font-black text-white block mt-1">
                {formatBRL(faltaMarketplace)}
              </span>
              <span className="text-[10px] text-blue-200/80 font-medium block mt-0.5">
                {faltaMarketplace === 0 ? '🎉 Meta atingida!' : 'Saldo restante do mês'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DOIS CARDS: SHOPEE & MERCADO LIVRE (com botão "Editar meta" em cada um) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* CARD 1: SHOPEE */}
        <div className="bg-white rounded-3xl border border-orange-200 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            {/* Cabeçalho do Card Shopee */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#EE4D2D] to-[#F05D40] text-white flex items-center justify-center shadow-md shadow-orange-500/20 flex-shrink-0">
                  <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#0B2046] tracking-tight">
                      Shopee
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-[#EE4D2D] border border-orange-200 uppercase">
                      Marketplace
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Canal oficial de vendas Shopee</p>
                </div>
              </div>

              {/* Botão Editar Meta Shopee */}
              <button
                type="button"
                onClick={() => handleOpenEditMeta('Shopee')}
                className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#EE4D2D] border border-orange-200/80 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar meta</span>
              </button>
            </div>

            {/* Grid de Indicadores Shopee */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">
                  Meta
                </span>
                <span className="text-base sm:text-lg font-black text-[#0B2046] block mt-0.5">
                  {formatBRL(metaShopee)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Realizado
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-800 block mt-0.5">
                  {formatBRL(realizadoShopee)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Falta
                </span>
                <span className="text-base sm:text-lg font-black text-slate-800 block mt-0.5">
                  {formatBRL(faltaShopee)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  % da meta
                </span>
                <span className="text-base sm:text-lg font-black text-blue-900 block mt-0.5">
                  {percentShopee}%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pedidos
                </span>
                <span className="text-base sm:text-lg font-black text-[#0B2046] block mt-0.5">
                  {pedidosShopee}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Ticket Médio
                </span>
                <span className="text-base sm:text-lg font-black text-purple-900 block mt-0.5">
                  {formatBRL(ticketMedioShopee)}
                </span>
              </div>
            </div>

            {/* Barra de Progresso Shopee */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Progresso da meta Shopee</span>
                <span className="text-[#EE4D2D] font-bold">{percentShopee}% atingido</span>
              </div>
              <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-[#EE4D2D] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, percentShopee)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{shopeeSales.length} lançamentos registrados</span>
            <span className="font-bold text-orange-700">{formatBRL(realizadoShopee)}</span>
          </div>
        </div>

        {/* CARD 2: MERCADO LIVRE */}
        <div className="bg-white rounded-3xl border border-yellow-300 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            {/* Cabeçalho do Card Mercado Livre */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-yellow-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FFE600] text-[#2D3277] flex items-center justify-center shadow-md shadow-yellow-500/20 flex-shrink-0 border border-yellow-400">
                  <Package className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#0B2046] tracking-tight">
                      Mercado Livre
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-100 text-[#2D3277] border border-yellow-300 uppercase">
                      Marketplace
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Canal oficial de vendas Mercado Livre</p>
                </div>
              </div>

              {/* Botão Editar Meta Mercado Livre */}
              <button
                type="button"
                onClick={() => handleOpenEditMeta('Mercado Livre')}
                className="px-3 py-1.5 rounded-xl bg-yellow-50 hover:bg-yellow-100 text-[#2D3277] border border-yellow-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar meta</span>
              </button>
            </div>

            {/* Grid de Indicadores Mercado Livre */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-yellow-50/70 border border-yellow-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Meta
                </span>
                <span className="text-base sm:text-lg font-black text-[#0B2046] block mt-0.5">
                  {formatBRL(metaMercadoLivre)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Realizado
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-800 block mt-0.5">
                  {formatBRL(realizadoML)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Falta
                </span>
                <span className="text-base sm:text-lg font-black text-slate-800 block mt-0.5">
                  {formatBRL(faltaML)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  % da meta
                </span>
                <span className="text-base sm:text-lg font-black text-blue-900 block mt-0.5">
                  {percentML}%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pedidos
                </span>
                <span className="text-base sm:text-lg font-black text-[#0B2046] block mt-0.5">
                  {pedidosML}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                  Ticket Médio
                </span>
                <span className="text-base sm:text-lg font-black text-purple-900 block mt-0.5">
                  {formatBRL(ticketMedioML)}
                </span>
              </div>
            </div>

            {/* Barra de Progresso Mercado Livre */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Progresso da meta Mercado Livre</span>
                <span className="text-[#2D3277] font-bold">{percentML}% atingido</span>
              </div>
              <div className="w-full h-2.5 bg-yellow-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, percentML)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{mlSales.length} lançamentos registrados</span>
            <span className="font-bold text-[#2D3277]">{formatBRL(realizadoML)}</span>
          </div>
        </div>
      </div>

      {/* 4. RITMO DA META */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center border border-blue-100 shadow-2xs">
            <Clock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0B2046] tracking-tight">
              Ritmo da Meta
            </h3>
            <p className="text-xs text-slate-500">
              Projeção de ritmo diário e semanal baseada no calendário comercial e dias úteis restantes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Dias úteis restantes */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Dias Úteis Restantes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#0B2046] block mt-1">
              {remainingWorkingDays}{' '}
              <span className="text-xs font-semibold text-slate-500">
                / {totalWorkingDays} úteis
              </span>
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {diasDecorridos} dias decorridos ({diasRestantes} restantes no mês)
            </span>
          </div>

          {/* 2. Necessário por dia */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
              Necessário por Dia
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#0052cc] block mt-1">
              {formatBRL(necessarioPorDia)}
            </span>
            <span className="text-[11px] text-blue-600 mt-1 block">
              Saldo restante ÷ {remainingWorkingDays} dias úteis
            </span>
          </div>

          {/* 3. Necessário por semana */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
              Necessário por Semana
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-900 block mt-1">
              {formatBRL(necessarioPorSemana)}
            </span>
            <span className="text-[11px] text-purple-600 mt-1 block">
              Saldo restante ÷ {semanasRestantes} semanas restantes
            </span>
          </div>

          {/* 4. Média diária atual */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Média Diária Atual
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 block mt-1">
              {formatBRL(mediaDiariaAtual)}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">
              Total realizado ÷ dias decorridos
            </span>
          </div>
        </div>
      </div>

      {/* 5. EVOLUÇÃO DO FATURAMENTO & VENDAS POR CANAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* EVOLUÇÃO DO FATURAMENTO (Gráfico comparando Shopee x Mercado Livre) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-2xs">
                  <BarChart3 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#0B2046] tracking-tight">
                    Evolução do Faturamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comparativo de vendas diárias: Shopee x Mercado Livre em {monthName}.
                  </p>
                </div>
              </div>

              {/* Legenda do Gráfico */}
              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#EE4D2D]" />
                  <span className="text-slate-700">Shopee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#FFE600] border border-yellow-400" />
                  <span className="text-slate-700">Mercado Livre</span>
                </div>
              </div>
            </div>

            {/* Visual do Gráfico Comparativo em Barras Diárias */}
            <div className="mt-4 pt-2">
              <div className="h-48 w-full flex items-end gap-1 sm:gap-1.5 px-1 pb-4 border-b border-slate-200">
                {dailyChartData.map((d) => {
                  const heightShopee =
                    maxDailyValue > 0 ? (d.shopee / maxDailyValue) * 100 : 0;
                  const heightML = maxDailyValue > 0 ? (d.ml / maxDailyValue) * 100 : 0;
                  const hasSales = d.total > 0;

                  return (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip no hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none min-w-[130px]">
                        <div className="bg-[#0B2046] text-white text-[11px] rounded-xl px-2.5 py-1.5 shadow-xl border border-slate-700 text-center">
                          <span className="font-bold block border-b border-slate-700 pb-1 mb-1">
                            Dia {d.day} de {monthName}
                          </span>
                          <span className="text-orange-400 font-semibold block">
                            Shopee: {formatBRL(d.shopee)}
                          </span>
                          <span className="text-yellow-300 font-semibold block">
                            ML: {formatBRL(d.ml)}
                          </span>
                          <span className="text-white font-bold block pt-1 border-t border-slate-700 mt-1">
                            Total: {formatBRL(d.total)}
                          </span>
                        </div>
                      </div>

                      {/* Par de Barras: Shopee e Mercado Livre lado a lado */}
                      <div className="w-full flex items-end justify-center gap-0.5 h-full">
                        {/* Barra Shopee */}
                        <div
                          className="w-1/2 rounded-t-sm transition-all duration-500 group-hover:brightness-110"
                          style={{
                            height: `${Math.max(hasSales && d.shopee > 0 ? 6 : 2, heightShopee)}%`,
                            backgroundColor: d.shopee > 0 ? '#EE4D2D' : '#f1f5f9',
                          }}
                        />
                        {/* Barra Mercado Livre */}
                        <div
                          className="w-1/2 rounded-t-sm transition-all duration-500 group-hover:brightness-110"
                          style={{
                            height: `${Math.max(hasSales && d.ml > 0 ? 6 : 2, heightML)}%`,
                            backgroundColor: d.ml > 0 ? '#FFE600' : '#f1f5f9',
                            borderTop: d.ml > 0 ? '1px solid #eab308' : 'none',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Eixo X com marcações de dias (1, 5, 10, 15, 20, 25, fim) */}
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1 pt-1.5">
                <span>Dia 1</span>
                <span>Dia 5</span>
                <span>Dia 10</span>
                <span>Dia 15</span>
                <span>Dia 20</span>
                <span>Dia 25</span>
                <span>Dia {dailyChartData.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Total faturado no mês: <strong className="text-[#0B2046]">{formatBRL(realizadoMarketplace)}</strong>
            </span>
            <span className="font-semibold text-slate-600">
              Shopee ({formatBRL(realizadoShopee)}) • ML ({formatBRL(realizadoML)})
            </span>
          </div>
        </div>

        {/* VENDAS POR CANAL */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-2xs">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#0B2046] tracking-tight">
                  Vendas por Canal
                </h3>
                <p className="text-xs text-slate-500">
                  Participação e faturamento por canal de vendas.
                </p>
              </div>
            </div>

            {/* Canal 1: Shopee */}
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#EE4D2D]" />
                  <span className="text-xs font-black text-[#0B2046]">Shopee</span>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#EE4D2D] border border-orange-200">
                  {shareShopee}% do Total
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#0B2046]">
                  {formatBRL(realizadoShopee)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {pedidosShopee} {pedidosShopee === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              <div className="w-full h-2 bg-orange-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EE4D2D] rounded-full"
                  style={{ width: `${shareShopee}%` }}
                />
              </div>
            </div>

            {/* Canal 2: Mercado Livre */}
            <div className="p-4 rounded-2xl bg-yellow-50/70 border border-yellow-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#FFE600] border border-yellow-500" />
                  <span className="text-xs font-black text-[#0B2046]">Mercado Livre</span>
                </div>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-yellow-100 text-[#2D3277] border border-yellow-300">
                  {shareML}% do Total
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#0B2046]">
                  {formatBRL(realizadoML)}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {pedidosML} {pedidosML === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              <div className="w-full h-2 bg-yellow-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${shareML}%` }}
                />
              </div>
            </div>

            {/* Total Marketplace */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0B2046]">
                  Total Marketplace
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-[#0052cc]">
                  100%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-[#0052cc]">
                  {formatBRL(realizadoMarketplace)}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {pedidosMarketplace} pedidos no total
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {shareShopee > shareML
              ? `🔥 Shopee lidera com ${shareShopee}% do volume de faturamento.`
              : shareML > shareShopee
              ? `📦 Mercado Livre lidera com ${shareML}% do volume de faturamento.`
              : '⚖️ Participação equilibrada entre Shopee e Mercado Livre.'}
          </div>
        </div>
      </div>

      {/* 6. ÚLTIMOS PEDIDOS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
        {/* Cabeçalho da Tabela, Busca e Filtro por Canal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-[#0B2046] tracking-tight">
              Últimos Pedidos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedidos de marketplace registrados no mês de {monthName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campo de Busca */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Buscar pedido, produto..."
                className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052cc] focus:bg-white transition-all"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Canal */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setTableCanalFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tableCanalFilter === 'Todos'
                    ? 'bg-white text-[#0B2046] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos ({monthSales.length})
              </button>
              <button
                type="button"
                onClick={() => setTableCanalFilter('Shopee')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tableCanalFilter === 'Shopee'
                    ? 'bg-[#EE4D2D] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Shopee ({shopeeSales.length})
              </button>
              <button
                type="button"
                onClick={() => setTableCanalFilter('Mercado Livre')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tableCanalFilter === 'Mercado Livre'
                    ? 'bg-[#FFE600] text-[#2D3277] shadow-2xs border border-yellow-300'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Mercado Livre ({mlSales.length})
              </button>
            </div>

            {/* Botão Registrar Venda */}
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setIsAddSaleOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Registrar Venda</span>
            </button>
          </div>
        </div>

        {/* Tabela de Pedidos */}
        {filteredSales.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhum pedido encontrado</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {tableSearch || tableCanalFilter !== 'Todos'
                ? 'Ajuste os filtros de canal ou busca.'
                : 'Clique no botão "+ Registrar Venda" para cadastrar o primeiro pedido deste mês.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/60">
                  <th className="py-3 px-3.5 rounded-l-xl">Data</th>
                  <th className="py-3 px-3.5">Canal</th>
                  <th className="py-3 px-3.5">Nº do Pedido</th>
                  <th className="py-3 px-3.5">Produto</th>
                  <th className="py-3 px-3.5">Valor</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right rounded-r-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSales.map((item) => {
                  const isShopee = item.canal === 'Shopee';
                  const dateFormatted = item.data
                    ? item.data.split('-').reverse().join('/')
                    : '-';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Data */}
                      <td className="py-3.5 px-3.5 font-semibold text-slate-700 whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      {/* Canal */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {isShopee ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-100 text-[#EE4D2D] border border-orange-200">
                            <ShoppingBag className="w-3 h-3" />
                            Shopee
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-yellow-100 text-[#2D3277] border border-yellow-300">
                            <Package className="w-3 h-3" />
                            Mercado Livre
                          </span>
                        )}
                      </td>

                      {/* Nº do Pedido */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-[#0B2046] whitespace-nowrap">
                        #{item.pedido}
                        {item.quantidadePedidos > 1 && (
                          <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-sans font-semibold">
                            {item.quantidadePedidos} un
                          </span>
                        )}
                      </td>

                      {/* Produto */}
                      <td className="py-3.5 px-3.5 text-slate-700 max-w-xs truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {item.produto || 'Diversos'}
                        </span>
                        {item.observacao && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {item.observacao}
                          </span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-3.5 font-black text-slate-900 whitespace-nowrap">
                        {formatBRL(item.valor)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.status === 'Concluído' || item.status === 'Faturado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Em trânsito'
                              ? 'bg-blue-50 text-[#0052cc] border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.status || 'Concluído'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSale(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0052cc] hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar pedido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingSale(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR VENDA DE MARKETPLACE                                   */}
      {/* ========================================================================= */}
      {isAddSaleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-2xs">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0B2046]">
                    Registrar venda de Marketplace
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lançamento manual de venda da Shopee ou Mercado Livre
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSaleOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} className="space-y-4">
              {/* Canal: Shopee ou Mercado Livre */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1.5 uppercase tracking-wider">
                  Canal de Venda <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormCanal('Shopee')}
                    className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formCanal === 'Shopee'
                        ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-md shadow-orange-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-orange-50/50'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Shopee</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCanal('Mercado Livre')}
                    className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formCanal === 'Mercado Livre'
                        ? 'bg-[#FFE600] text-[#2D3277] border-yellow-400 shadow-md shadow-yellow-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-yellow-50/50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Mercado Livre</span>
                  </button>
                </div>
              </div>

              {/* Nº do Pedido e Data da Venda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Nº do Pedido <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPedido}
                    onChange={(e) => {
                      setFormPedido(e.target.value.replace(/^#+/, ''));
                      if (formError) setFormError('');
                    }}
                    placeholder="Ex: 240920X9J2K1 ou 1055"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Data da Venda <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                  />
                </div>
              </div>

              {/* Valor da Venda e Quantidade de Pedidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Valor da Venda <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formValor}
                    onChange={(e) => {
                      handleCurrencyInput(e.target.value, setFormValor);
                      if (formError) setFormError('');
                    }}
                    placeholder="R$ 0,00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-black text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Quantidade de Pedidos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQtd}
                    onChange={(e) => setFormQtd(e.target.value)}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                  />
                </div>
              </div>

              {/* Produto (opcional) */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Produto <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formProduto}
                  onChange={(e) => setFormProduto(e.target.value)}
                  placeholder="Ex: Piso Vinílico SPC Carvalho Real, Cola Vinílica 4kg..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                />
              </div>

              {/* Observação (opcional) */}
              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Observação <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={formObservacao}
                  onChange={(e) => setFormObservacao(e.target.value)}
                  rows={2}
                  placeholder="Anotações internas sobre frete, anúncio, rastreio..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white resize-none"
                />
              </div>

              {formError && (
                <div className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSaleOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/25"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Registrar venda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR META (Mês, Valor da meta, Cancelar, Salvar meta)           */}
      {/* ========================================================================= */}
      {isEditMetaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-[#0B2046]">
                  {editMetaTargetChannel === 'Shopee'
                    ? 'Editar Meta - Shopee'
                    : editMetaTargetChannel === 'Mercado Livre'
                    ? 'Editar Meta - Mercado Livre'
                    : 'Editar Metas de Marketplace'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mês selecionado: <strong>{monthYearLabel}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditMetaOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Campo Shopee (se for Shopee ou Ambos) */}
              {(editMetaTargetChannel === 'Shopee' || editMetaTargetChannel === 'Ambos') && (
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EE4D2D]" />
                    <span>Valor da Meta Shopee (R$)</span>
                  </label>
                  <input
                    type="text"
                    value={editMetaValueShopee}
                    onChange={(e) => handleCurrencyInput(e.target.value, setEditMetaValueShopee)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-black text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                    placeholder="R$ 50.000,00"
                  />
                </div>
              )}

              {/* Campo Mercado Livre (se for ML ou Ambos) */}
              {(editMetaTargetChannel === 'Mercado Livre' || editMetaTargetChannel === 'Ambos') && (
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FFE600] border border-yellow-500" />
                    <span>Valor da Meta Mercado Livre (R$)</span>
                  </label>
                  <input
                    type="text"
                    value={editMetaValueML}
                    onChange={(e) => handleCurrencyInput(e.target.value, setEditMetaValueML)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-black text-slate-900 focus:outline-none focus:border-[#0052cc] focus:bg-white"
                    placeholder="R$ 50.000,00"
                  />
                </div>
              )}

              {/* Meta Marketplace Calculada */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Meta Marketplace Resultante:</span>
                  <span className="font-black text-[#0B2046] text-sm">
                    {formatBRL(parseBRLInput(editMetaValueShopee) + parseBRLInput(editMetaValueML))}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Meta Marketplace = Meta Shopee + Meta Mercado Livre
                </span>
              </div>

              {editMetaError && (
                <div className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {editMetaError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditMetaOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMeta}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0052cc] hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                Salvar meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDITAR PEDIDO EXISTENTE                                          */}
      {/* ========================================================================= */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0052cc] flex items-center justify-center border border-blue-100 shadow-2xs">
                  <Edit2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0B2046]">
                    Editar Pedido #{editingSale.pedido}
                  </h3>
                  <p className="text-xs text-slate-400">Alterar dados da venda de marketplace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSale} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditSaleCanal('Shopee')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    editSaleCanal === 'Shopee'
                      ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shopee</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditSaleCanal('Mercado Livre')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    editSaleCanal === 'Mercado Livre'
                      ? 'bg-[#FFE600] text-[#2D3277] border-yellow-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Mercado Livre</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Nº do Pedido
                  </label>
                  <input
                    type="text"
                    value={editSalePedido}
                    onChange={(e) => setEditSalePedido(e.target.value.replace(/^#+/, ''))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Data da Venda
                  </label>
                  <input
                    type="date"
                    value={editSaleData}
                    onChange={(e) => setEditSaleData(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Valor da Venda
                  </label>
                  <input
                    type="text"
                    value={editSaleValor}
                    onChange={(e) => handleCurrencyInput(e.target.value, setEditSaleValor)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Qtd Pedidos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editSaleQtd}
                    onChange={(e) => setEditSaleQtd(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                  Produto
                </label>
                <input
                  type="text"
                  value={editSaleProduto}
                  onChange={(e) => setEditSaleProduto(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                  placeholder="Nome do produto"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={editSaleStatus}
                    onChange={(e) => setEditSaleStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                  >
                    <option value="Concluído">Concluído</option>
                    <option value="Faturado">Faturado</option>
                    <option value="Em trânsito">Em trânsito</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B2046] mb-1 uppercase tracking-wider">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={editSaleObservacao}
                    onChange={(e) => setEditSaleObservacao(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {editSaleError && (
                <div className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                  {editSaleError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0052cc] hover:bg-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE PEDIDO                                */}
      {/* ========================================================================= */}
      {deletingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-[#0B2046]">Remover Pedido?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tem certeza que deseja remover o pedido <strong>#{deletingSale.pedido}</strong> da{' '}
                <strong>{deletingSale.canal}</strong> no valor de{' '}
                <strong className="text-rose-600">{formatBRL(deletingSale.valor)}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                O valor será subtraído do faturamento e da meta imediatamente.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSale}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, remover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
