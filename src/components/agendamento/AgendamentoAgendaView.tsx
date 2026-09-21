import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, User, Wrench, ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react';
import { VisitaItem, InstalacaoItem } from '../../types';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoAgendaViewProps {
  visitas: VisitaItem[];
  instalacoes: InstalacaoItem[];
  onOpenNovaVisita: () => void;
  onOpenNovaInstalacao: () => void;
}

export const AgendamentoAgendaView: React.FC<AgendamentoAgendaViewProps> = ({
  visitas,
  instalacoes,
  onOpenNovaVisita,
  onOpenNovaInstalacao,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('05/09');

  const DAYS = [
    { label: 'Sex, 04/09', value: '04/09' },
    { label: 'Sáb, 05/09 (Hoje)', value: '05/09' },
    { label: 'Seg, 07/09', value: '07/09' },
    { label: 'Ter, 08/09', value: '08/09' },
    { label: 'Qua, 09/09', value: '09/09' },
  ];

  const dayVisitas = visitas.filter((v) => v.data === selectedDay);
  const dayInstalacoes = instalacoes.filter((i) => i.data === selectedDay);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Agenda Integrada
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualização diária consolidada de visitas técnicas e cronograma de obras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenNovaVisita}
            className="px-4 py-2 rounded-xl border border-[#0052CC] text-[#0052CC] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            Nova Visita
          </button>
          <button
            type="button"
            onClick={onOpenNovaInstalacao}
            className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20"
          >
            Nova Instalação
          </button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 overflow-x-auto">
        {DAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDay(d.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedDay === d.value
                ? 'bg-[#0052CC] text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Grid of Visitas & Instalações for the day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitas Column */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0052CC]" />
              Visitas Agendadas ({dayVisitas.length})
            </h3>
            <span className="text-xs text-slate-400">Dia {selectedDay}</span>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {dayVisitas.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Nenhuma visita agendada para esta data.
              </p>
            ) : (
              dayVisitas.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0052CC] font-bold text-xs">
                      {v.horario}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {v.tipoVisita || 'Medição'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{v.cliente}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{v.endereco}</span>
                  </p>
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <UserAvatar userName={v.instalador} size="xs" />
                      <span>Instalador: <strong className="text-slate-800">{v.instalador}</strong></span>
                    </span>
                    <span>Status: <strong className="text-blue-600">{v.status}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instalações Column */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Instalações em Andamento ({dayInstalacoes.length})
            </h3>
            <span className="text-xs text-slate-400">Dia {selectedDay}</span>
          </div>

          <div className="mt-4 space-y-3 flex-1">
            {dayInstalacoes.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Nenhuma instalação iniciada nesta data.
              </p>
            ) : (
              dayInstalacoes.map((inst) => (
                <div
                  key={inst.id}
                  className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0052CC] text-xs">
                      Pedido {inst.pedido.replace('#', '')}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/70 text-[11px] font-medium">
                      {inst.etapaAtual}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{inst.cliente}</h4>
                  {inst.endereco && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{inst.endereco}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <UserAvatar userName={inst.instalador} size="xs" />
                      <span>Instalador: <strong className="text-slate-800">{inst.instalador}</strong></span>
                    </span>
                    <span>Status: <strong className="text-emerald-700 font-semibold">{inst.status}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
