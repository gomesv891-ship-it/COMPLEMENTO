import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Layers,
  History,
  Search,
  Plus,
  Save,
  Trash2,
  Lock,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Percent,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  TarkettProdutoReferencia,
  TARKETT_PRODUTOS_REFERENCIA,
  TarkettSimulacaoItem,
  calcularSimuladorTarkett,
  getTarkettSimulacoes,
  saveNovaTarkettSimulacao,
  deleteTarkettSimulacao,
} from '../../utils/costsConfigService';

interface CustosTarkettTabProps {
  currentUserName: string;
  isDirector: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustosTarkettTab: React.FC<CustosTarkettTabProps> = ({
  currentUserName,
  isDirector,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'Simulador' | 'Produtos' | 'Histórico'>('Simulador');

  // Catálogo de referência
  const [produtosRef] = useState<TarkettProdutoReferencia[]>(TARKETT_PRODUTOS_REFERENCIA);
  const [searchProduto, setSearchProduto] = useState('');

  // Simulador States
  const [produtoNome, setProdutoNome] = useState('Piso Vinílico Tarkett Linha Essence 30');
  const [linhaNome, setLinhaNome] = useState('Essence 30');
  const [unidade, setUnidade] = useState('m²');
  const [precoSiteInput, setPrecoSiteInput] = useState('89,90');
  const [descontoFabricaInput, setDescontoFabricaInput] = useState('10');
  const [freteInput, setFreteInput] = useState('0');
  const [outrosCustosInput, setOutrosCustosInput] = useState('0');

  // Margens configuráveis por perfil
  const [margemCFInput, setMargemCFInput] = useState('35');
  const [margemRevInput, setMargemRevInput] = useState('18');
  const [margemConsInput, setMargemConsInput] = useState('22');
  const [simulacaoObs, setSimulacaoObs] = useState('');

  // Histórico
  const [historico, setHistorico] = useState<TarkettSimulacaoItem[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const [isSavingSimulacao, setIsSavingSimulacao] = useState(false);

  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const parseNumber = (str: string) =>
    parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;

  // Cálculos dinâmicos em tempo real
  const calculo = useMemo(() => {
    return calcularSimuladorTarkett({
      precoSiteFabrica: parseNumber(precoSiteInput),
      descontoFabricaPercent: parseNumber(descontoFabricaInput),
      freteValor: parseNumber(freteInput),
      outrosCustosPercent: parseNumber(outrosCustosInput),
      margemClienteFinalPercent: parseNumber(margemCFInput),
      margemRevendaPercent: parseNumber(margemRevInput),
      margemConstrutoraPercent: parseNumber(margemConsInput),
    });
  }, [
    precoSiteInput,
    descontoFabricaInput,
    freteInput,
    outrosCustosInput,
    margemCFInput,
    margemRevInput,
    margemConsInput,
  ]);

  // Carregar histórico
  useEffect(() => {
    let mounted = true;
    setIsLoadingHistorico(true);
    getTarkettSimulacoes()
      .then((items) => {
        if (mounted) setHistorico(items);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingHistorico(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Selecionar produto do catálogo de referência para o simulador
  const handleSelecionarProdutoCatalogo = (p: TarkettProdutoReferencia) => {
    setProdutoNome(p.nome);
    setLinhaNome(p.linha);
    setUnidade(p.unidade);
    setPrecoSiteInput(p.precoTabelaFabrica.toFixed(2).replace('.', ','));
    setSubTab('Simulador');
    if (showToast) showToast(`Produto "${p.nome}" carregado no simulador Tarkett.`, 'info');
  };

  // Salvar Simulação
  const handleSalvarSimulacao = async () => {
    if (!isDirector) {
      if (showToast)
        showToast('Apenas o Diretor Éder Perez pode salvar simulações oficiais no histórico.', 'error');
      return;
    }

    setIsSavingSimulacao(true);
    try {
      const nova: TarkettSimulacaoItem = {
        id: `tar-sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        data: new Date().toISOString(),
        operador: currentUserName || 'Éder Perez',
        produtoNome,
        linha: linhaNome,
        unidade,
        precoSiteFabrica: parseNumber(precoSiteInput),
        descontoFabricaPercent: parseNumber(descontoFabricaInput),
        freteValor: parseNumber(freteInput),
        outrosCustosPercent: parseNumber(outrosCustosInput),
        custoLiquidoCalculado: calculo.custoLiquido,
        margemClienteFinalPercent: parseNumber(margemCFInput),
        precoClienteFinal: calculo.clienteFinal.precoVenda,
        lucroClienteFinal: calculo.clienteFinal.lucro,
        margemRevendaPercent: parseNumber(margemRevInput),
        precoRevenda: calculo.revenda.precoVenda,
        lucroRevenda: calculo.revenda.lucro,
        margemConstrutoraPercent: parseNumber(margemConsInput),
        precoConstrutora: calculo.construtora.precoVenda,
        lucroConstrutora: calculo.construtora.lucro,
        observacao: simulacaoObs.trim() || undefined,
      };

      const res = await saveNovaTarkettSimulacao(nova, currentUserName);
      if (res.success) {
        setHistorico((prev) => [nova, ...prev]);
        setSimulacaoObs('');
        if (showToast) showToast('Simulação Tarkett gravada com sucesso no Supabase!', 'success');
      } else {
        if (showToast) showToast(res.error || 'Erro ao salvar simulação.', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast(err?.message || 'Falha ao salvar simulação.', 'error');
    } finally {
      setIsSavingSimulacao(false);
    }
  };

  // Carregar Simulação Antiga no Simulador
  const handleCarregarHistoricoNoSimulador = (item: TarkettSimulacaoItem) => {
    setProdutoNome(item.produtoNome);
    setLinhaNome(item.linha);
    setUnidade(item.unidade);
    setPrecoSiteInput(item.precoSiteFabrica.toFixed(2).replace('.', ','));
    setDescontoFabricaInput(item.descontoFabricaPercent.toString().replace('.', ','));
    setFreteInput(item.freteValor.toFixed(2).replace('.', ','));
    setOutrosCustosInput(item.outrosCustosPercent.toString().replace('.', ','));
    setMargemCFInput(item.margemClienteFinalPercent.toString().replace('.', ','));
    setMargemRevInput(item.margemRevendaPercent.toString().replace('.', ','));
    setMargemConsInput(item.margemConstrutoraPercent.toString().replace('.', ','));
    setSubTab('Simulador');
    if (showToast) showToast('Simulação carregada no simulador interativo.', 'info');
  };

  // Excluir Simulação
  const handleExcluirSimulacao = async (id: string) => {
    if (!isDirector) return;
    try {
      const res = await deleteTarkettSimulacao(id, currentUserName);
      if (res.success) {
        setHistorico((prev) => prev.filter((s) => s.id !== id));
        if (showToast) showToast('Simulação excluída do histórico.', 'info');
      }
    } catch {}
  };

  // Exportar Histórico CSV
  const handleExportCSV = () => {
    if (historico.length === 0) return;
    const header =
      'Data;Operador;Produto;Linha;Preco_Site_Fabrica;Desconto_Fabrica;Custo_Liquido;Preco_Cliente_Final;Margem_CF;Preco_Revenda;Margem_Rev;Preco_Construtora;Margem_Cons\n';
    const rows = historico
      .map((h) =>
        [
          new Date(h.data).toLocaleDateString('pt-BR'),
          h.operador,
          `"${h.produtoNome}"`,
          h.linha,
          h.precoSiteFabrica.toFixed(2),
          `${h.descontoFabricaPercent}%`,
          h.custoLiquidoCalculado.toFixed(2),
          h.precoClienteFinal.toFixed(2),
          `${h.margemClienteFinalPercent}%`,
          h.precoRevenda.toFixed(2),
          `${h.margemRevendaPercent}%`,
          h.precoConstrutora.toFixed(2),
          `${h.margemConstrutoraPercent}%`,
        ].join(';')
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `simulacoes_tarkett_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header com Regra de Escopo Restrito */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Formação de Preço Tarkett (Exclusivo)
            </h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100">
              Ferramenta Independente
            </span>
          </div>
          <p className="text-xs text-slate-500">
            <strong>Escopo estrito:</strong> Ferramenta exclusiva de análise e formação de preço
            para a linha Tarkett. Não altera pedidos, vendas, orçamentos, estoque ou preços do
            catálogo de produtos.
          </p>
        </div>

        {/* Sub-abas Tarkett: Produtos | Simulador | Histórico */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['Simulador', 'Produtos', 'Histórico'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === tab
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'Histórico' ? `Histórico (${historico.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-ABA 1: SIMULADOR */}
      {subTab === 'Simulador' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda (5 cols): Parâmetros de Entrada */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Parâmetros de Entrada da Fábrica</h3>
                <span className="text-[11px] text-slate-400 font-medium">Dados do Site / Tabela</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Produto Tarkett
                  </label>
                  <input
                    type="text"
                    value={produtoNome}
                    onChange={(e) => setProdutoNome(e.target.value)}
                    placeholder="Ex: Vinílico Tarkett Essence 30"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Linha / Família
                    </label>
                    <input
                      type="text"
                      value={linhaNome}
                      onChange={(e) => setLinhaNome(e.target.value)}
                      placeholder="Ex: Essence, Injoy..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Unidade de Medida
                    </label>
                    <input
                      type="text"
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      placeholder="m², balde, barra..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Preço de Tabela do Site / Fábrica */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preço Informado no Site / Tabela Fábrica (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      R$
                    </span>
                    <input
                      type="text"
                      value={precoSiteInput}
                      onChange={(e) => setPrecoSiteInput(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Desc. Fábrica (%)
                    </label>
                    <input
                      type="text"
                      value={descontoFabricaInput}
                      onChange={(e) => setDescontoFabricaInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Frete (R$)
                    </label>
                    <input
                      type="text"
                      value={freteInput}
                      onChange={(e) => setFreteInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Outros (%)
                    </label>
                    <input
                      type="text"
                      value={outrosCustosInput}
                      onChange={(e) => setOutrosCustosInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Margens Desejadas */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Margens de Lucro Alvo por Perfil (%):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Cliente Final</span>
                      <input
                        type="text"
                        value={margemCFInput}
                        onChange={(e) => setMargemCFInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Revenda</span>
                      <input
                        type="text"
                        value={margemRevInput}
                        onChange={(e) => setMargemRevInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Construtora</span>
                      <input
                        type="text"
                        value={margemConsInput}
                        onChange={(e) => setMargemConsInput(e.target.value)}
                        className="w-full text-center text-xs font-bold bg-white border border-slate-200 rounded p-1 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anotações da Simulação (Opcional)
                  </label>
                  <input
                    type="text"
                    value={simulacaoObs}
                    onChange={(e) => setSimulacaoObs(e.target.value)}
                    placeholder="Ex: Cotação para obra Alphaville..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSalvarSimulacao}
                    disabled={isSavingSimulacao}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingSimulacao ? 'Gravando no Supabase...' : 'Salvar Simulação no Histórico'}
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita (7 cols): Resultados Calculados em Tempo Real */}
            <div className="lg:col-span-7 space-y-4">
              {/* Card de Custo Estimado Líquido */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Custo Estimado Líquido
                  </span>
                  <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-slate-300">
                    Base p/ {unidade}
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {formatBRL(calculo.custoLiquido)}
                </div>
                <div className="text-xs text-slate-300 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Preço Site: {formatBRL(parseNumber(precoSiteInput))}</span>
                  <span>Desc: -{descontoFabricaInput}%</span>
                  <span>Frete: +{formatBRL(parseNumber(freteInput))}</span>
                </div>
              </div>

              {/* Grid dos 3 Perfis de Formação de Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Cliente Final */}
                <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Cliente Final</span>
                    <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                      {margemCFInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.clienteFinal.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Lucro Bruto:</span>
                    <span className="font-bold text-emerald-700">
                      +{formatBRL(calculo.clienteFinal.lucro)}
                    </span>
                  </div>
                </div>

                {/* 2. Revenda */}
                <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700">Revenda</span>
                    <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                      {margemRevInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.revenda.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Lucro Bruto:</span>
                    <span className="font-bold text-emerald-700">
                      +{formatBRL(calculo.revenda.lucro)}
                    </span>
                  </div>
                </div>

                {/* 3. Construtora */}
                <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">Construtora</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                      {margemConsInput}% margem
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900">
                      {formatBRL(calculo.construtora.precoVenda)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preço Sugerido /{unidade}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Lucro Bruto:</span>
                    <span className="font-bold text-emerald-700">
                      +{formatBRL(calculo.construtora.lucro)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela Comparativa Rápida */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                <div className="text-xs font-bold text-slate-700 mb-1">
                  Resumo de Formação de Preço Tarkett ({produtoNome}):
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold">
                        <th className="py-2 px-3">Perfil</th>
                        <th className="py-2 px-3">Custo Líquido</th>
                        <th className="py-2 px-3">Margem Alvo</th>
                        <th className="py-2 px-3">Preço Sugerido</th>
                        <th className="py-2 px-3 text-right">Lucro Estimado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-blue-700">Cliente Final</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemCFInput}%</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {formatBRL(calculo.clienteFinal.precoVenda)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.clienteFinal.lucro)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-purple-700">Revenda</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemRevInput}%</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {formatBRL(calculo.revenda.precoVenda)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.revenda.lucro)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">Construtora</td>
                        <td className="py-2.5 px-3">{formatBRL(calculo.custoLiquido)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{margemConsInput}%</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {formatBRL(calculo.construtora.precoVenda)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{formatBRL(calculo.construtora.lucro)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 2: PRODUTOS DE REFERÊNCIA */}
      {subTab === 'Produtos' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchProduto}
                onChange={(e) => setSearchProduto(e.target.value)}
                placeholder="Buscar linha ou produto Tarkett..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Clique em &quot;Simular Preço&quot; para preencher os valores.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtosRef
              .filter(
                (p) =>
                  p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
                  p.linha.toLowerCase().includes(searchProduto.toLowerCase())
              )
              .map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {p.linha}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{p.codigo}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.nome}</h4>
                    {p.descricao && (
                      <p className="text-xs text-slate-500 line-clamp-2">{p.descricao}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Tabela de Fábrica</div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatBRL(p.precoTabelaFabrica)}
                        <span className="text-xs font-normal text-slate-400 ml-0.5">
                          /{p.unidade}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelecionarProdutoCatalogo(p)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Simular Preço <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: HISTÓRICO DE SIMULAÇÕES SALVAS */}
      {subTab === 'Histórico' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Simulações Gravadas no Supabase ({historico.length})</span>
            </div>

            <div className="flex items-center gap-2">
              {historico.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Produto Tarkett</th>
                    <th className="py-3 px-4">Custo Líquido</th>
                    <th className="py-3 px-4">Cliente Final</th>
                    <th className="py-3 px-4">Revenda</th>
                    <th className="py-3 px-4">Construtora</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historico.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhuma simulação salva ainda. Use a aba &quot;Simulador&quot; e clique em &quot;Salvar
                        Simulação no Histórico&quot;.
                      </td>
                    </tr>
                  ) : (
                    historico.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {new Date(item.data).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{item.operador}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.produtoNome}
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.linha} ({item.unidade})
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatBRL(item.custoLiquidoCalculado)}
                        </td>
                        <td className="py-3 px-4 text-blue-700 font-bold">
                          {formatBRL(item.precoClienteFinal)}
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">
                            ({item.margemClienteFinalPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-purple-700 font-bold">
                          {formatBRL(item.precoRevenda)}
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">
                            ({item.margemRevendaPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-amber-700 font-bold">
                          {formatBRL(item.precoConstrutora)}
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">
                            ({item.margemConstrutoraPercent}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCarregarHistoricoNoSimulador(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              title="Carregar no Simulador"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            {isDirector && (
                              <button
                                type="button"
                                onClick={() => handleExcluirSimulacao(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
