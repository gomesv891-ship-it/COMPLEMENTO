import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  Calendar,
  Hash,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { InstalacaoItem, InstalacaoEtapa, InstalacaoStatus } from '../../types';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoInstalacoesViewProps {
  instalacoes: InstalacaoItem[];
  onOpenNovaInstalacao: () => void;
  onUpdateEtapa: (id: string, newEtapa: InstalacaoEtapa) => void;
  onUpdateStatus: (id: string, newStatus: InstalacaoStatus) => void;
  searchQuery?: string;
}

export const AgendamentoInstalacoesView: React.FC<AgendamentoInstalacoesViewProps> = ({
  instalacoes,
  onOpenNovaInstalacao,
  onUpdateEtapa,
  onUpdateStatus,
  searchQuery: externalSearch = '',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  const effectiveSearch = (externalSearch || internalSearch).toLowerCase();

  const filtered = instalacoes.filter((item) => {
    const matchesSearch =
      item.cliente.toLowerCase().includes(effectiveSearch) ||
      item.pedido.toLowerCase().includes(effectiveSearch) ||
      item.instalador.toLowerCase().includes(effectiveSearch) ||
      (item.endereco && item.endereco.toLowerCase().includes(effectiveSearch)) ||
      (item.produto && item.produto.toLowerCase().includes(effectiveSearch));

    const matchesEtapa =
      selectedEtapa === 'todas' || item.etapaAtual === selectedEtapa;

    const matchesStatus =
      selectedStatus === 'todos' || item.status === selectedStatus;

    return matchesSearch && matchesEtapa && matchesStatus;
  });

  const renderEtapaBadge = (etapa: InstalacaoEtapa) => {
    switch (etapa) {
      case 'Preparação do contrapiso':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300/70 font-semibold">
            Concluída
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
            {etapa}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center shadow-xs">
            <Wrench className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Gestão de Instalações
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento de etapas de obras, contrapiso, colocação e acabamentos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNovaInstalacao}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Instalação</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Buscar por cliente, pedido (ex: 4492), instalador..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 transition-all outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Etapa:</span>
          </div>
          <select
            value={selectedEtapa}
            onChange={(e) => setSelectedEtapa(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0052CC]"
          >
            <option value="todas">Todas as Etapas</option>
            <option value="Preparação do contrapiso">Preparação do contrapiso</option>
            <option value="Aplicação da cola">Aplicação da cola</option>
            <option value="Instalação do piso">Instalação do piso</option>
            <option value="Finalização">Finalização</option>
            <option value="Concluída">Concluída</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0052CC]"
          >
            <option value="todos">Todos os Status</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluída">Concluída</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">CLIENTE</th>
                <th className="py-3.5 px-4">PEDIDO</th>
                <th className="py-3.5 px-4">INSTALADOR</th>
                <th className="py-3.5 px-4">ETAPA ATUAL</th>
                <th className="py-3.5 px-4">DATA</th>
                <th className="py-3.5 px-4">METRAGEM / PRODUTO</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-center">ATUALIZAR ETAPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma instalação encontrada com os critérios informados.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Cliente */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.cliente}
                      {item.endereco && (
                        <span className="block text-[11px] font-normal text-slate-400 max-w-[200px] truncate">
                          {item.endereco}
                        </span>
                      )}
                    </td>
                    {/* Pedido (sem '#') */}
                    <td className="py-3.5 px-4 font-bold text-[#0052CC] whitespace-nowrap">
                      {item.pedido.replace('#', '')}
                    </td>
                    {/* Instalador */}
                    <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        <UserAvatar userName={item.instalador} size="xs" />
                        <span>{item.instalador}</span>
                      </div>
                    </td>
                    {/* Etapa Atual */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderEtapaBadge(item.etapaAtual)}
                    </td>
                    {/* Data */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {item.data}
                    </td>
                    {/* Metragem / Produto */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div>
                        {item.metragem && <span className="font-semibold text-slate-800 mr-1.5">{item.metragem}</span>}
                        {item.produto && <span className="text-[11px] text-slate-500 block">{item.produto}</span>}
                      </div>
                    </td>
                    {/* Status */}
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
                    {/* Atualizar Etapa */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <select
                        value={item.etapaAtual}
                        onChange={(e) => {
                          const newEtapa = e.target.value as InstalacaoEtapa;
                          onUpdateEtapa(item.id, newEtapa);
                          if (newEtapa === 'Concluída') {
                            onUpdateStatus(item.id, 'Concluída');
                          }
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium focus:outline-hidden focus:border-[#0052CC]"
                      >
                        <option value="Preparação do contrapiso">Preparação do contrapiso</option>
                        <option value="Aplicação da cola">Aplicação da cola</option>
                        <option value="Instalação do piso">Instalação do piso</option>
                        <option value="Finalização">Finalização</option>
                        <option value="Concluída">Concluída</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
