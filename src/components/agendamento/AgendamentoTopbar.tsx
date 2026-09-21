import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, ArrowLeft, ChevronDown, CheckCircle2, User, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoTopbarProps {
  onOpenMobileMenu: () => void;
  onBackToCRM: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  userName?: string;
}

export const AgendamentoTopbar: React.FC<AgendamentoTopbarProps> = ({
  onOpenMobileMenu,
  onBackToCRM,
  searchQuery,
  onSearchChange,
  userName = 'Vanessa Gomes',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between transition-all">
      {/* Left: Mobile Toggle & Subsystem indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xl lg:hidden hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>

        <button
          onClick={onBackToCRM}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#0052CC] bg-slate-100/80 hover:bg-blue-50 border border-slate-200/80 transition-all group"
          title="Voltar ao CRM Principal"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar ao CRM</span>
        </button>

        <div className="sm:hidden flex items-center">
          <span className="text-xs font-bold text-slate-800">Agendamento Operacional</span>
        </div>
      </div>

      {/* Center: Centralized Search Bar */}
      <div className="flex-1 max-w-md mx-4 lg:mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar visitas, instalações, retornos..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-transparent focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Notificações operacionais"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                1
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Notificações Operacionais
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    1 nova
                  </span>
                </div>
                {hasUnread && (
                  <button
                    onClick={() => setHasUnread(false)}
                    className="text-[11px] text-[#0052CC] hover:underline font-medium"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0052CC] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-slate-800">Retorno agendado - Pedido 4487</p>
                    <p className="text-slate-500 mt-0.5">
                      Cliente Roberto Lima solicita vistoria de acabamento de rodapé com instalador Marcos Silva.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Há 15 minutos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar with "VG" - Vanessa Gomes (Administradora) */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2 rounded-xl hover:bg-slate-100 transition-colors select-none"
          >
            {/* Avatar Pill */}
            <UserAvatar userName={userName} size="sm" />

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {userName}
              </span>
              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1 leading-tight">
                <ShieldCheck className="w-3 h-3 text-[#0052CC]" />
                Administradora
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50 zoom-in-95 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-bold text-slate-800">Vanessa Gomes</p>
                <p className="text-slate-400 text-[11px]">comercialfenix2620@gmail.com</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0052CC] font-semibold text-[10px]">
                  Administradora Operacional
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={onBackToCRM}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors text-left"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Voltar ao CRM Principal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
