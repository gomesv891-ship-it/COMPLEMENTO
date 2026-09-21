import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, User, Wrench, FileText, Phone } from 'lucide-react';
import { VisitaItem, VisitaStatus } from '../../types';

interface NovaVisitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visita: Omit<VisitaItem, 'id'>) => void;
  currentUserName: string;
}

export const NovaVisitaModal: React.FC<NovaVisitaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUserName,
}) => {
  const [cliente, setCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [data, setData] = useState('05/09');
  const [horario, setHorario] = useState('14:00');
  const [instalador, setInstalador] = useState('João Carlos');
  const [agendadaPor, setAgendadaPor] = useState(currentUserName || 'Vanessa Gomes');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState<VisitaStatus>('Agendada');
  const [tipoVisita, setTipoVisita] = useState<VisitaItem['tipoVisita']>('Medição técnica');
  const [observacoes, setObservacoes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || !endereco.trim()) return;

    onSave({
      cliente: cliente.trim(),
      endereco: endereco.trim(),
      data: data.trim() || '05/09',
      horario: horario.trim() || '08:00',
      instalador,
      agendadaPor: agendadaPor.trim() || 'Vanessa Gomes',
      status,
      telefone: telefone.trim(),
      tipoVisita,
      observacoes: observacoes.trim(),
    });

    // Reset form
    setCliente('');
    setEndereco('');
    setObservacoes('');
    setTelefone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center">
              <Calendar className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Agendar Nova Visita</h3>
              <p className="text-xs text-slate-500">Cadastre uma medição ou vistoria técnica</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nome do Cliente *
            </label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Ex: Carlos Mendes"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Endereço Completo com Cidade *
            </label>
            <input
              type="text"
              required
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: R. das Flores, 123 Jundiaí - SP"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data
              </label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="Ex: 05/09 ou 06/09"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Horário
              </label>
              <input
                type="text"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Ex: 08:00, 10:30, 14:00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
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
                <option value="João Carlos">João Carlos (LVT & SPC)</option>
                <option value="Marcos Silva">Marcos Silva (Preparação)</option>
                <option value="Pedro Santos">Pedro Santos (Acabamentos)</option>
                <option value="Lucas Ferreira">Lucas Ferreira (Geral)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Agendada por
              </label>
              <input
                type="text"
                value={agendadaPor}
                onChange={(e) => setAgendadaPor(e.target.value)}
                placeholder="Vanessa Gomes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo de Visita
              </label>
              <select
                value={tipoVisita}
                onChange={(e) => setTipoVisita(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/10 text-slate-800 bg-white transition-all"
              >
                <option value="Medição técnica">Medição técnica</option>
                <option value="Vistoria preliminar">Vistoria preliminar</option>
                <option value="Acompanhamento">Acompanhamento</option>
                <option value="Orçamento">Orçamento</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Inicial
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Agendada', 'Em atendimento', 'Realizada'] as VisitaStatus[]).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    status === st
                      ? 'border-[#0052CC] bg-blue-50 text-[#0052CC] font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Observações Técnicas
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Ambientes, detalhes do contrapiso ou instruções de acesso..."
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
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
