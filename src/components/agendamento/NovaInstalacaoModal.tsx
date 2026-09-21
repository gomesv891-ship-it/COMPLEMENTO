import React, { useState } from 'react';
import { X, Wrench, User, Hash, Calendar, Layers, CheckCircle2, FileText, MapPin } from 'lucide-react';
import { InstalacaoItem, InstalacaoEtapa, InstalacaoStatus } from '../../types';

interface NovaInstalacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (instalacao: Omit<InstalacaoItem, 'id'>) => void;
}

export const NovaInstalacaoModal: React.FC<NovaInstalacaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [cliente, setCliente] = useState('');
  const [pedido, setPedido] = useState('');
  const [instalador, setInstalador] = useState('João Carlos');
  const [etapaAtual, setEtapaAtual] = useState<InstalacaoEtapa>('Preparação do contrapiso');
  const [data, setData] = useState('05/09');
  const [status, setStatus] = useState<InstalacaoStatus>('Em andamento');
  const [endereco, setEndereco] = useState('');
  const [metragem, setMetragem] = useState('');
  const [produto, setProduto] = useState('');
  const [observacoes, setObservacoes] = useState('');

  if (!isOpen) return null;

  // Clean pedido input: purely digits, no '#'
  const handlePedidoChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setPedido(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || !pedido.trim()) return;

    onSave({
      cliente: cliente.trim(),
      pedido: pedido.trim(),
      instalador,
      etapaAtual,
      data: data.trim() || '05/09',
      status,
      endereco: endereco.trim(),
      metragem: metragem.trim() ? `${metragem.replace('m²', '').trim()} m²` : undefined,
      produto: produto.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    });

    // Reset
    setCliente('');
    setPedido('');
    setEndereco('');
    setMetragem('');
    setProduto('');
    setObservacoes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cadastrar Nova Instalação</h3>
              <p className="text-xs text-slate-500">Acompanhamento operacional de montagem e entrega</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nome do Cliente *
              </label>
              <input
                type="text"
                required
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ex: Maria Oliveira"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 placeholder-slate-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Pedido (números puros) *
              </label>
              <input
                type="text"
                required
                value={pedido}
                onChange={(e) => handlePedidoChange(e.target.value)}
                placeholder="Ex: 4492"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 font-medium placeholder-slate-400 transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Apenas dígitos, sem &quot;#&quot;</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                Instalador Responsável
              </label>
              <select
                value={instalador}
                onChange={(e) => setInstalador(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 bg-white transition-all"
              >
                <option value="João Carlos">João Carlos</option>
                <option value="Marcos Silva">Marcos Silva</option>
                <option value="Pedro Santos">Pedro Santos</option>
                <option value="Lucas Ferreira">Lucas Ferreira</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Início
              </label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Ex: 05/09"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Etapa Atual
            </label>
            <select
              value={etapaAtual}
              onChange={(e) => setEtapaAtual(e.target.value as InstalacaoEtapa)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 bg-white transition-all"
            >
              <option value="Preparação do contrapiso">Preparação do contrapiso</option>
              <option value="Aplicação da cola">Aplicação da cola</option>
              <option value="Instalação do piso">Instalação do piso</option>
              <option value="Finalização">Finalização</option>
              <option value="Concluída">Concluída</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Status Geral
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatus('Em andamento')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                  status === 'Em andamento'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Em andamento
              </button>
              <button
                type="button"
                onClick={() => setStatus('Concluída')}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                  status === 'Concluída'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Concluída
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Produto / Modelo
              </label>
              <input
                type="text"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                placeholder="Ex: Piso Vinílico Colado Flexfloor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Metragem Total
              </label>
              <input
                type="text"
                value={metragem}
                onChange={(e) => setMetragem(e.target.value)}
                placeholder="Ex: 68"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Endereço da Obra
            </label>
            <input
              type="text"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: Rua do Retiro, 430 - Anhangabaú"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Instruções de montagem, rodapés, nivelamento..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 placeholder-slate-400 resize-none transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              Salvar Instalação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
