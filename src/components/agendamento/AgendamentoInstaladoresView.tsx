import React, { useState } from 'react';
import { Users2, Phone, Star, Wrench, Calendar, CheckCircle2, Shield, Plus } from 'lucide-react';
import { InstaladorItem } from '../../types';
import { UserAvatar } from '../UserAvatar';

interface AgendamentoInstaladoresViewProps {
  instaladores: InstaladorItem[];
  onUpdateStatus: (id: string, newStatus: 'Disponível' | 'Em Obra' | 'Folga') => void;
  onAddInstalador: (inst: Omit<InstaladorItem, 'id'>) => void;
}

export const AgendamentoInstaladoresView: React.FC<AgendamentoInstaladoresViewProps> = ({
  instaladores,
  onUpdateStatus,
  onAddInstalador,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onAddInstalador({
      nome: nome.trim(),
      telefone: telefone.trim() || '(11) 98000-0000',
      especialidade: especialidade.trim() || 'Vinílico LVT & SPC',
      status: 'Disponível',
      visitasHoje: 0,
      instalacoesAtivas: 0,
      avaliacao: 5.0,
    });

    setNome('');
    setTelefone('');
    setEspecialidade('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0052CC] flex items-center justify-center shadow-xs">
            <Users2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Equipe de Instaladores
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Profissionais credenciados Fênix World e disponibilidade em tempo real
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Cadastrar Instalador</span>
        </button>
      </div>

      {/* Grid of Installer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {instaladores.map((inst) => (
          <div
            key={inst.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between">
                <UserAvatar
                  userName={inst.nome}
                  size="md"
                  className="shadow-xs"
                />
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
                  <span>{inst.avaliacao.toFixed(1)}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3.5">{inst.nome}</h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5 min-h-[32px]">
                {inst.especialidade}
              </p>

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{inst.telefone}</span>
              </div>

              {/* Status Selector */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">Status Atual:</span>
                <select
                  value={inst.status}
                  onChange={(e) =>
                    onUpdateStatus(inst.id, e.target.value as 'Disponível' | 'Em Obra' | 'Folga')
                  }
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    inst.status === 'Disponível'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : inst.status === 'Em Obra'
                      ? 'bg-blue-50 text-[#0052CC] border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Em Obra">Em Obra</option>
                  <option value="Folga">Folga</option>
                </select>
              </div>
            </div>

            {/* Bottom Metrics */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-medium">Visitas Hoje</span>
                <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">
                  {inst.visitasHoje}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-medium">Obras Ativas</span>
                <span className="font-extrabold text-[#0052CC] text-sm mt-0.5 block">
                  {inst.instalacoesAtivas}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Instalador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Novo Instalador</h3>
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
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lucas Ferreira"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Especialidade Principal</label>
                <input
                  type="text"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  placeholder="Ex: Vinílico LVT & Rodapés"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
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
                  className="px-4 py-2 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
