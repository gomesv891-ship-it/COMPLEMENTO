import React, { useState } from 'react';
import { Settings, Clock, Bell, MapPin, Shield, Check } from 'lucide-react';

export const AgendamentoConfigView: React.FC = () => {
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [diasSemana, setDiasSemana] = useState('Segunda a Sábado');
  const [tempoPadraoVisita, setTempoPadraoVisita] = useState('60');
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const [notifAtraso, setNotifAtraso] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
          <Settings className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Configurações Operacionais de Agendamento
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Defina horários de atendimento, janelas de instalação e alertas do subsistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card: Horários de Operação */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-[#0052CC]" />
            <h3 className="font-bold text-slate-900 text-sm">Janela de Atendimento e Visitas</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Horário Inicial</label>
              <input
                type="text"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Horário Final</label>
              <input
                type="text"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Duração Média de Medição (min)</label>
              <input
                type="number"
                value={tempoPadraoVisita}
                onChange={(e) => setTempoPadraoVisita(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#0052CC]"
              />
            </div>
          </div>
        </div>

        {/* Card: Alertas e Notificações */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-4 h-4 text-[#0052CC]" />
            <h3 className="font-bold text-slate-900 text-sm">Alertas e Notificações Operacionais</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifWhatsApp}
                onChange={(e) => setNotifWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-[#0052CC] focus:ring-[#0052CC]"
              />
              <span className="text-slate-700 font-medium">
                Enviar lembrete de agendamento automático aos clientes 24h antes da visita
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifAtraso}
                onChange={(e) => setNotifAtraso(e.target.checked)}
                className="w-4 h-4 rounded text-[#0052CC] focus:ring-[#0052CC]"
              />
              <span className="text-slate-700 font-medium">
                Sinalizar em vermelho visitas ou obras sem atualização de etapa há mais de 48 horas
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Configurações salvas com sucesso!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0052CC] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            Salvar Preferências
          </button>
        </div>
      </form>
    </div>
  );
};
