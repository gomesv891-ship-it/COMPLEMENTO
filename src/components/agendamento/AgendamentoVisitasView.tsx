import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { VisitaItem, VisitaStatus } from '../../types';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoVisitasViewProps {
  visitas: VisitaItem[];
  onOpenNovaVisita: () => void;
  onUpdateStatus: (id: string, newStatus: VisitaStatus) => void;
  searchQuery?: string;
}

export const AgendamentoVisitasView: React.FC<AgendamentoVisitasViewProps> = ({
  visitas,
  onOpenNovaVisita,
  onUpdateStatus,
  searchQuery: externalSearch = '',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedInstalador, setSelectedInstalador] = useState<string>('todos');

  const effectiveSearch = (externalSearch || internalSearch).toLowerCase();

  const filteredVisitas = visitas.filter((v) => {
    const matchesSearch =
      v.cliente.toLowerCase().includes(effectiveSearch) ||
      v.endereco.toLowerCase().includes(effectiveSearch) ||
      v.instalador.toLowerCase().includes(effectiveSearch) ||
      v.horario.includes(effectiveSearch);

    const matchesStatus =
      selectedStatus === 'todos' || v.status === selectedStatus;

    const matchesInstalador =
      selectedInstalador === 'todos' || v.instalador === selectedInstalador;

    return matchesSearch && matchesStatus && matchesInstalador;
  });

  const renderStatusBadge = (status: VisitaStatus) => {
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

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center shadow-xs">
            <ClipboardList className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Gestão de Visitas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Controle de medições, vistorias técnicas e orçamentos presenciais
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNovaVisita}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Visita</span>
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
            placeholder="Buscar por cliente, endereço ou instalador..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 transition-all outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0052CC]"
          >
            <option value="todos">Todos os Status</option>
            <option value="Agendada">Agendada</option>
            <option value="Em atendimento">Em atendimento</option>
            <option value="Realizada">Realizada</option>
          </select>

          <select
            value={selectedInstalador}
            onChange={(e) => setSelectedInstalador(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#0052CC]"
          >
            <option value="todos">Todos os Instaladores</option>
            <option value="João Carlos">João Carlos</option>
            <option value="Marcos Silva">Marcos Silva</option>
            <option value="Pedro Santos">Pedro Santos</option>
          </select>
        </div>
      </div>

      {/* Main Visitas Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">HORÁRIO</th>
                <th className="py-3.5 px-4">DATA</th>
                <th className="py-3.5 px-4">CLIENTE</th>
                <th className="py-3.5 px-4">ENDEREÇO</th>
                <th className="py-3.5 px-4">TIPO</th>
                <th className="py-3.5 px-4">INSTALADOR</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredVisitas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma visita encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredVisitas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Horário */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#2563EB]">
                        {item.horario}
                      </span>
                    </td>
                    {/* Data */}
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {item.data}
                    </td>
                    {/* Cliente */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.cliente}
                      {item.telefone && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          {item.telefone}
                        </span>
                      )}
                    </td>
                    {/* Endereço */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate" title={item.endereco}>
                      {item.endereco}
                    </td>
                    {/* Tipo */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {item.tipoVisita || 'Medição técnica'}
                      </span>
                    </td>
                    {/* Instalador */}
                    <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        <UserAvatar userName={item.instalador} size="xs" />
                        <span>{item.instalador}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(item.status)}
                    </td>
                    {/* Ações */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateStatus(item.id, e.target.value as VisitaStatus)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium focus:outline-hidden focus:border-[#0052CC]"
                      >
                        <option value="Agendada">Agendada</option>
                        <option value="Em atendimento">Em atendimento</option>
                        <option value="Realizada">Realizada</option>
                        <option value="Cancelada">Cancelada</option>
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
