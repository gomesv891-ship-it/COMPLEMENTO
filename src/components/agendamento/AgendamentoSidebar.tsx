import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Wrench,
  RotateCcw,
  Users2,
  Settings,
  ArrowLeft,
  X,
} from 'lucide-react';
import { FenixLogo } from '../FenixLogo';

export type AgendamentoTab =
  | 'dashboard'
  | 'agenda'
  | 'visitas'
  | 'instalacoes'
  | 'retornos'
  | 'instaladores'
  | 'configuracoes';

interface AgendamentoSidebarProps {
  currentTab: AgendamentoTab;
  onSelectTab: (tab: AgendamentoTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onBackToCRM: () => void;
}

const MENU_LINKS: { id: AgendamentoTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'visitas', label: 'Visitas', icon: ClipboardList },
  { id: 'instalacoes', label: 'Instalações', icon: Wrench },
  { id: 'retornos', label: 'Retornos', icon: RotateCcw },
  { id: 'instaladores', label: 'Instaladores', icon: Users2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const AgendamentoSidebar: React.FC<AgendamentoSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onBackToCRM,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Dark Sophisticated Agendamento Operational Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#091122] text-slate-300 flex flex-col justify-between transition-transform duration-250 ease-out border-r border-slate-800/80 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo Fênix World Distribuidora */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-20 px-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
            <div className="flex flex-col">
              <FenixLogo size="sm" showText={true} />
              <span className="text-[10px] tracking-wider text-blue-400 font-semibold uppercase mt-1 pl-10">
                Gestão Operacional
              </span>
            </div>
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-white/10"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action: Back to Main CRM */}
          <div className="px-3.5 pt-3.5 pb-2">
            <button
              onClick={onBackToCRM}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar ao CRM Principal</span>
            </button>
          </div>

          {/* Subsystem Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1 custom-scrollbar">
            {MENU_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-[#0052CC] text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-white stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Tagline & Company Branding */}
        <div className="p-4 border-t border-white/5 bg-[#070e1c]/90 flex-shrink-0">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-300 tracking-tight">
              &ldquo;Pisos que transformam ambientes&rdquo;
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
              FÊNIX WORLD DISTRIBUIDORA
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
