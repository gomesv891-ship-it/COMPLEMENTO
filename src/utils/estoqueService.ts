import { EstoqueItem, MovimentacaoEstoque, EstoqueStatus, TipoMovimentacaoEstoque } from '../types';
import { getSupabaseClient, saveWholeCollectionToSupabase, dispatchCollectionEvents } from './supabaseClient';
import { OFFICIAL_PRODUCTS, OFFICIAL_CATEGORIES, OFFICIAL_GROUPS } from '../data/databaseSeed';
import { ProductCategory, ProductGroup, GroupProductItem } from '../data/initialProductsSeed';
import { sendUserNotification } from './notifications';

export const ESTOQUE_ITEMS_KEY = 'fenix_estoque_items';
export const ESTOQUE_MOVIMENTACOES_KEY = 'fenix_estoque_movimentacoes';
export const ESTOQUE_CATEGORIES_KEY = 'fenix_estoque_categories';
export const ESTOQUE_GROUPS_KEY = 'fenix_estoque_groups';
export const PRODUCT_ITEMS_KEY = 'fenix_product_items_data';
export const PRODUCT_CATEGORIES_KEY = 'fenix_product_categories_data';
export const PRODUCT_GROUPS_KEY = 'fenix_product_groups_data';

/**
 * Cálculo automático de status conforme solicitado:
 * - Normal: Estoque dentro do ideal (> estoqueMinimo * 1.2)
 * - Atenção: Próximo do estoque mínimo (entre estoqueMinimo e estoqueMinimo * 1.2)
 * - Estoque baixo: Abaixo do estoque mínimo (> 0 e < estoqueMinimo)
 * - Sem estoque: Produto zerado (<= 0)
 */
export function calculateEstoqueStatus(estoqueAtual: number, estoqueMinimo = 10): EstoqueStatus {
  if (estoqueAtual <= 0) {
    return 'Sem estoque';
  }
  if (estoqueMinimo > 0 && estoqueAtual < estoqueMinimo) {
    return 'Estoque baixo';
  }
  if (estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo * 1.2) {
    return 'Atenção';
  }
  return 'Normal';
}

/**
 * Gera código estável baseado na categoria e nome do produto (PV001, RP001, etc.)
 */
export function generateProductCode(
  item: { name?: string; categoryName?: string; categoryId?: string },
  index: number
): string {
  const cat = (item.categoryName || '').toUpperCase();
  const name = (item.name || '').toUpperCase();
  let prefix = 'PV';

  if (cat.includes('PISO') || name.includes('PISO') || name.includes('FLEXFLOOR') || name.includes('VINILFORTE')) {
    prefix = 'PV';
  } else if (cat.includes('MANTA') || name.includes('MANTA')) {
    prefix = 'MH';
  } else if (cat.includes('AUTONIVELANTE') || name.includes('AUTONIVELANTE') || name.includes('MASSA')) {
    prefix = 'AU';
  } else if (cat.includes('PRIMER') || name.includes('PRIMER')) {
    prefix = 'PR';
  } else if (cat.includes('COLA PARA RODAPÉ') || name.includes('COLA PARA RODAPÉ')) {
    prefix = 'CR';
  } else if (cat.includes('COLA') || name.includes('COLA') || name.includes('ADESIVO')) {
    prefix = 'CL';
  } else if (cat.includes('POLIESTIRENO') || name.includes('RODAPÉ POLI') || name.includes('RODAPE POLI')) {
    prefix = 'RP';
  } else if (cat.includes('MDF') || name.includes('RODAPÉ MDF') || name.includes('RODAPE MDF')) {
    prefix = 'RM';
  } else if (cat.includes('RIPADO') || name.includes('RIPADO')) {
    prefix = 'RI';
  } else {
    prefix = 'AC';
  }

  const num = String(index + 1).padStart(3, '0');
  return `${prefix}${num}`;
}

/**
 * Detecta marca a partir do nome do produto
 */
export function detectProductBrand(name: string): string {
  const upper = (name || '').toUpperCase();
  if (upper.includes('FLEXFLOOR')) return 'Flexfloor';
  if (upper.includes('VINILFORTE')) return 'Vinilforte';
  if (upper.includes('TARKETT')) return 'Tarkett';
  if (upper.includes('VEXA')) return 'Vexa';
  if (upper.includes('FÊNIX FIX') || upper.includes('FENIX FIX')) return 'Fênix Fix';
  if (upper.includes('FÊNIX') || upper.includes('FENIX')) return 'Fênix';
  if (upper.includes('ULTRA FIX')) return 'Ultra Fix';
  if (upper.includes('SANTA LUZIA')) return 'Santa Luzia';
  if (upper.includes('DURAFLOOR') || upper.includes('DURAGRID')) return 'Durafloor';
  if (upper.includes('QUICK-STEP') || upper.includes('QUICK STEP')) return 'Quick-Step';
  if (upper.includes('EUCATEX')) return 'Eucatex';
  return 'Fênix';
}

/**
 * Identifica e bloqueia itens de estoque fictícios, de demonstração ou importados
 * automaticamente do catálogo de produtos.
 * O controle de estoque é 100% MANUAL e inicia completamente vazio.
 */
export function isFictitiousOrAutoEstoqueItem(it: any): boolean {
  if (!it) return true;
  const id = String(it.id || '').trim();

  // IDs gerados automaticamente a partir do catálogo de produtos
  if (id.startsWith('est-prod-') || id.startsWith('prod-') || id.startsWith('mock-') || id.startsWith('demo-')) {
    return true;
  }

  // Se não foi explicitamente cadastrado de forma manual
  if (!it.manual && !id.startsWith('est-manual-')) {
    return true;
  }

  return false;
}

/**
 * Consulta catálogo oficial de produtos (banco de dados Supabase / cache local)
 */
export async function fetchCatalogProducts(): Promise<GroupProductItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: row } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', PRODUCT_ITEMS_KEY)
        .maybeSingle();

      if (row && Array.isArray(row.data) && row.data.length > 0) {
        localStorage.setItem(PRODUCT_ITEMS_KEY, JSON.stringify(row.data));
        return row.data as GroupProductItem[];
      }
    } catch (e) {
      console.warn('Erro ao consultar produtos no Supabase:', e);
    }
  }

  const local = localStorage.getItem(PRODUCT_ITEMS_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }

  return OFFICIAL_PRODUCTS;
}

/**
 * Consulta categorias de Estoque (100% independentes da aba Produtos)
 */
export async function fetchCategoriasFromDatabase(): Promise<ProductCategory[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: row } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', ESTOQUE_CATEGORIES_KEY)
        .maybeSingle();

      if (row && Array.isArray(row.data)) {
        localStorage.setItem(ESTOQUE_CATEGORIES_KEY, JSON.stringify(row.data));
        return row.data as ProductCategory[];
      }
    } catch (e) {
      console.warn('Erro ao consultar categorias de estoque no Supabase:', e);
    }
  }

  const local = localStorage.getItem(ESTOQUE_CATEGORIES_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return [];
}

/**
 * Consulta grupos de Estoque (100% independentes da aba Produtos)
 */
export async function fetchGruposFromDatabase(): Promise<ProductGroup[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: row } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', ESTOQUE_GROUPS_KEY)
        .maybeSingle();

      if (row && Array.isArray(row.data)) {
        localStorage.setItem(ESTOQUE_GROUPS_KEY, JSON.stringify(row.data));
        return row.data as ProductGroup[];
      }
    } catch (e) {
      console.warn('Erro ao consultar grupos de estoque no Supabase:', e);
    }
  }

  const local = localStorage.getItem(ESTOQUE_GROUPS_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return [];
}

/**
 * Salva categoria de Estoque no Supabase
 */
export async function salvarCategoriaNoBanco(
  categoria: ProductCategory,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const list = await fetchCategoriasFromDatabase();
    const idx = list.findIndex((c) => c.id === categoria.id);
    let updated: ProductCategory[];
    if (idx >= 0) {
      updated = list.map((c, i) => (i === idx ? categoria : c));
    } else {
      updated = [...list, categoria];
    }

    localStorage.setItem(ESTOQUE_CATEGORIES_KEY, JSON.stringify(updated));
    const res = await saveWholeCollectionToSupabase(ESTOQUE_CATEGORIES_KEY, updated, usuario);
    dispatchCollectionEvents('fenix_estoque_categories_updated');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar categoria.' };
  }
}

/**
 * Exclui categoria de Estoque do Supabase
 */
export async function excluirCategoriaDoBanco(
  categoriaId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const list = await fetchCategoriasFromDatabase();
    const updated = list.filter((c) => c.id !== categoriaId);
    localStorage.setItem(ESTOQUE_CATEGORIES_KEY, JSON.stringify(updated));
    const res = await saveWholeCollectionToSupabase(ESTOQUE_CATEGORIES_KEY, updated, usuario);
    dispatchCollectionEvents('fenix_estoque_categories_updated');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir categoria.' };
  }
}

/**
 * Salva grupo de Estoque no Supabase
 */
export async function salvarGrupoNoBanco(
  grupo: ProductGroup,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const list = await fetchGruposFromDatabase();
    const idx = list.findIndex((g) => g.id === grupo.id);
    let updated: ProductGroup[];
    if (idx >= 0) {
      updated = list.map((g, i) => (i === idx ? grupo : g));
    } else {
      updated = [...list, grupo];
    }

    localStorage.setItem(ESTOQUE_GROUPS_KEY, JSON.stringify(updated));
    const res = await saveWholeCollectionToSupabase(ESTOQUE_GROUPS_KEY, updated, usuario);
    dispatchCollectionEvents('fenix_estoque_groups_updated');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar grupo.' };
  }
}

/**
 * Exclui grupo de Estoque do Supabase
 */
export async function excluirGrupoDoBanco(
  grupoId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const list = await fetchGruposFromDatabase();
    const updated = list.filter((g) => g.id !== grupoId);
    localStorage.setItem(ESTOQUE_GROUPS_KEY, JSON.stringify(updated));
    const res = await saveWholeCollectionToSupabase(ESTOQUE_GROUPS_KEY, updated, usuario);
    dispatchCollectionEvents('fenix_estoque_groups_updated');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir grupo.' };
  }
}

/**
 * CONSULTA DE ITENS DE ESTOQUE DIRETAMENTE DO SUPABASE / STORAGE
 * Regra estrita: O Controle de Estoque deve ser 100% MANUAL.
 * NÃO puxar produtos, quantidades ou movimentações da aba Produtos.
 * NÃO puxar estoque de pedidos ou vendas.
 * NÃO criar estoque ou movimentações automaticamente.
 * NÃO criar dados fictícios ou de demonstração.
 * Iniciar a tela de Estoque completamente vazia, sem produtos.
 * Produtos e quantidades somente poderão aparecer após cadastro/lançamento manual pelo usuário.
 */
export async function fetchEstoqueFromDatabase(): Promise<EstoqueItem[]> {
  const client = getSupabaseClient();
  let dbItems: EstoqueItem[] | null = null;

  if (client) {
    try {
      const { data: row } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', ESTOQUE_ITEMS_KEY)
        .maybeSingle();

      if (row && Array.isArray(row.data)) {
        dbItems = (row.data as EstoqueItem[]).filter((it) => !isFictitiousOrAutoEstoqueItem(it));
      }
    } catch (err) {
      console.warn('Erro ao consultar fenix_estoque_items:', err);
    }
  }

  if (!dbItems) {
    const local = localStorage.getItem(ESTOQUE_ITEMS_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          dbItems = parsed.filter((it: any) => !isFictitiousOrAutoEstoqueItem(it));
        }
      } catch {}
    }
  }

  const cleanItems: EstoqueItem[] = (dbItems || []).map((it) => {
    const currentStock = Number(it.estoqueAtual) || 0;
    const minStock = Number(it.estoqueMinimo) || 10;
    return {
      ...it,
      estoqueAtual: currentStock,
      estoqueMinimo: minStock,
      status: calculateEstoqueStatus(currentStock, minStock),
      manual: true,
    };
  });

  localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(cleanItems));
  return cleanItems;
}

/**
 * CADASTRO 100% MANUAL DE NOVO PRODUTO NO ESTOQUE
 * Permite ao usuário cadastrar produtos e definir quantidades iniciais manualmente.
 */
export async function cadastrarItemEstoqueManual(
  itemData: {
    produto: string;
    codigo?: string;
    marca?: string;
    categoria?: string;
    grupo?: string;
    unidade?: string;
    estoqueAtual?: number;
    estoqueMinimo?: number;
    observacoes?: string;
  },
  usuario: string
): Promise<{ success: boolean; error?: string; item?: EstoqueItem }> {
  if (!itemData.produto || !itemData.produto.trim()) {
    return { success: false, error: 'O nome do produto é obrigatório.' };
  }

  try {
    const items = await fetchEstoqueFromDatabase();
    const existing = items.find(
      (i) =>
        i.produto.trim().toLowerCase() === itemData.produto.trim().toLowerCase() ||
        (itemData.codigo && i.codigo && i.codigo.trim().toLowerCase() === itemData.codigo.trim().toLowerCase())
    );

    if (existing) {
      return { success: false, error: 'Já existe um produto no estoque com este nome ou código.' };
    }

    const cleanCodigo = itemData.codigo?.trim() || `EST-${String(items.length + 1).padStart(3, '0')}`;
    const estoqueAtualNum = Number(itemData.estoqueAtual) || 0;
    const estoqueMinimoNum = Number(itemData.estoqueMinimo) || 10;
    const status = calculateEstoqueStatus(estoqueAtualNum, estoqueMinimoNum);
    const now = new Date().toISOString();

    const newItem: EstoqueItem = {
      id: `est-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      produto: itemData.produto.trim(),
      codigo: cleanCodigo,
      marca: itemData.marca?.trim() || 'Fênix',
      categoria: itemData.categoria?.trim() || 'Geral',
      grupo: itemData.grupo?.trim() || 'SEM GRUPO',
      unidade: itemData.unidade?.trim() || 'm²',
      estoqueAtual: estoqueAtualNum,
      estoqueMinimo: estoqueMinimoNum,
      status,
      observacoes: itemData.observacoes?.trim() || '',
      createdAt: now,
      updatedAt: now,
      manual: true,
    };

    const updatedList = [newItem, ...items];
    localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(updatedList));
    await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, updatedList, usuario);
    dispatchCollectionEvents('fenix_estoque_items');

    // Se informou estoque inicial > 0, registra a movimentação de saldo inicial manual
    if (estoqueAtualNum > 0) {
      const nowDt = new Date();
      const d = String(nowDt.getDate()).padStart(2, '0');
      const m = String(nowDt.getMonth() + 1).padStart(2, '0');
      const y = nowDt.getFullYear();
      const h = `${String(nowDt.getHours()).padStart(2, '0')}:${String(nowDt.getMinutes()).padStart(2, '0')}`;

      const movInicial: MovimentacaoEstoque = {
        id: `mov-init-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        estoqueItemId: newItem.id,
        produtoNome: newItem.produto,
        codigoProduto: newItem.codigo,
        tipo: 'ENTRADA',
        subtipo: 'Outro',
        quantidade: estoqueAtualNum,
        unidade: newItem.unidade,
        data: `${y}-${m}-${d}`,
        hora: h,
        saldoAnterior: 0,
        saldoPosterior: estoqueAtualNum,
        observacao: 'Saldo inicial lançado manualmente no cadastro do produto.',
        usuario,
        createdAt: now,
      };

      const existingMovs = await fetchMovimentacoesFromDatabase();
      const updatedMovs = [movInicial, ...existingMovs];
      localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));
      await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, usuario);
      dispatchCollectionEvents('fenix_estoque_movimentacoes');
    }

    return { success: true, item: newItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao cadastrar produto no estoque.' };
  }
}

/**
 * Consulta movimentações diretamente do Supabase
 */
export async function fetchMovimentacoesFromDatabase(): Promise<MovimentacaoEstoque[]> {
  const sortNewestFirst = (list: MovimentacaoEstoque[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: row } = await client
        .from('fenix_kv_store')
        .select('data')
        .eq('key', ESTOQUE_MOVIMENTACOES_KEY)
        .maybeSingle();

      if (row && Array.isArray(row.data)) {
        const sorted = sortNewestFirst(row.data as MovimentacaoEstoque[]);
        localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(sorted));
        return sorted;
      }
    } catch (e) {
      console.warn('Erro ao consultar fenix_estoque_movimentacoes:', e);
    }
  }

  const local = localStorage.getItem(ESTOQUE_MOVIMENTACOES_KEY);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return sortNewestFirst(parsed);
    } catch {}
  }

  return [];
}

/**
 * Formata data e hora para exibição
 */
function formatDateTime(inputDate?: string, inputTime?: string): { formatted: string; iso: string } {
  const now = new Date();
  let dStr = inputDate;
  if (!dStr) {
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    dStr = `${d}/${m}/${y}`;
  } else if (dStr.includes('-')) {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      dStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  const hStr =
    inputTime ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    formatted: `${dStr} ${hStr}`,
    iso: now.toISOString(),
  };
}

/**
 * Item individual para entrada múltipla
 */
export interface EntradaItemPayload {
  produtoId: string;
  quantidade: number;
  unidade?: string;
}

/**
 * REGISTRAR ENTRADA NO ESTOQUE (Compra, Devolução, Outro)
 * Suporta múltiplos produtos simultâneos (conforme o modal do espelho visual) ou produto único.
 * A quantidade informada é adicionada ao estoque atual.
 */
export async function registrarEntradaEstoque(params: {
  itens: EntradaItemPayload[];
  subtipo?: 'Compra' | 'Devolução' | 'Outro';
  data: string;
  hora?: string;
  fornecedor?: string;
  observacao?: string;
  usuario: string;
}): Promise<{ success: boolean; error?: string; movsCriadas?: MovimentacaoEstoque[] }> {
  if (!params.itens || params.itens.length === 0) {
    return { success: false, error: 'Adicione pelo menos um produto na entrada.' };
  }

  for (const it of params.itens) {
    if (!it.produtoId) return { success: false, error: 'Selecione o produto.' };
    if (!it.quantidade || it.quantidade <= 0) {
      return { success: false, error: 'A quantidade de todos os itens deve ser maior que zero.' };
    }
  }

  try {
    const items = await fetchEstoqueFromDatabase();
    const existingMovs = await fetchMovimentacoesFromDatabase();
    const { formatted, iso } = formatDateTime(params.data, params.hora);
    const newMovs: MovimentacaoEstoque[] = [];

    const subtipoText = params.subtipo || 'Compra';

    for (const itemPayload of params.itens) {
      const idx = items.findIndex((it) => it.id === itemPayload.produtoId);
      if (idx === -1) continue;

      const item = items[idx];
      const saldoAnterior = Number(item.estoqueAtual) || 0;
      const novoSaldo = Number((saldoAnterior + Number(itemPayload.quantidade)).toFixed(2));
      const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);

      const descMov = `${formatted} — Entrada (${subtipoText}) (+${itemPayload.quantidade} ${item.unidade})`;

      items[idx] = {
        ...item,
        estoqueAtual: novoSaldo,
        status,
        ultimaMovimentacao: descMov,
        ultimaMovimentacaoTipo: 'ENTRADA',
        fornecedor: params.fornecedor || item.fornecedor,
        updatedAt: iso,
      };

      const mov: MovimentacaoEstoque = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        estoqueItemId: item.id,
        produtoNome: item.produto,
        codigoProduto: item.codigo,
        tipo: 'ENTRADA',
        subtipo: subtipoText,
        quantidade: Number(itemPayload.quantidade),
        unidade: item.unidade,
        data: params.data,
        hora: formatted.split(' ')[1] || '12:00',
        fornecedor: params.fornecedor?.trim() || undefined,
        observacao:
          params.observacao?.trim() ||
          `Entrada (${subtipoText})${params.fornecedor ? ` — Fornecedor: ${params.fornecedor}` : ''}`,
        saldoAnterior,
        saldoPosterior: novoSaldo,
        usuario: params.usuario,
        createdAt: iso,
      };

      newMovs.push(mov);
    }

    const updatedMovs = [...newMovs, ...existingMovs];

    // Salvar coleções atualizadas no Supabase
    const saveItems = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, params.usuario);
    if (!saveItems.success) return { success: false, error: saveItems.error };

    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, params.usuario);

    localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));

    dispatchCollectionEvents('fenix_estoque_items');
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    // Notificar no sino para toda Entrada de estoque (mostrando produto, quantidade e tipo)
    for (const mov of newMovs) {
      try {
        sendUserNotification({
          category: 'Estoque',
          title: `Entrada de Estoque: ${mov.produtoNome}`,
          description: `Entrada (+${mov.quantidade} ${mov.unidade}) registrada no produto "${mov.produtoNome}". Tipo: ${mov.subtipo || 'Entrada'}. Saldo atual: ${mov.saldoPosterior} ${mov.unidade}.`,
          targetTab: 'Estoque',
          recipientName: params.usuario || 'Todos',
          authorName: params.usuario || 'Controle de Estoque',
          metadata: {
            tipoMovimentacao: 'ENTRADA',
            subtipo: mov.subtipo,
            produtoNome: mov.produtoNome,
            quantidade: mov.quantidade,
            unidade: mov.unidade,
            saldoPosterior: mov.saldoPosterior,
            estoqueItemId: mov.estoqueItemId,
          },
        });
      } catch (notifErr) {
        console.warn('Erro ao disparar notificação de entrada de estoque:', notifErr);
      }
    }

    return { success: true, movsCriadas: newMovs };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar entrada.' };
  }
}

/**
 * REGISTRAR SAÍDA — VENDA
 * Permite registrar: Produto, Quantidade, Venda/pedido relacionado, Data, Observação.
 * Decrementa a quantidade informada do estoque atual.
 */
export async function registrarSaidaVendaEstoque(params: {
  produtoId: string;
  quantidade: number;
  vendaOrcamentoRelacionado?: string;
  clienteNome?: string;
  data: string;
  hora?: string;
  observacao?: string;
  usuario: string;
}): Promise<{ success: boolean; error?: string; novoSaldo?: number; itemAtualizado?: EstoqueItem }> {
  if (!params.produtoId) return { success: false, error: 'Selecione o produto.' };
  if (!params.quantidade || params.quantidade <= 0) {
    return { success: false, error: 'A quantidade de saída deve ser maior que zero.' };
  }

  try {
    const items = await fetchEstoqueFromDatabase();
    const movs = await fetchMovimentacoesFromDatabase();

    const idx = items.findIndex((it) => it.id === params.produtoId);
    if (idx === -1) return { success: false, error: 'Produto não encontrado no estoque.' };

    const item = items[idx];
    const saldoAnterior = Number(item.estoqueAtual) || 0;
    const novoSaldo = Number(Math.max(0, saldoAnterior - Number(params.quantidade)).toFixed(2));
    const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);

    const { formatted, iso } = formatDateTime(params.data, params.hora);
    const refText = params.vendaOrcamentoRelacionado ? ` (Pedido ${params.vendaOrcamentoRelacionado})` : '';
    const descMov = `${formatted} — Saída Venda${refText} (-${params.quantidade} ${item.unidade})`;

    const updatedItem: EstoqueItem = {
      ...item,
      estoqueAtual: novoSaldo,
      status,
      ultimaMovimentacao: descMov,
      ultimaMovimentacaoTipo: 'SAIDA_VENDA',
      updatedAt: iso,
    };

    items[idx] = updatedItem;

    const novaMovimentacao: MovimentacaoEstoque = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      estoqueItemId: item.id,
      produtoNome: item.produto,
      codigoProduto: item.codigo,
      tipo: 'SAIDA_VENDA',
      subtipo: 'Venda',
      quantidade: Number(params.quantidade),
      unidade: item.unidade,
      data: params.data,
      hora: formatted.split(' ')[1] || '12:00',
      vendaOrcamentoRelacionado: params.vendaOrcamentoRelacionado?.trim() || undefined,
      clienteNome: params.clienteNome?.trim() || undefined,
      observacao:
        params.observacao?.trim() ||
        `Saída para venda ${params.vendaOrcamentoRelacionado || ''} ${params.clienteNome ? `(${params.clienteNome})` : ''}`.trim(),
      saldoAnterior,
      saldoPosterior: novoSaldo,
      usuario: params.usuario,
      createdAt: iso,
    };

    const updatedMovs = [novaMovimentacao, ...movs];

    const saveItemsRes = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, params.usuario);
    if (!saveItemsRes.success) return { success: false, error: saveItemsRes.error };

    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, params.usuario);

    localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));

    dispatchCollectionEvents('fenix_estoque_items');
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    // Notificar no sino para Saída de Venda (mostrando produto, quantidade e tipo)
    try {
      sendUserNotification({
        category: 'Estoque',
        title: `Saída de Estoque (Venda): ${novaMovimentacao.produtoNome}`,
        description: `Saída (-${novaMovimentacao.quantidade} ${novaMovimentacao.unidade}) por Venda registrada no produto "${novaMovimentacao.produtoNome}". Saldo atual: ${novoSaldo} ${item.unidade}.`,
        targetTab: 'Estoque',
        recipientName: params.usuario || 'Todos',
        authorName: params.usuario || 'Controle de Estoque',
        metadata: {
          tipoMovimentacao: 'SAIDA_VENDA',
          subtipo: 'Venda',
          produtoNome: novaMovimentacao.produtoNome,
          quantidade: novaMovimentacao.quantidade,
          unidade: novaMovimentacao.unidade,
          saldoPosterior: novoSaldo,
          estoqueItemId: item.id,
        },
      });
    } catch (notifErr) {
      console.warn('Erro ao disparar notificação de saída de estoque:', notifErr);
    }

    return { success: true, novoSaldo, itemAtualizado: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar saída por venda.' };
  }
}

/**
 * REGISTRAR SAÍDA — FULL
 * Permite registrar: Produto, Quantidade, Data, Observação.
 * Decrementa a quantidade informada do estoque atual.
 */
export async function registrarSaidaFullEstoque(params: {
  produtoId: string;
  quantidade: number;
  data: string;
  hora?: string;
  observacao?: string;
  usuario: string;
}): Promise<{ success: boolean; error?: string; novoSaldo?: number; itemAtualizado?: EstoqueItem }> {
  if (!params.produtoId) return { success: false, error: 'Selecione o produto.' };
  if (!params.quantidade || params.quantidade <= 0) {
    return { success: false, error: 'A quantidade de saída deve ser maior que zero.' };
  }

  try {
    const items = await fetchEstoqueFromDatabase();
    const movs = await fetchMovimentacoesFromDatabase();

    const idx = items.findIndex((it) => it.id === params.produtoId);
    if (idx === -1) return { success: false, error: 'Produto não encontrado no estoque.' };

    const item = items[idx];
    const saldoAnterior = Number(item.estoqueAtual) || 0;
    const novoSaldo = Number(Math.max(0, saldoAnterior - Number(params.quantidade)).toFixed(2));
    const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);

    const { formatted, iso } = formatDateTime(params.data, params.hora);
    const descMov = `${formatted} — Saída Full (-${params.quantidade} ${item.unidade})`;

    const updatedItem: EstoqueItem = {
      ...item,
      estoqueAtual: novoSaldo,
      status,
      ultimaMovimentacao: descMov,
      ultimaMovimentacaoTipo: 'SAIDA_FULL',
      updatedAt: iso,
    };

    items[idx] = updatedItem;

    const novaMovimentacao: MovimentacaoEstoque = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      estoqueItemId: item.id,
      produtoNome: item.produto,
      codigoProduto: item.codigo,
      tipo: 'SAIDA_FULL',
      subtipo: 'Full / Centro de Distribuição',
      quantidade: Number(params.quantidade),
      unidade: item.unidade,
      data: params.data,
      hora: formatted.split(' ')[1] || '12:00',
      observacao: params.observacao?.trim() || 'Saída para Fulfillment / Centro de Distribuição.',
      saldoAnterior,
      saldoPosterior: novoSaldo,
      usuario: params.usuario,
      createdAt: iso,
    };

    const updatedMovs = [novaMovimentacao, ...movs];

    const saveItemsRes = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, params.usuario);
    if (!saveItemsRes.success) return { success: false, error: saveItemsRes.error };

    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, params.usuario);

    localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));

    dispatchCollectionEvents('fenix_estoque_items');
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    // Notificar no sino para Saída Full (mostrando produto, quantidade e tipo)
    try {
      sendUserNotification({
        category: 'Estoque',
        title: `Saída de Estoque (Full): ${novaMovimentacao.produtoNome}`,
        description: `Saída (-${novaMovimentacao.quantidade} ${novaMovimentacao.unidade}) Full / CD registrada no produto "${novaMovimentacao.produtoNome}". Saldo atual: ${novoSaldo} ${item.unidade}.`,
        targetTab: 'Estoque',
        recipientName: params.usuario || 'Todos',
        authorName: params.usuario || 'Controle de Estoque',
        metadata: {
          tipoMovimentacao: 'SAIDA_FULL',
          subtipo: 'Full / Centro de Distribuição',
          produtoNome: novaMovimentacao.produtoNome,
          quantidade: novaMovimentacao.quantidade,
          unidade: novaMovimentacao.unidade,
          saldoPosterior: novoSaldo,
          estoqueItemId: item.id,
        },
      });
    } catch (notifErr) {
      console.warn('Erro ao disparar notificação de saída de estoque:', notifErr);
    }

    return { success: true, novoSaldo, itemAtualizado: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar saída Full.' };
  }
}

/**
 * REGISTRAR SAÍDA — OUTRO
 * Permite registrar saídas como: Doação, Perda, Uso interno, Avaria.
 * Informar o motivo obrigatoriamente.
 */
export async function registrarSaidaOutroEstoque(params: {
  produtoId: string;
  quantidade: number;
  motivoSaida: string; // Doação, Perda, Uso interno, Avaria
  data: string;
  hora?: string;
  observacao?: string;
  usuario: string;
}): Promise<{ success: boolean; error?: string; novoSaldo?: number; itemAtualizado?: EstoqueItem }> {
  if (!params.produtoId) return { success: false, error: 'Selecione o produto.' };
  if (!params.quantidade || params.quantidade <= 0) {
    return { success: false, error: 'A quantidade de saída deve ser maior que zero.' };
  }
  if (!params.motivoSaida || !params.motivoSaida.trim()) {
    return { success: false, error: 'Informe o motivo da saída (ex: Doação, Perda, Uso interno, Avaria).' };
  }

  try {
    const items = await fetchEstoqueFromDatabase();
    const movs = await fetchMovimentacoesFromDatabase();

    const idx = items.findIndex((it) => it.id === params.produtoId);
    if (idx === -1) return { success: false, error: 'Produto não encontrado no estoque.' };

    const item = items[idx];
    const saldoAnterior = Number(item.estoqueAtual) || 0;
    const novoSaldo = Number(Math.max(0, saldoAnterior - Number(params.quantidade)).toFixed(2));
    const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);

    const { formatted, iso } = formatDateTime(params.data, params.hora);
    const descMov = `${formatted} — Saída Outro (${params.motivoSaida}) (-${params.quantidade} ${item.unidade})`;

    const updatedItem: EstoqueItem = {
      ...item,
      estoqueAtual: novoSaldo,
      status,
      ultimaMovimentacao: descMov,
      ultimaMovimentacaoTipo: 'SAIDA_OUTRO',
      updatedAt: iso,
    };

    items[idx] = updatedItem;

    const novaMovimentacao: MovimentacaoEstoque = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      estoqueItemId: item.id,
      produtoNome: item.produto,
      codigoProduto: item.codigo,
      tipo: 'SAIDA_OUTRO',
      subtipo: params.motivoSaida.trim(),
      quantidade: Number(params.quantidade),
      unidade: item.unidade,
      data: params.data,
      hora: formatted.split(' ')[1] || '12:00',
      motivoSaida: params.motivoSaida.trim(),
      observacao: params.observacao?.trim() || `Motivo: ${params.motivoSaida.trim()}`,
      saldoAnterior,
      saldoPosterior: novoSaldo,
      usuario: params.usuario,
      createdAt: iso,
    };

    const updatedMovs = [novaMovimentacao, ...movs];

    const saveItemsRes = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, params.usuario);
    if (!saveItemsRes.success) return { success: false, error: saveItemsRes.error };

    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, params.usuario);

    localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));

    dispatchCollectionEvents('fenix_estoque_items');
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    // Notificar no sino para Outra Saída (mostrando produto, quantidade e tipo/motivo)
    try {
      sendUserNotification({
        category: 'Estoque',
        title: `Saída de Estoque (${params.motivoSaida}): ${novaMovimentacao.produtoNome}`,
        description: `Saída (-${novaMovimentacao.quantidade} ${novaMovimentacao.unidade}) por "${params.motivoSaida}" registrada no produto "${novaMovimentacao.produtoNome}". Saldo atual: ${novoSaldo} ${item.unidade}.`,
        targetTab: 'Estoque',
        recipientName: params.usuario || 'Todos',
        authorName: params.usuario || 'Controle de Estoque',
        metadata: {
          tipoMovimentacao: 'SAIDA_OUTRO',
          subtipo: params.motivoSaida,
          produtoNome: novaMovimentacao.produtoNome,
          quantidade: novaMovimentacao.quantidade,
          unidade: novaMovimentacao.unidade,
          saldoPosterior: novoSaldo,
          estoqueItemId: item.id,
        },
      });
    } catch (notifErr) {
      console.warn('Erro ao disparar notificação de saída de estoque:', notifErr);
    }

    return { success: true, novoSaldo, itemAtualizado: updatedItem };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao registrar outra saída.' };
  }
}

/**
 * Atualiza estoque mínimo de um item
 */
export async function atualizarEstoqueMinimo(
  itemId: string,
  novoMinimo: number,
  usuario: string
): Promise<{ success: boolean; error?: string; itemAtualizado?: EstoqueItem }> {
  try {
    const items = await fetchEstoqueFromDatabase();
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx === -1) return { success: false, error: 'Item não encontrado.' };

    const item = items[idx];
    const status = calculateEstoqueStatus(item.estoqueAtual, novoMinimo);
    const updated: EstoqueItem = {
      ...item,
      estoqueMinimo: novoMinimo,
      status,
      updatedAt: new Date().toISOString(),
    };

    items[idx] = updated;

    const res = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, usuario);
    if (res.success) {
      localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
      dispatchCollectionEvents('fenix_estoque_items');
    }
    return { ...res, itemAtualizado: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar estoque mínimo.' };
  }
}

/**
 * Salva ou edita item do estoque
 */
export async function salvarItemEstoque(
  item: EstoqueItem,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const items = await fetchEstoqueFromDatabase();
    const idx = items.findIndex((x) => x.id === item.id);
    const status = calculateEstoqueStatus(item.estoqueAtual, item.estoqueMinimo || 10);
    const now = new Date().toISOString();

    const normalized: EstoqueItem = {
      ...item,
      status,
      updatedAt: now,
      createdAt: item.createdAt || now,
    };

    let updatedList: EstoqueItem[];
    if (idx >= 0) {
      updatedList = items.map((x, i) => (i === idx ? normalized : x));
    } else {
      updatedList = [normalized, ...items];
    }

    const res = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, updatedList, usuario);
    if (res.success) {
      localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(updatedList));
      dispatchCollectionEvents('fenix_estoque_items');
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar item no estoque.' };
  }
}

/**
 * Exclui item do estoque
 */
export async function excluirItemEstoque(
  itemId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const items = await fetchEstoqueFromDatabase();
    const updated = items.filter((x) => x.id !== itemId);
    const res = await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, updated, usuario);
    if (res.success) {
      localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(updated));
      dispatchCollectionEvents('fenix_estoque_items');
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir item do estoque.' };
  }
}

/**
 * Exclui uma movimentação e ajusta o saldo físico do item no estoque correspondente
 */
export async function excluirMovimentacaoEstoque(
  movId: string,
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const movs = await fetchMovimentacoesFromDatabase();
    const mov = movs.find((m) => m.id === movId);
    if (!mov) return { success: false, error: 'Movimentação não encontrada.' };

    const items = await fetchEstoqueFromDatabase();
    const itemIdx = items.findIndex((it) => it.id === mov.estoqueItemId);

    if (itemIdx >= 0) {
      const item = items[itemIdx];
      let novoSaldo = item.estoqueAtual;
      if (mov.tipo === 'ENTRADA') {
        novoSaldo = Number((item.estoqueAtual - Number(mov.quantidade)).toFixed(2));
      } else {
        novoSaldo = Number((item.estoqueAtual + Number(mov.quantidade)).toFixed(2));
      }
      if (novoSaldo < 0) novoSaldo = 0;

      const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);
      items[itemIdx] = {
        ...item,
        estoqueAtual: novoSaldo,
        status,
        updatedAt: new Date().toISOString(),
      };
      await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, usuario);
      localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
      dispatchCollectionEvents('fenix_estoque_items');
    }

    const updatedMovs = movs.filter((m) => m.id !== movId);
    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, updatedMovs, usuario);
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(updatedMovs));
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir movimentação.' };
  }
}

/**
 * Edita uma movimentação e atualiza o saldo do produto de forma proporcional
 */
export async function editarMovimentacaoEstoque(
  movId: string,
  dados: {
    quantidade?: number;
    data?: string;
    hora?: string;
    observacao?: string;
    usuario?: string;
    subtipo?: string;
  },
  usuario: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const movs = await fetchMovimentacoesFromDatabase();
    const movIdx = movs.findIndex((m) => m.id === movId);
    if (movIdx === -1) return { success: false, error: 'Movimentação não encontrada.' };

    const oldMov = movs[movIdx];
    const items = await fetchEstoqueFromDatabase();
    const itemIdx = items.findIndex((it) => it.id === oldMov.estoqueItemId);

    const novaQuantidade = dados.quantidade !== undefined ? Number(dados.quantidade) : oldMov.quantidade;
    const diffQtd = novaQuantidade - oldMov.quantidade;

    if (itemIdx >= 0 && diffQtd !== 0) {
      const item = items[itemIdx];
      let novoSaldo = item.estoqueAtual;
      if (oldMov.tipo === 'ENTRADA') {
        novoSaldo = Number((item.estoqueAtual + diffQtd).toFixed(2));
      } else {
        novoSaldo = Number((item.estoqueAtual - diffQtd).toFixed(2));
      }
      if (novoSaldo < 0) novoSaldo = 0;

      const status = calculateEstoqueStatus(novoSaldo, item.estoqueMinimo || 10);
      items[itemIdx] = {
        ...item,
        estoqueAtual: novoSaldo,
        status,
        updatedAt: new Date().toISOString(),
      };
      await saveWholeCollectionToSupabase(ESTOQUE_ITEMS_KEY, items, usuario);
      localStorage.setItem(ESTOQUE_ITEMS_KEY, JSON.stringify(items));
      dispatchCollectionEvents('fenix_estoque_items');
    }

    const updatedMov: MovimentacaoEstoque = {
      ...oldMov,
      quantidade: novaQuantidade,
      data: dados.data || oldMov.data,
      hora: dados.hora || oldMov.hora,
      observacao: dados.observacao !== undefined ? dados.observacao : oldMov.observacao,
      usuario: dados.usuario || oldMov.usuario,
      subtipo: dados.subtipo || oldMov.subtipo,
    };

    movs[movIdx] = updatedMov;
    await saveWholeCollectionToSupabase(ESTOQUE_MOVIMENTACOES_KEY, movs, usuario);
    localStorage.setItem(ESTOQUE_MOVIMENTACOES_KEY, JSON.stringify(movs));
    dispatchCollectionEvents('fenix_estoque_movimentacoes');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao editar movimentação.' };
  }
}
