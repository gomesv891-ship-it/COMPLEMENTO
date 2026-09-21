import React from 'react';
import {
  Calendar,
  ClipboardList,
  Wrench,
  RotateCcw,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { VisitaItem, InstalacaoItem, InstalacaoEtapa, VisitaStatus } from '../../types';

interface AgendamentoDashboardProps {
  visitas: VisitaItem[];
  instalacoes: InstalacaoItem[];
  onOpenNovaVisita: () => void;
  onOpenNovaInstalacao: () => void;
  onNavigateTab: (tab: 'agenda' | 'visitas' | 'instalacoes' | 'retornos' | 'instaladores') => void;
}

export const AgendamentoDashboard: React.FC<AgendamentoDashboardProps> = ({
  visitas,
  instalacoes,
  onOpenNovaVisita,
  onOpenNovaInstalacao,
  onNavigateTab,
}) => {
  // Helper for Visita Status badge
  const renderVisitaStatusBadge = (status: VisitaStatus) => {
    switch (status) {
      case 'Agendada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#2563EB]">
            Agendada
          </span>
        );
      case 'Em atendimento':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706]">
            Em atendimento
          </span>
        );
      case 'Realizada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A]">
            Realizada
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Helper for Instalacao Etapa badge
  const renderEtapaBadge = (etapa: InstalacaoEtapa) => {
    switch (etapa) {
      case 'Preparação do contrapiso':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50/90 text-amber-800 border border-amber-200/70">
            Preparação do contrapiso
          </span>
        );
      case 'Aplicação da cola':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-200/70">
            Aplicação da cola
          </span>
        );
      case 'Instalação do piso':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70">
            Instalação do piso
          </span>
        );
      case 'Finalização':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200/70">
            Finalização
          </span>
        );
      case 'Concluída':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100/80 text-emerald-800 border border-emerald-300/70 font-semibold">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {etapa}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. BOAS-VINDAS E CARD DE DATA */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Bloco Esquerdo */}
        <div>
          <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block">
            BEM-VINDA, VANESSA
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Aqui tudo se encaixa
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-normal">
            Acompanhe suas visitas, instalações e retornos em tempo real.
          </p>
        </div>

        {/* Card Direito */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center flex-shrink-0 shadow-xs">
            <Calendar className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm sm:text-base">
              Sábado, 5 de setembro de 2026
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Bom trabalho hoje!
            </p>
          </div>
        </div>
      </section>

      {/* 2. CARDS DE KPI DE OPERAÇÃO (4 CARDS COM SETA DE ACESSO RÁPIDO) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Visitas de hoje */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
              <ClipboardList className="w-5 h-5 stroke-[2.2]" />
            </div>
            <button
              onClick={() => onNavigateTab('visitas')}
              className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0052CC] flex items-center justify-center transition-colors cursor-pointer"
              title="Acessar visitas"
              aria-label="Acessar visitas de hoje"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 block">
              Visitas de hoje
            </span>
            <span className="text-3xl font-extrabold text-[#1E3A8A] tracking-tight mt-1 block">
              12
            </span>
          </div>
        </div>

        {/* Card 2: Instalações de hoje */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <button
              onClick={() => onNavigateTab('instalacoes')}
              className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Acessar instalações"
              aria-label="Acessar instalações de hoje"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 block">
              Instalações de hoje
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
              8
            </span>
          </div>
        </div>

        {/* Card 3: Retornos pendentes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 stroke-[2.2]" />
            </div>
            <button
              onClick={() => onNavigateTab('retornos')}
              className="w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Acessar retornos"
              aria-label="Acessar retornos pendentes"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 block">
              Retornos pendentes
            </span>
            <span className="text-3xl font-extrabold text-orange-600 tracking-tight mt-1 block">
              3
            </span>
          </div>
        </div>

        {/* Card 4: Próximos agendamentos */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <button
              onClick={() => onNavigateTab('agenda')}
              className="w-8 h-8 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Acessar agenda completa"
              aria-label="Acessar próximos agendamentos"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 block">
              Próximos agendamentos
            </span>
            <span className="text-3xl font-extrabold text-purple-600 tracking-tight mt-1 block">
              15
            </span>
          </div>
        </div>
      </section>

      {/* 3. GRID PRINCIPAL (2 TABELAS LADO A LADO) */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* COLUNA ESQUERDA - CARD "VISITAS" */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Cabeçalho do Card */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
                <ClipboardList className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Visitas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Visitas agendadas e realizadas</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('visitas')}
              className="text-xs font-semibold text-[#0052CC] hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabela de Visitas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">HORÁRIO</th>
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">ENDEREÇO</th>
                  <th className="py-3 px-4">INSTALADOR</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">AGENDADA POR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {visitas.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Horário em badge pílula azul suave */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#2563EB]">
                        {item.horario}
                      </span>
                    </td>
                    {/* Cliente em negrito */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.cliente}
                    </td>
                    {/* Endereço com cidade */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate" title={item.endereco}>
                      {item.endereco}
                    </td>
                    {/* Instalador */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {item.instalador}
                    </td>
                    {/* Status badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderVisitaStatusBadge(item.status)}
                    </td>
                    {/* Agendada por */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {item.agendadaPor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé do Card */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between mt-auto">
            <button
              type="button"
              onClick={onOpenNovaVisita}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0052CC] text-[#0052CC] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova visita</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('visitas')}
              className="text-xs font-semibold text-[#0052CC] hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver todas as visitas →
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA - CARD "INSTALAÇÕES" */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Cabeçalho do Card */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
                <Wrench className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Instalações</h3>
                <p className="text-xs text-slate-500 mt-0.5">Instalações em andamento e concluídas</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('instalacoes')}
              className="text-xs font-semibold text-[#0052CC] hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabela de Instalações */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">PEDIDO</th>
                  <th className="py-3 px-4">INSTALADOR</th>
                  <th className="py-3 px-4">ETAPA ATUAL</th>
                  <th className="py-3 px-4">DATA</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {instalacoes.slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Cliente em negrito */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.cliente}
                    </td>
                    {/* Pedido (número limpo, sem '#') */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {item.pedido.replace('#', '')}
                    </td>
                    {/* Instalador */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {item.instalador}
                    </td>
                    {/* Badges de Etapa Atual */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderEtapaBadge(item.etapaAtual)}
                    </td>
                    {/* Data: DD/MM */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                      {item.data}
                    </td>
                    {/* Status badge: 'Em andamento' ou 'Concluída' */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'Concluída' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Concluída
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          Em andamento
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé do Card */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between mt-auto">
            <button
              type="button"
              onClick={onOpenNovaInstalacao}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#0052CC] text-[#0052CC] hover:bg-blue-50 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova instalação</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('instalacoes')}
              className="text-xs font-semibold text-[#0052CC] hover:text-blue-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Ver todas as instalações →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
