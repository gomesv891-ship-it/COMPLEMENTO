import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, Clock, User, Wrench, Search, Plus } from 'lucide-react';
import { RetornoItem, RetornoStatus, RetornoUrgencia } from '../../types';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoRetornosViewProps {
  retornos: RetornoItem[];
  onUpdateStatus: (id: string, newStatus: RetornoStatus) => void;
  onAddRetorno: (retorno: Omit<RetornoItem, 'id'>) => void;
  searchQuery?: string;
}

export const AgendamentoRetornosView: React.FC<AgendamentoRetornosViewProps> = ({
  retornos,
  onUpdateStatus,
  onAddRetorno,
  searchQuery: externalSearch = '',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Retorno Form State
  const [cliente, setCliente] = useState('');
  const [pedido, setPedido] = useState('');
  const [instalador, setInstalador] = useState('João Carlos');
  const [motivo, setMotivo] = useState('');
  const [data, setData] = useState('08/09');
  const [urgencia, setUrgencia] = useState<RetornoUrgencia>('Média');

  const effectiveSearch = (externalSearch || internalSearch).toLowerCase();

  const filtered = retornos.filter(
    (r) =>
      r.cliente.toLowerCase().includes(effectiveSearch) ||
      r.pedido.toLowerCase().includes(effectiveSearch) ||
      r.motivo.toLowerCase().includes(effectiveSearch) ||
      r.instalador.toLowerCase().includes(effectiveSearch)
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || !pedido.trim() || !motivo.trim()) return;

    onAddRetorno({
      cliente: cliente.trim(),
      pedido: pedido.replace(/[^0-9]/g, ''),
      instalador,
      motivo: motivo.trim(),
      data: data.trim() || '08/09',
      urgencia,
      status: 'Pendente',
    });

    setCliente('');
    setPedido('');
    setMotivo('');
    setIsModalOpen(false);
  };

  const renderUrgenciaBadge = (urg: RetornoUrgencia) => {
    switch (urg) {
      case 'Alta':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
            Alta
          </span>
        );
      case 'Média':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            Média
          </span>
        );
      case 'Baixa':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Baixa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
            <RotateCcw className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Retornos Pendentes & Vistorias
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de retoques, ajustes de rodapés e revisões pós-instalação
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Retorno</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder="Buscar por cliente, pedido ou motivo do retorno..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">PEDIDO</th>
                <th className="py-3.5 px-4">CLIENTE</th>
                <th className="py-3.5 px-4">MOTIVO DO RETORNO</th>
                <th className="py-3.5 px-4">INSTALADOR</th>
                <th className="py-3.5 px-4">DATA PREVISTA</th>
                <th className="py-3.5 px-4">URGÊNCIA</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum retorno pendente cadastrado.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Pedido sem '#' */}
                    <td className="py-3.5 px-4 font-bold text-[#0052CC] whitespace-nowrap">
                      {item.pedido.replace('#', '')}
                    </td>
                    {/* Cliente */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {item.cliente}
                    </td>
                    {/* Motivo */}
                    <td className="py-3.5 px-4 text-slate-700 max-w-[240px]">
                      {item.motivo}
                    </td>
                    {/* Instalador */}
                    <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserAvatar userName={item.instalador} size="xs" />
                        <span>{item.instalador}</span>
                      </div>
                    </td>
                    {/* Data */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {item.data}
                    </td>
                    {/* Urgência */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderUrgenciaBadge(item.urgencia)}
                    </td>
                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'Concluído'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Agendado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    {/* Ações */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateStatus(item.id, e.target.value as RetornoStatus)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium focus:outline-hidden focus:border-orange-500"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Agendado">Agendado</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Retorno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Registrar Retorno Técnico</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Roberto Lima"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pedido (sem #) *</label>
                  <input
                    type="text"
                    required
                    value={pedido}
                    onChange={(e) => setPedido(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ex: 4487"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Prevista</label>
                  <input
                    type="text"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    placeholder="08/09"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instalador</label>
                  <select
                    value={instalador}
                    onChange={(e) => setInstalador(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="João Carlos">João Carlos</option>
                    <option value="Marcos Silva">Marcos Silva</option>
                    <option value="Pedro Santos">Pedro Santos</option>
                    <option value="Lucas Ferreira">Lucas Ferreira</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgência</label>
                  <select
                    value={urgencia}
                    onChange={(e) => setUrgencia(e.target.value as RetornoUrgencia)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo do Retorno *</label>
                <textarea
                  rows={3}
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: Ajuste de rodapé no corredor e substituição de uma régua danificada..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-orange-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Salvar Retorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
