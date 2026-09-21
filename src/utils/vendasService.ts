import { VendaGerencial, VendaItemProduto, VendaHistoricoEntry, TipoCustoVenda, VendaCustoItem, ClientRecord } from "../types";
import { getSupabaseClient, saveWholeCollectionToSupabase, dispatchCollectionEvents } from "./supabaseClient";
import { calcularCustosVariaveis, getCustosVariaveis } from "./custosVariaveis";

export const VENDAS_GERENCIAL_KEY = "fenix_vendas_gerencial";
export const DELETED_VENDAS_KEY = "fenix_deleted_vendas_ids";

export function getDeletedVendasIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_VENDAS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export async function addDeletedVendaId(id: string, usuario: string) {
  try {
    const set = getDeletedVendasIds();
    set.add(id);
    const arr = Array.from(set);
    localStorage.setItem(DELETED_VENDAS_KEY, JSON.stringify(arr));
    await saveWholeCollectionToSupabase(DELETED_VENDAS_KEY, arr, usuario);
  } catch {}
}

export function normalizarTipoCliente(tipo?: string): string {
  if (!tipo || !tipo.trim()) return 'Cliente Final';
  return tipo.trim();
}

export function extrairNumeroPuroPedido(raw: string | number): string {
  if (raw === undefined || raw === null) return '102030';
  const s = String(raw).trim();
  const digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length > 0) return digitsOnly;
  return s.replace(/^#+/, '').replace(/^pedido\s*/i, '').trim() || '102030';
}

export function getTaxasConfiguradasDiretor(): {
  taxaNotaFiscalPercent: number;
  taxaMaquininhaPercent: number;
} {
  const custosVar = getCustosVariaveis();
  let nf = 0;
  let maq = 0;
  custosVar.forEach((c) => {
    if (!c.ativo) return;
    const nomeNorm = c.nome.toLowerCase();
    if (nomeNorm.includes('nota') || nomeNorm.includes('fiscal') || nomeNorm.includes('imposto') || nomeNorm.includes('nf') || nomeNorm.includes('tribut')) {
      if (c.tipo === 'porcentagem' && c.valor > 0) nf = c.valor;
    }
    if (nomeNorm.includes('maquininha') || nomeNorm.includes('cartão') || nomeNorm.includes('cartao') || nomeNorm.includes('taxa de pagamento') || nomeNorm.includes('maquina')) {
      if (c.tipo === 'porcentagem' && c.valor > 0) maq = c.valor;
    }
  });
  return {
    taxaNotaFiscalPercent: nf,
    taxaMaquininhaPercent: maq,
  };
}

export function gerarCustosItensIniciais(
  valorVenda: number,
  custoProdutos: number,
  desconto: number = 0,
  frete: number = 0,
  formaPagamento: string = 'Pix'
): VendaCustoItem[] {
  const { taxaNotaFiscalPercent, taxaMaquininhaPercent } = getTaxasConfiguradasDiretor();
  const itens: VendaCustoItem[] = [];

  // 1. Produto
  itens.push({
    id: `custo-prod-${Date.now()}-1`,
    tipo: 'Produto',
    descricao: 'Custo de Fabricação / Aquisição dos Produtos',
    valor: Number(custoProdutos) || 0,
  });

  // 2. Nota Fiscal (se houver alíquota configurada pela diretoria)
  const valorNF = taxaNotaFiscalPercent > 0 ? Number(((valorVenda * taxaNotaFiscalPercent) / 100).toFixed(2)) : 0;
  if (valorNF > 0) {
    itens.push({
      id: `custo-nf-${Date.now()}-2`,
      tipo: 'Nota Fiscal',
      descricao: `Impostos s/ NF (${taxaNotaFiscalPercent}%)`,
      valor: valorNF,
    });
  }

  // 3. Taxa de Pagamento (se a forma de pagamento for cartão ou houver taxa de maquininha)
  const isCartao = formaPagamento.toLowerCase().includes('cart') || formaPagamento.toLowerCase().includes('crédito') || formaPagamento.toLowerCase().includes('debito');
  const valorMaq = (isCartao && taxaMaquininhaPercent > 0)
    ? Number(((valorVenda * taxaMaquininhaPercent) / 100).toFixed(2))
    : 0;
  if (valorMaq > 0) {
    itens.push({
      id: `custo-pag-${Date.now()}-3`,
      tipo: 'Taxa de Pagamento',
      descricao: `Taxa Maquininha (${taxaMaquininhaPercent}%)`,
      valor: valorMaq,
    });
  }

  // 4. Frete
  if (frete > 0) {
    itens.push({
      id: `custo-frete-${Date.now()}-4`,
      tipo: 'Frete',
      descricao: 'Frete / Logística de Entrega',
      valor: Number(frete),
    });
  }

  // 5. Desconto concedido
  if (desconto > 0) {
    itens.push({
      id: `custo-desc-${Date.now()}-5`,
      tipo: 'Desconto',
      descricao: 'Desconto Comercial Concedido',
      valor: Number(desconto),
    });
  }

  return itens;
}

export function recalcularCustosELucro(valorVenda: number, custosItens: VendaCustoItem[]): {
  custoTotal: number;
  custoProdutos: number;
  custosAdicionais: number;
  lucro: number;
  margem: number;
} {
  const vVenda = Number(valorVenda) || 0;
  let custoProdutos = 0;
  let custosAdicionais = 0;

  custosItens.forEach((c) => {
    const val = Number(c.valor) || 0;
    if (c.tipo === 'Produto') {
      custoProdutos += val;
    } else {
      custosAdicionais += val;
    }
  });

  const custoTotal = Number((custoProdutos + custosAdicionais).toFixed(2));
  const lucro = Number((vVenda - custoTotal).toFixed(2));
  const margem = vVenda > 0 ? Number(((lucro / vVenda) * 100).toFixed(1)) : 0;

  return {
    custoTotal,
    custoProdutos: Number(custoProdutos.toFixed(2)),
    custosAdicionais: Number(custosAdicionais.toFixed(2)),
    lucro,
    margem,
  };
}

export function calcularLucroEMargem(valorVenda: number, custoProdutos: number, custosAdicionais: number): {
  lucro: number;
  margem: number;
} {
  const vVenda = Number(valorVenda) || 0;
  const cProd = Number(custoProdutos) || 0;
  const cAdd = Number(custosAdicionais) || 0;

  const lucro = Number((vVenda - cProd - cAdd).toFixed(2));
  const margem = vVenda > 0 ? Number(((lucro / vVenda) * 100).toFixed(1)) : 0;

  return { lucro, margem };
}

/**
 * Lista inicial de vendas: rigorosamente vazia.
 * Não são criados registros fictícios ou de demonstração.
 * As vendas reais são originadas exclusivamente de Metas, Follow-up ("Vendido") e lançamentos reais do CRM.
 */
export const INITIAL_VENDAS: VendaGerencial[] = [];

/**
 * Identifica e bloqueia qualquer registro fictício, inventado ou de demonstração.
 */
export function isFictitiousVenda(item: any): boolean {
  if (!item) return true;
  const id = String(item.id || "").trim();

  // 1. IDs do mock legado do período visual demonstrativo (vnd-1001 a vnd-1028)
  if (/^vnd-10(0[1-9]|1[0-9]|2[0-8])$/.test(id)) return true;
  if (["v_1", "v_2", "v_3", "v_4", "v_5", "v_6"].includes(id)) return true;
  if (id.startsWith("mock-") || id.startsWith("demo-") || id.includes("fictic")) return true;

  // 2. Nomes de clientes fictícios/demonstrativos conhecidos
  const client = (item.cliente || item.clientName || "").toLowerCase().trim();
  const mockClients = [
    "casa & cia",
    "construtora alfa",
    "joão da silva",
    "residencial jardins",
    "arq. mariana alves",
    "instala mais",
    "bella casa acabamentos",
    "construtora golden",
    "patrícia mendes",
    "residencial boulevard",
    "arq. lucas fernandes",
    "top instalações",
    "pisos & decor matriz",
    "construtora aliança",
    "carla beatriz ribeiro",
    "edifício royal park",
    "studio vitta arq",
    "mega colas & pisos",
    "rede central pisos",
    "construtora vanguarda",
    "silvia helena castro",
    "roberto silva residência",
    "carvalho materiais & design",
    "construtora almeida & silva",
    "marcos vinicius instalações",
    "studio arqdesign interiores",
    "eng. renato prado projetos",
    "carlos eduardo",
    "mariana silva",
    "cliente comercial",
  ];

  if (mockClients.includes(client)) {
    const num = parseInt(String(item.numeroPedido || item.pedido || "").replace(/\D/g, ""), 10);
    if (num >= 1001 && num <= 1028 && !item.followUpId && !item.metaId) {
      return true;
    }
  }

  // 3. Notas conhecidas do mock legado
  const obs = String(item.observacoes || "").toLowerCase();
  if (
    obs.includes("mostruário de revenda") ||
    obs.includes("obra corporativa edifício horizonte") ||
    obs.includes("apartamento residencial 42b") ||
    obs.includes("cronograma da obra") ||
    obs.includes("consultório de psicologia") ||
    obs.includes("reparo salão de festas") ||
    obs.includes("teste de aderência")
  ) {
    const num = parseInt(String(item.numeroPedido || item.pedido || "").replace(/\D/g, ""), 10);
    if (num >= 1001 && num <= 1028) return true;
  }

  return false;
}

// Limpeza imediata no localStorage na inicialização para remover vendas fictícias legadas
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((v: any) => !isFictitiousVenda(v));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(cleaned));
        }
      }
    }
  } catch {}
}

/**
 * Consulta a tabela de produtos cadastrados para obter custos reais.
 */
function getCadastradoProductCost(productName: string): number | null {
  try {
    const raw = localStorage.getItem("fenix_product_items_data");
    if (!raw) return null;
    const products: any[] = JSON.parse(raw);
    if (!Array.isArray(products)) return null;

    const clean = productName.toLowerCase().trim();
    const match = products.find(
      (p) =>
        p.name &&
        (p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase()))
    );
    if (match && typeof match.custo === "number" && match.custo > 0) {
      return match.custo;
    }
  } catch {}
  return null;
}

/**
 * Sincroniza dinamicamente as vendas reais cadastradas pelos usuários na aba Metas.
 * Evita duplicações e preserva custos editados pelo Diretor Éder Perez.
 */
export function syncRealSalesFromMetas(currentVendas: VendaGerencial[]): {
  mergedVendas: VendaGerencial[];
  hasChanges: boolean;
} {
  let metasSales: any[] = [];
  try {
    const raw = localStorage.getItem("fenix_metas_sales_db");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) metasSales = parsed;
    }
  } catch {}

  if (metasSales.length === 0) {
    return { mergedVendas: currentVendas, hasChanges: false };
  }

  const merged = [...currentVendas];
  let hasChanges = false;

  metasSales.forEach((sale) => {
    if (isFictitiousVenda(sale)) return;

    const numPedido = String(sale.pedido || sale.id || "")
      .replace(/^[#A-Za-z_-]+/, "")
      .trim();
    const numPuro = extrairNumeroPuroPedido(numPedido);
    const deletedSet = getDeletedVendasIds();
    if (sale.id && (deletedSet.has(sale.id) || deletedSet.has(`v_${sale.id}`) || deletedSet.has(`vnd-meta-${sale.id}`))) return;
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return;

    const clientName = (sale.cliente || "Cliente").trim();
    const seller = (sale.vendedor || sale.responsavel || sale.criadoPor || "Vanessa Gomes").trim();
    const clientType = sale.tipoCliente || "Cliente Final";
    const saleValue = Number(sale.valor) || 0;

    if (saleValue <= 0 && !clientName) return;

    const normClient = clientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const existingIndex = merged.findIndex((v) => {
      if (sale.id && (v.metaId === sale.id || v.id === `vnd-meta-${sale.id}` || v.id === sale.id)) return true;
      if (sale.orcamentoId && v.orcamentoId === sale.orcamentoId) return true;
      const vNormClient = (v.cliente || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const vCleanPed = String(v.numeroPedido || "").replace(/\D/g, "");
      const sCleanPed = numPedido.replace(/\D/g, "");
      if (vCleanPed && sCleanPed && vCleanPed === sCleanPed && vNormClient === normClient) return true;
      return false;
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const needsUpdate =
        existing.cliente !== clientName ||
        existing.vendedor !== seller ||
        existing.tipoCliente !== clientType ||
        (!existing.metaId && sale.id);

      if (needsUpdate) {
        merged[existingIndex] = {
          ...existing,
          cliente: clientName,
          vendedor: seller,
          tipoCliente: clientType,
          metaId: existing.metaId || sale.id,
        };
        hasChanges = true;
      }
    } else {
      const calcCustoProdutos = Number((saleValue * 0.6).toFixed(2));
      const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
      const { lucro, margem } = calcularLucroEMargem(saleValue, calcCustoProdutos, custosAdic);

      const newVenda: VendaGerencial = {
        id: `vnd-meta-${sale.id || Date.now()}`,
        numeroPedido: numPedido || String(Math.floor(1000 + Math.random() * 9000)),
        data: sale.data || new Date().toISOString().split("T")[0],
        cliente: clientName,
        tipoCliente: clientType,
        vendedor: seller,
        valorVenda: saleValue,
        custoProdutos: calcCustoProdutos,
        custosAdicionais: custosAdic,
        lucro,
        margem,
        statusPedido: "Concluída",
        observacoes: `Venda real cadastrada na aba Metas por ${seller}.`,
        itensResumo: "Piso Vinílico e Acessórios Fênix",
        metaId: sale.id,
        orcamentoId: sale.orcamentoId,
        createdAt: sale.data ? new Date(sale.data).toISOString() : new Date().toISOString(),
        criadoPor: sale.criadoPor || seller,
      };

      merged.unshift(newVenda);
      hasChanges = true;
    }
  });

  return { mergedVendas: merged, hasChanges };
}

/**
 * Sincroniza dinamicamente as vendas reais a partir dos registros do Follow-up com status "Vendido".
 * Não duplica vendas existentes (inclusive vindas de Metas) e preserva os custos editados por Éder Perez.
 */
export function syncRealSalesFromFollowUp(currentVendas: VendaGerencial[]): {
  mergedVendas: VendaGerencial[];
  hasChanges: boolean;
} {
  let followupItems: any[] = [];
  try {
    const raw1 = localStorage.getItem("fenix_followup_cards_v2");
    const raw2 = localStorage.getItem("fenix_followup_db");
    if (raw1) {
      const p1 = JSON.parse(raw1);
      if (Array.isArray(p1)) followupItems.push(...p1);
    }
    if (raw2) {
      const p2 = JSON.parse(raw2);
      if (Array.isArray(p2)) followupItems.push(...p2);
    }
  } catch {}

  if (followupItems.length === 0) {
    return { mergedVendas: currentVendas, hasChanges: false };
  }

  let orcamentosHistory: any[] = [];
  try {
    const rawOrc = localStorage.getItem("fenix_orcamentos_history") || localStorage.getItem("fenix_saved_orcamentos");
    if (rawOrc) {
      const p = JSON.parse(rawOrc);
      if (Array.isArray(p)) orcamentosHistory = p;
    }
  } catch {}

  const merged = [...currentVendas];
  let hasChanges = false;

  followupItems.forEach((fup) => {
    const st = (fup.status || "").trim().toLowerCase();
    if (st !== "vendido") return;
    if (isFictitiousVenda(fup)) return;

    const numPedido = String(fup.pedido || fup.numero || fup.id || "")
      .replace(/^[#A-Za-z_-]+/, "")
      .trim();
    if (!numPedido) return;

    const numPuro = extrairNumeroPuroPedido(numPedido);
    const deletedSet = getDeletedVendasIds();
    if (fup.id && (deletedSet.has(fup.id) || deletedSet.has(`vnd-fup-${fup.id}`) || deletedSet.has(`v_orc_${fup.id}`))) return;
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return;

    const clientName = (fup.cliente || fup.clientName || "Cliente").trim();
    const seller = (fup.vendedor || fup.consultoraName || fup.responsavel || fup.registeredBy || "Vanessa Gomes").trim();
    const clientType = fup.clientType || fup.tipoCliente || "Cliente Final";
    const saleValue = Number(fup.valor || fup.totalFinal || 0);

    const normClient = clientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const existingIndex = merged.findIndex((v) => {
      if (v.followUpId && v.followUpId === fup.id) return true;
      if (fup.orcamentoId && v.orcamentoId === fup.orcamentoId) return true;
      if (v.id === `vnd-fup-${fup.id}`) return true;
      if (fup.id && v.metaId === `v_orc_${fup.id}`) return true;
      const vNormClient = (v.cliente || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const vCleanPed = String(v.numeroPedido || "").replace(/\D/g, "");
      const fCleanPed = numPedido.replace(/\D/g, "");
      if (vCleanPed && fCleanPed && vCleanPed === fCleanPed && vNormClient === normClient) return true;
      return false;
    });

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      const needsUpdate =
        existing.cliente !== clientName ||
        existing.vendedor !== seller ||
        existing.tipoCliente !== clientType ||
        (!existing.followUpId && fup.id);

      if (needsUpdate) {
        merged[existingIndex] = {
          ...existing,
          cliente: clientName,
          vendedor: seller,
          tipoCliente: clientType,
          followUpId: existing.followUpId || fup.id,
          orcamentoId: existing.orcamentoId || fup.orcamentoId,
        };
        hasChanges = true;
      }
    } else {
      const matchedOrc = orcamentosHistory.find(
        (o) => o.id === fup.orcamentoId || o.id === fup.id || String(o.id).includes(numPedido)
      );

      let calcCustoProdutos = 0;
      let produtosList: VendaItemProduto[] = [];

      if (matchedOrc && Array.isArray(matchedOrc.items) && matchedOrc.items.length > 0) {
        matchedOrc.items.forEach((item: any, idx: number) => {
          const qtd = Number(item.qtd) || 1;
          const precoUnit = Number(item.precoUnitario) || 0;
          const totalItem = Number(item.total) || (qtd * precoUnit);
          const desc = item.descricao || "Item de Piso/Revestimento";

          const registeredCost = getCadastradoProductCost(desc);
          const unitCost = registeredCost !== null ? registeredCost : Number((precoUnit * 0.6).toFixed(2));
          const totalCost = Number((unitCost * qtd).toFixed(2));

          calcCustoProdutos += totalCost;
          produtosList.push({
            id: item.id || `item-${idx}`,
            produto: desc,
            quantidade: `${qtd} ${item.unidade || "un"}`,
            unidade: item.unidade || "un",
            valorUnitario: precoUnit,
            valorTotal: totalItem,
            custoUnitario: unitCost,
            custoTotal: totalCost,
          });
        });
      } else {
        calcCustoProdutos = Number((saleValue * 0.6).toFixed(2));
        produtosList = [
          {
            id: "item-1",
            produto: fup.produto || fup.nomeOrcamento || "Piso Vinílico e Acessórios Fênix",
            quantidade: "1 un",
            unidade: "un",
            valorUnitario: saleValue,
            valorTotal: saleValue,
            custoUnitario: calcCustoProdutos,
            custoTotal: calcCustoProdutos,
          },
        ];
      }

      const { totalGeral: custosAdic } = calcularCustosVariaveis(saleValue);
      const { lucro, margem } = calcularLucroEMargem(saleValue, calcCustoProdutos, custosAdic);

      const newVenda: VendaGerencial = {
        id: `vnd-fup-${fup.id}`,
        numeroPedido: numPedido,
        data: (fup.dataCadastro || fup.dataAtualizacao || new Date().toISOString()).split("T")[0],
        cliente: clientName,
        tipoCliente: clientType,
        vendedor: seller,
        valorVenda: saleValue,
        custoProdutos: calcCustoProdutos,
        custosAdicionais: custosAdic,
        lucro,
        margem,
        statusPedido: "Concluída",
        observacoes: fup.observacao || "Venda confirmada via Follow-up Comercial.",
        itensResumo: fup.produto || fup.nomeOrcamento || "Piso Vinílico e Acessórios Fênix",
        produtos: produtosList,
        orcamentoId: fup.orcamentoId,
        followUpId: fup.id,
        createdAt: fup.dataCadastro || new Date().toISOString(),
        criadoPor: seller,
      };

      merged.unshift(newVenda);
      hasChanges = true;
    }
  });

  return { mergedVendas: merged, hasChanges };
}

/**
 * Consulta todas as vendas diretamente do Supabase e localStorage,
 * consolidando as vendas reais de Metas, Follow-up ("Vendido") e CRM,
 * e garantindo a remoção completa de qualquer dado fictício ou de demonstração.
 */
export async function fetchVendasFromDatabase(): Promise<VendaGerencial[]> {
  const client = getSupabaseClient();
  let baseVendas: VendaGerencial[] = [];

  if (client) {
    try {
      const { data: row, error } = await client
        .from("fenix_kv_store")
        .select("data")
        .eq("key", VENDAS_GERENCIAL_KEY)
        .maybeSingle();

      if (!error && row && Array.isArray(row.data) && row.data.length > 0) {
        baseVendas = row.data as VendaGerencial[];
      }
    } catch (err) {
      console.warn("Erro ao consultar fenix_vendas_gerencial no Supabase:", err);
    }
  }

  if (baseVendas.length === 0) {
    const raw = localStorage.getItem(VENDAS_GERENCIAL_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseVendas = parsed;
        }
      } catch {}
    }
  }

  // 1. Filtrar rigorosamente qualquer venda fictícia / demonstração ou excluída
  const deletedSet = getDeletedVendasIds();
  const cleanedBase = baseVendas.filter((v) => {
    if (isFictitiousVenda(v)) return false;
    if (v.id && deletedSet.has(v.id)) return false;
    const numPuro = extrairNumeroPuroPedido(v.numeroPedido || "");
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return false;
    return true;
  });
  const hadFictitious = cleanedBase.length !== baseVendas.length;

  // 2. Sincroniza com as vendas reais cadastradas pelos usuários em Metas
  const { mergedVendas: withMetas, hasChanges: metasChanged } = syncRealSalesFromMetas(cleanedBase);

  // 3. Sincroniza com os registros reais do Follow-up com status "Vendido"
  const { mergedVendas: withFollowUp, hasChanges: fupChanged } = syncRealSalesFromFollowUp(withMetas);

  // 4. Verificação final de pureza: apenas vendas reais não excluídas
  const finalRealVendas = withFollowUp.filter((v) => {
    if (isFictitiousVenda(v)) return false;
    if (v.id && deletedSet.has(v.id)) return false;
    const numPuro = extrairNumeroPuroPedido(v.numeroPedido || "");
    if (numPuro && (deletedSet.has(numPuro) || deletedSet.has(`ped-${numPuro}`))) return false;
    return true;
  });

  // Persiste a lista limpa no localStorage
  localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(finalRealVendas));

  // Se houver alteração ou se havia dados fictícios no banco, atualiza o Supabase
  if (client && (hadFictitious || metasChanged || fupChanged)) {
    saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, finalRealVendas, "Éder Perez").catch(() => {});
  }

  return finalRealVendas;
}

/**
 * Consulta a lista oficial de Clientes diretamente do Supabase e sincroniza com o cache local.
 * Permite puxar instantaneamente o tipo de cliente (ex: Instalador, Construtora, Revenda, etc.),
 * ícone e cor cadastrados no módulo CLIENTES.
 */
export async function fetchClientsFromDatabase(): Promise<ClientRecord[]> {
  const client = getSupabaseClient();
  let clients: ClientRecord[] = [];

  if (client) {
    try {
      const { data: row, error } = await client
        .from("fenix_kv_store")
        .select("data")
        .eq("key", "fenix_clients_db")
        .maybeSingle();

      if (!error && row && Array.isArray(row.data) && row.data.length > 0) {
        clients = row.data as ClientRecord[];
      }
    } catch (err) {
      console.warn("Erro ao consultar fenix_clients_db no Supabase:", err);
    }
  }

  if (clients.length === 0) {
    try {
      const raw = localStorage.getItem("fenix_clients_db");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          clients = parsed;
        }
      }
    } catch {}
  }

  return clients;
}

/**
 * Salva ou atualiza uma venda gerencial no Supabase e localStorage
 */
export async function salvarVendaGerencial(
  vendaData: Partial<VendaGerencial>,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  if (!vendaData.numeroPedido || !vendaData.numeroPedido.trim()) {
    return { success: false, error: "O número do pedido é obrigatório." };
  }
  if (!vendaData.cliente || !vendaData.cliente.trim()) {
    return { success: false, error: "O nome do cliente é obrigatório." };
  }
  if (!vendaData.vendedor || !vendaData.vendedor.trim()) {
    return { success: false, error: "O vendedor responsável é obrigatório." };
  }
  if (vendaData.valorVenda === undefined || vendaData.valorVenda < 0) {
    return { success: false, error: "Informe um valor de venda válido." };
  }

  try {
    const vendas = await fetchVendasFromDatabase();
    const valorVendaNum = Number(vendaData.valorVenda) || 0;
    const custoProdutosNum = Number(vendaData.custoProdutos) || 0;
    let custosAdicionaisNum =
      vendaData.custosAdicionais !== undefined &&
      vendaData.custosAdicionais !== null &&
      !isNaN(Number(vendaData.custosAdicionais))
        ? Number(vendaData.custosAdicionais)
        : calcularCustosVariaveis(valorVendaNum).totalGeral;

    const { lucro, margem } = calcularLucroEMargem(valorVendaNum, custoProdutosNum, custosAdicionaisNum);

    const now = new Date().toISOString();
    const cleanPedido = vendaData.numeroPedido.trim().replace(/^#+/, "");
    const id = vendaData.id || `vnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const prevVenda = vendas.find((v) => v.id === id || v.numeroPedido === cleanPedido);
    const historicoList: VendaHistoricoEntry[] = [...(prevVenda?.historico || [])];

    if (prevVenda) {
      const cProdChanged = prevVenda.custoProdutos !== custoProdutosNum;
      const cAddChanged = prevVenda.custosAdicionais !== custosAdicionaisNum;
      if (cProdChanged || cAddChanged) {
        historicoList.unshift({
          id: `hist-${Date.now()}`,
          data: new Date().toLocaleDateString("pt-BR"),
          hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          usuario,
          acao: "Custos atualizados",
          detalhes: `Custo produtos: R$ ${custoProdutosNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Custos adicionais: R$ ${custosAdicionaisNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Novo Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%)`,
          timestamp: Date.now(),
        });
      }
    } else {
      historicoList.push({
        id: `hist-${Date.now()}`,
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        usuario,
        acao: "Venda cadastrada",
        detalhes: `Venda #${cleanPedido} cadastrada por ${usuario}.`,
        timestamp: Date.now(),
      });
    }

    const fullVenda: VendaGerencial = {
      id,
      numeroPedido: cleanPedido,
      data: vendaData.data || now.split("T")[0],
      cliente: vendaData.cliente.trim(),
      clienteId: vendaData.clienteId || prevVenda?.clienteId,
      tipoCliente: vendaData.tipoCliente || prevVenda?.tipoCliente || "Cliente Final",
      vendedor: vendaData.vendedor.trim(),
      vendedorId: vendaData.vendedorId || prevVenda?.vendedorId,
      valorVenda: valorVendaNum,
      custoProdutos: custoProdutosNum,
      custosAdicionais: custosAdicionaisNum,
      lucro,
      margem,
      observacoes: vendaData.observacoes?.trim() || prevVenda?.observacoes || undefined,
      detalhesCustosAdicionais: vendaData.detalhesCustosAdicionais?.trim() || prevVenda?.detalhesCustosAdicionais || undefined,
      itensResumo: vendaData.itensResumo?.trim() || prevVenda?.itensResumo || undefined,
      produtos: vendaData.produtos || prevVenda?.produtos || undefined,
      statusPedido: vendaData.statusPedido || prevVenda?.statusPedido || "Concluída",
      orcamentoId: vendaData.orcamentoId || prevVenda?.orcamentoId,
      followUpId: vendaData.followUpId || prevVenda?.followUpId,
      historico: historicoList,
      createdAt: vendaData.createdAt || prevVenda?.createdAt || now,
      updatedAt: now,
      criadoPor: vendaData.criadoPor || prevVenda?.criadoPor || usuario,
    };

    const idx = vendas.findIndex((v) => v.id === id || v.numeroPedido === cleanPedido);
    let updatedList: VendaGerencial[];
    if (idx >= 0) {
      updatedList = vendas.map((v, i) => (i === idx ? fullVenda : v));
    } else {
      updatedList = [fullVenda, ...vendas];
    }

    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));
    const saveRes = await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    if (!saveRes.success) {
      console.warn("Salvo localmente, erro ao persistir no Supabase:", saveRes.error);
    }

    dispatchCollectionEvents("fenix_vendas_gerencial");
    return { success: true, venda: fullVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao salvar venda." };
  }
}

/**
 * Atualização exclusiva de Custos (Custo dos Produtos e Custos Adicionais)
 * permitida SOMENTE para Éder Perez (Diretor).
 */
export async function atualizarCustosVenda(
  vendaId: string,
  novoCustoProdutos: number,
  novosCustosAdicionais: number,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada." };
    }

    const cProd = Number(novoCustoProdutos) || 0;
    const cAdd = Number(novosCustosAdicionais) || 0;
    const { lucro, margem } = calcularLucroEMargem(venda.valorVenda, cProd, cAdd);

    const now = new Date();
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Edição de custos (Diretor)",
      detalhes: `Custo produtos alterado de R$ ${venda.custoProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ ${cProd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Custos adicionais de R$ ${venda.custosAdicionais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ ${cAdd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Novo Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%).`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      custoProdutos: cProd,
      custosAdicionais: cAdd,
      lucro,
      margem,
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar custos." };
  }
}

/**
 * Atualização completa e dinâmica de Custos por Tipo:
 * Produto, Nota Fiscal, Taxa de Pagamento, Frete, Comercial, Desconto, Operacional e Outros.
 * Permite adicionar, editar e remover itens de custo.
 * Recalcula imediatamente: Custo Total → Lucro → Margem.
 * Restrito exclusivamente ao Diretor Éder Perez.
 */
export async function atualizarCustosCompletosVenda(
  vendaId: string,
  novosCustosItens: VendaCustoItem[],
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada no banco de dados." };
    }

    const { custoTotal, custoProdutos, custosAdicionais, lucro, margem } = recalcularCustosELucro(
      venda.valorVenda,
      novosCustosItens
    );

    const now = new Date();
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Edição de custos do pedido (Éder Perez)",
      detalhes: `Custos redefinidos por ${usuario}. Custo Total: R$ ${custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Lucro: R$ ${lucro.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${margem}%). Itens de custo: ${novosCustosItens.length}`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      custosItens: novosCustosItens,
      custoTotal,
      custoProdutos,
      custosAdicionais,
      lucro,
      margem,
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar custos do pedido." };
  }
}

/**
 * Cancelamento formal de venda gerencial (sem exclusão física do registro).
 * Mantém o histórico com motivo e data de cancelamento.
 */
export async function cancelarVendaGerencial(
  vendaId: string,
  motivo: string,
  usuario: string
): Promise<{ success: boolean; error?: string; venda?: VendaGerencial }> {
  try {
    const vendas = await fetchVendasFromDatabase();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) {
      return { success: false, error: "Venda não encontrada para cancelamento." };
    }

    const now = new Date();
    const cleanMotivo = motivo.trim() || "Venda cancelada a pedido da administração.";
    const newEntry: VendaHistoricoEntry = {
      id: `hist-${Date.now()}`,
      data: now.toLocaleDateString("pt-BR"),
      hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      usuario,
      acao: "Venda Cancelada",
      detalhes: `Cancelada por ${usuario}. Motivo: ${cleanMotivo}`,
      timestamp: now.getTime(),
    };

    const updatedVenda: VendaGerencial = {
      ...venda,
      statusPedido: "Cancelada",
      motivoCancelamento: cleanMotivo,
      dataCancelamento: now.toISOString(),
      updatedAt: now.toISOString(),
      historico: [newEntry, ...(venda.historico || [])],
    };

    const updatedList = vendas.map((v) => (v.id === vendaId ? updatedVenda : v));
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updatedList));

    await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updatedList, usuario);
    dispatchCollectionEvents("fenix_vendas_gerencial");

    return { success: true, venda: updatedVenda };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao cancelar venda." };
  }
}

/**
 * Exclui uma venda permanentemente do Supabase e localStorage.
 * Registra o ID nos excluídos e atualiza as coleções vinculadas.
 */
export async function excluirVendaGerencial(
  vendaId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = String(vendaId);
    const vendas = await fetchVendasFromDatabase();
    const vendaToDelete = vendas.find((v) => v.id === targetId);

    await addDeletedVendaId(targetId, usuario);
    if (vendaToDelete?.numeroPedido) {
      await addDeletedVendaId(extrairNumeroPuroPedido(vendaToDelete.numeroPedido), usuario);
      await addDeletedVendaId(vendaToDelete.numeroPedido, usuario);
    }
    if (vendaToDelete?.metaId) {
      await addDeletedVendaId(vendaToDelete.metaId, usuario);
    }
    if (vendaToDelete?.followUpId) {
      await addDeletedVendaId(vendaToDelete.followUpId, usuario);
    }

    const updated = vendas.filter((v) => v.id !== targetId);
    localStorage.setItem(VENDAS_GERENCIAL_KEY, JSON.stringify(updated));

    const saveRes = await saveWholeCollectionToSupabase(VENDAS_GERENCIAL_KEY, updated, usuario);
    if (!saveRes.success) {
      console.warn("Erro ao excluir venda no Supabase:", saveRes.error);
    }

    // Também remove de fenix_metas_sales_db e fenix_metas_db se existente
    try {
      const numPuro = vendaToDelete ? extrairNumeroPuroPedido(vendaToDelete.numeroPedido) : "";
      ['fenix_metas_sales_db', 'fenix_metas_db'].forEach((key) => {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((m: any) => {
                if (m.id === targetId || m.id === `v_${targetId}` || `v_${m.id}` === targetId) return false;
                if (numPuro && extrairNumeroPuroPedido(m.pedido || "") === numPuro) return false;
                return true;
              });
              if (filtered.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
                saveWholeCollectionToSupabase(key, filtered, usuario).catch(() => {});
              }
            }
          } catch {}
        }
      });
    } catch {}

    dispatchCollectionEvents("fenix_vendas_gerencial");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao excluir venda." };
  }
}

/**
 * Procura orçamentos fechados nos orçamentos salvos e histórico para puxar para Vendas
 */
export function buscarOrcamentosFechadosParaImportar(): Array<{
  id: string;
  numero: string;
  cliente: string;
  tipoCliente: string;
  vendedor: string;
  valor: number;
  data: string;
  itens: string;
  produtos: VendaItemProduto[];
}> {
  const list: Array<{
    id: string;
    numero: string;
    cliente: string;
    tipoCliente: string;
    vendedor: string;
    valor: number;
    data: string;
    itens: string;
    produtos: VendaItemProduto[];
  }> = [];

  const rawSaved = localStorage.getItem("fenix_saved_orcamentos");
  const rawHistory = localStorage.getItem("fenix_orcamentos_history");

  const allOrcs: any[] = [];
  if (rawSaved) {
    try {
      const p = JSON.parse(rawSaved);
      if (Array.isArray(p)) allOrcs.push(...p);
    } catch {}
  }
  if (rawHistory) {
    try {
      const p = JSON.parse(rawHistory);
      if (Array.isArray(p)) allOrcs.push(...p);
    } catch {}
  }

  allOrcs.forEach((orc) => {
    const st = (orc.status || orc.situacao || "").toLowerCase();
    const isClosed = st.includes("fech") || st.includes("aprov") || st.includes("vend") || st.includes("ganh");
    if (isClosed && (orc.valorTotal || orc.totalFinal || orc.totalGeral || orc.valor)) {
      const val = Number(orc.valorTotal || orc.totalFinal || orc.totalGeral || orc.valor) || 0;
      const num = String(orc.numero || orc.codigo || orc.id || "").replace(/\D/g, "").slice(-4) || "ORC";

      const prods: VendaItemProduto[] = [];
      if (Array.isArray(orc.items)) {
        orc.items.forEach((it: any, idx: number) => {
          const qtd = Number(it.qtd) || 1;
          const preco = Number(it.precoUnitario) || 0;
          const cost = getCadastradoProductCost(it.descricao || "") || Number((preco * 0.6).toFixed(2));
          prods.push({
            id: it.id || `it-${idx}`,
            produto: it.descricao || "Produto Fênix",
            quantidade: `${qtd} ${it.unidade || "un"}`,
            unidade: it.unidade || "un",
            valorUnitario: preco,
            valorTotal: Number(it.total) || (qtd * preco),
            custoUnitario: cost,
            custoTotal: Number((cost * qtd).toFixed(2)),
          });
        });
      }

      list.push({
        id: orc.id || `imp-${Math.random().toString(36)}`,
        numero: num,
        cliente: orc.clientName || orc.clienteNome || orc.cliente || orc.nomeCliente || "Cliente Fênix",
        tipoCliente: orc.clientType || "Cliente Final",
        vendedor: orc.consultoraName || orc.vendedor || orc.consultor || "Vanessa Gomes",
        valor: val,
        data: orc.dataCriacao || orc.savedAt || orc.data || new Date().toISOString().split("T")[0],
        itens: orc.items?.[0]?.descricao || orc.produtoNome || orc.descricao || "Piso Vinílico e Acessórios Fênix",
        produtos: prods,
      });
    }
  });

  return list;
}
