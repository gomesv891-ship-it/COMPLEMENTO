import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Wrench,
  RotateCcw,
  Users,
  Settings,
  Plus,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { saveWholeCollectionToSupabase, getSupabaseClient } from '../utils/supabaseClient';
import { AgendamentoDashboard } from './agendamento/AgendamentoDashboard';
import { AgendamentoAgendaView } from './agendamento/AgendamentoAgendaView';
import { AgendamentoVisitasView } from './agendamento/AgendamentoVisitasView';
import { AgendamentoInstalacoesView } from './agendamento/AgendamentoInstalacoesView';
import { AgendamentoRetornosView } from './agendamento/AgendamentoRetornosView';
import { AgendamentoInstaladoresView } from './agendamento/AgendamentoInstaladoresView';
import { AgendamentoConfigView } from './agendamento/AgendamentoConfigView';
import { NovaVisitaModal } from './agendamento/NovaVisitaModal';
import { NovaInstalacaoModal } from './agendamento/NovaInstalacaoModal';
import {
  INITIAL_VISITAS,
  INITIAL_INSTALACOES,
  INITIAL_RETORNOS,
  INITIAL_INSTALADORES,
} from '../data/agendamentoData';
import {
  VisitaItem,
  InstalacaoItem,
  RetornoItem,
  InstaladorItem,
  VisitaStatus,
  InstalacaoEtapa,
  InstalacaoStatus,
  RetornoStatus,
} from '../types';

export type AgendamentoSubTab =
  | 'dashboard'
  | 'agenda'
  | 'visitas'
  | 'instalacoes'
  | 'retornos'
  | 'instaladores'
  | 'config';

interface AgendamentoScreenProps {
  currentUserName: string;
  onBackToCadastro?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AgendamentoScreen: React.FC<AgendamentoScreenProps> = ({
  currentUserName,
  onBackToCadastro,
  onNavigateTab,
}) => {
  // Active Sub-tab inside Agendamento module
  const [currentSubTab, setCurrentSubTab] = useState<AgendamentoSubTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNovaVisitaOpen, setIsNovaVisitaOpen] = useState(false);
  const [isNovaInstalacaoOpen, setIsNovaInstalacaoOpen] = useState(false);

  // Persistent Visitas State
  const [visitas, setVisitas] = useState<VisitaItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_agendamento_visitas');
      return stored ? JSON.parse(stored) : INITIAL_VISITAS;
    } catch {
      return INITIAL_VISITAS;
    }
  });

  // Persistent Instalações State
  const [instalacoes, setInstalacoes] = useState<InstalacaoItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_agendamento_instalacoes');
      return stored ? JSON.parse(stored) : INITIAL_INSTALACOES;
    } catch {
      return INITIAL_INSTALACOES;
    }
  });

  // Persistent Retornos State
  const [retornos, setRetornos] = useState<RetornoItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_agendamento_retornos');
      return stored ? JSON.parse(stored) : INITIAL_RETORNOS;
    } catch {
      return INITIAL_RETORNOS;
    }
  });

  // Persistent Instaladores State
  const [instaladores, setInstaladores] = useState<InstaladorItem[]>(() => {
    try {
      const stored = localStorage.getItem('fenix_agendamento_instaladores');
      return stored ? JSON.parse(stored) : INITIAL_INSTALADORES;
    } catch {
      return INITIAL_INSTALADORES;
    }
  });

  const isLoadedRef = useRef(false);

  // Load fresh agendamento data from central Supabase on mount
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      Promise.all([
        client.from('fenix_kv_store').select('data').eq('key', 'fenix_agendamento_visitas').maybeSingle(),
        client.from('fenix_kv_store').select('data').eq('key', 'fenix_agendamento_instalacoes').maybeSingle(),
        client.from('fenix_kv_store').select('data').eq('key', 'fenix_agendamento_retornos').maybeSingle(),
        client.from('fenix_kv_store').select('data').eq('key', 'fenix_agendamento_instaladores').maybeSingle(),
      ]).then(([vRes, iRes, rRes, insRes]) => {
        if (vRes.data?.data && Array.isArray(vRes.data.data) && vRes.data.data.length > 0) {
          setVisitas(vRes.data.data);
          try { localStorage.setItem('fenix_agendamento_visitas', JSON.stringify(vRes.data.data)); } catch {}
        }
        if (iRes.data?.data && Array.isArray(iRes.data.data) && iRes.data.data.length > 0) {
          setInstalacoes(iRes.data.data);
          try { localStorage.setItem('fenix_agendamento_instalacoes', JSON.stringify(iRes.data.data)); } catch {}
        }
        if (rRes.data?.data && Array.isArray(rRes.data.data) && rRes.data.data.length > 0) {
          setRetornos(rRes.data.data);
          try { localStorage.setItem('fenix_agendamento_retornos', JSON.stringify(rRes.data.data)); } catch {}
        }
        if (insRes.data?.data && Array.isArray(insRes.data.data) && insRes.data.data.length > 0) {
          setInstaladores(insRes.data.data);
          try { localStorage.setItem('fenix_agendamento_instaladores', JSON.stringify(insRes.data.data)); } catch {}
        }
        isLoadedRef.current = true;
      }).catch(() => {
        isLoadedRef.current = true;
      });
    } else {
      isLoadedRef.current = true;
    }
  }, []);

  // Listen to remote updates
  useEffect(() => {
    const handleAgendamentoUpdate = () => {
      try {
        const storedVis = localStorage.getItem('fenix_agendamento_visitas');
        if (storedVis) {
          const parsed = JSON.parse(storedVis);
          if (Array.isArray(parsed)) setVisitas(parsed);
        }
        const storedInst = localStorage.getItem('fenix_agendamento_instalacoes');
        if (storedInst) {
          const parsed = JSON.parse(storedInst);
          if (Array.isArray(parsed)) setInstalacoes(parsed);
        }
        const storedRet = localStorage.getItem('fenix_agendamento_retornos');
        if (storedRet) {
          const parsed = JSON.parse(storedRet);
          if (Array.isArray(parsed)) setRetornos(parsed);
        }
        const storedInstaladores = localStorage.getItem('fenix_agendamento_instaladores');
        if (storedInstaladores) {
          const parsed = JSON.parse(storedInstaladores);
          if (Array.isArray(parsed)) setInstaladores(parsed);
        }
      } catch (err) {
        console.warn('Erro ao atualizar agendamento remoto:', err);
      }
    };

    window.addEventListener('fenix_agendamento_updated', handleAgendamentoUpdate);
    window.addEventListener('storage', handleAgendamentoUpdate);
    return () => {
      window.removeEventListener('fenix_agendamento_updated', handleAgendamentoUpdate);
      window.removeEventListener('storage', handleAgendamentoUpdate);
    };
  }, []);

  // Sync with localStorage & Supabase
  useEffect(() => {
    try {
      localStorage.setItem('fenix_agendamento_visitas', JSON.stringify(visitas));
    } catch {}
    if (isLoadedRef.current) {
      saveWholeCollectionToSupabase('fenix_agendamento_visitas', visitas).catch(() => {});
    }
  }, [visitas]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_agendamento_instalacoes', JSON.stringify(instalacoes));
    } catch {}
    if (isLoadedRef.current) {
      saveWholeCollectionToSupabase('fenix_agendamento_instalacoes', instalacoes).catch(() => {});
    }
  }, [instalacoes]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_agendamento_retornos', JSON.stringify(retornos));
    } catch {}
    if (isLoadedRef.current) {
      saveWholeCollectionToSupabase('fenix_agendamento_retornos', retornos).catch(() => {});
    }
  }, [retornos]);

  useEffect(() => {
    try {
      localStorage.setItem('fenix_agendamento_instaladores', JSON.stringify(instaladores));
    } catch {}
    if (isLoadedRef.current) {
      saveWholeCollectionToSupabase('fenix_agendamento_instaladores', instaladores).catch(() => {});
    }
  }, [instaladores]);

  // Handlers for adding new items
  const handleAddVisita = (novaVisitaData: Omit<VisitaItem, 'id'>) => {
    const newVisita: VisitaItem = {
      ...novaVisitaData,
      id: `vis-${Date.now()}`,
    };
    setVisitas((prev) => [newVisita, ...prev]);
  };

  const handleAddInstalacao = (novaInstData: Omit<InstalacaoItem, 'id'>) => {
    const newInstalacao: InstalacaoItem = {
      ...novaInstData,
      id: `inst-${Date.now()}`,
    };
    setInstalacoes((prev) => [newInstalacao, ...prev]);
  };

  // Status and Stage updaters
  const handleUpdateVisitaStatus = (id: string, newStatus: VisitaStatus) => {
    setVisitas((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
    );
  };

  const handleUpdateInstalacaoEtapa = (id: string, newEtapa: InstalacaoEtapa) => {
    setInstalacoes((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, etapaAtual: newEtapa } : inst))
    );
  };

  const handleUpdateInstalacaoStatus = (id: string, newStatus: InstalacaoStatus) => {
    setInstalacoes((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );
  };

  const handleUpdateRetornoStatus = (id: string, newStatus: RetornoStatus) => {
    setRetornos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleAddRetorno = (retornoData: Omit<RetornoItem, 'id'>) => {
    const newRetorno: RetornoItem = {
      ...retornoData,
      id: `ret-${Date.now()}`,
    };
    setRetornos((prev) => [newRetorno, ...prev]);
  };

  const handleUpdateInstaladorStatus = (
    id: string,
    newStatus: 'Disponível' | 'Em Obra' | 'Folga'
  ) => {
    setInstaladores((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, status: newStatus } : inst))
    );
  };

  const handleAddInstalador = (instData: Omit<InstaladorItem, 'id'>) => {
    const newInst: InstaladorItem = {
      ...instData,
      id: `inst-${Date.now()}`,
    };
    setInstaladores((prev) => [...prev, newInst]);
  };

  const subTabsList = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'visitas', label: 'Visitas', icon: CalendarClock, count: visitas.length },
    { id: 'instalacoes', label: 'Instalações', icon: Wrench, count: instalacoes.length },
    { id: 'retornos', label: 'Retornos', icon: RotateCcw, count: retornos.length },
    { id: 'instaladores', label: 'Instaladores', icon: Users, count: instaladores.length },
    { id: 'config', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      {/* Top Banner & Module Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0052CC] border border-blue-200/60">
                <Sparkles className="w-3 h-3 text-[#0052CC]" />
                Gestão Operacional
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-medium text-slate-500">
                Fênix World Distribuidora
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Agendamento & Operações
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Controle de visitas técnicas, instalações de pisos, retornos e instaladores em tempo real.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsNovaVisitaOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052CC] font-semibold text-xs sm:text-sm border border-blue-200/70 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Visita</span>
            </button>
            <button
              onClick={() => setIsNovaInstalacaoOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova Instalação</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs and Search Bar */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Horizontal scrollable tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {subTabsList.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentSubTab(tab.id as AgendamentoSubTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0052CC] text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {'count' in tab && tab.count !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no agendamento..."
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0052CC]/20 focus:border-[#0052CC] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Dynamic View */}
      <div>
        {currentSubTab === 'dashboard' ? (
          <AgendamentoDashboard
            visitas={visitas}
            instalacoes={instalacoes}
            onOpenNovaVisita={() => setIsNovaVisitaOpen(true)}
            onOpenNovaInstalacao={() => setIsNovaInstalacaoOpen(true)}
            onNavigateTab={(tab) => setCurrentSubTab(tab as AgendamentoSubTab)}
          />
        ) : currentSubTab === 'agenda' ? (
          <AgendamentoAgendaView
            visitas={visitas}
            instalacoes={instalacoes}
            onOpenNovaVisita={() => setIsNovaVisitaOpen(true)}
            onOpenNovaInstalacao={() => setIsNovaInstalacaoOpen(true)}
          />
        ) : currentSubTab === 'visitas' ? (
          <AgendamentoVisitasView
            visitas={visitas}
            onOpenNovaVisita={() => setIsNovaVisitaOpen(true)}
            onUpdateStatus={handleUpdateVisitaStatus}
            searchQuery={searchQuery}
          />
        ) : currentSubTab === 'instalacoes' ? (
          <AgendamentoInstalacoesView
            instalacoes={instalacoes}
            onOpenNovaInstalacao={() => setIsNovaInstalacaoOpen(true)}
            onUpdateEtapa={handleUpdateInstalacaoEtapa}
            onUpdateStatus={handleUpdateInstalacaoStatus}
            searchQuery={searchQuery}
          />
        ) : currentSubTab === 'retornos' ? (
          <AgendamentoRetornosView
            retornos={retornos}
            onUpdateStatus={handleUpdateRetornoStatus}
            onAddRetorno={handleAddRetorno}
            searchQuery={searchQuery}
          />
        ) : currentSubTab === 'instaladores' ? (
          <AgendamentoInstaladoresView
            instaladores={instaladores}
            onUpdateStatus={handleUpdateInstaladorStatus}
            onAddInstalador={handleAddInstalador}
          />
        ) : (
          <AgendamentoConfigView />
        )}
      </div>

      {/* Modais Globais de Cadastro Rápido do Subsistema */}
      <NovaVisitaModal
        isOpen={isNovaVisitaOpen}
        onClose={() => setIsNovaVisitaOpen(false)}
        onSave={handleAddVisita}
        currentUserName={currentUserName}
      />

      <NovaInstalacaoModal
        isOpen={isNovaInstalacaoOpen}
        onClose={() => setIsNovaInstalacaoOpen(false)}
        onSave={handleAddInstalacao}
      />
    </div>
  );
};
