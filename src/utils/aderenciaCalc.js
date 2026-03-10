// ─────────────────────────────────────────────────────────────────────────────
// ADERÊNCIA DE MATERIAL — Processamento 100% em memória
//
// CN52N é carregado do Excel e processado localmente.
// CONVERSOR, SIGLA_MUN e MB52 vêm do banco como mapas de lookup.
// ─────────────────────────────────────────────────────────────────────────────

// ── Normalização de cabeçalhos (igual ao service) ─────────────────────────────
function norm(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[\s_.\-/\\]/g, '')      // remove separadores
}

function findKey(obj, ...terms) {
  const keys = Object.keys(obj)
  const normTerms = terms.map(norm)
  return keys.find(k => normTerms.some(t => norm(k).includes(t))) || ''
}

function keyByPosition(obj, pos) {
  return Object.keys(obj)[pos] || ''
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSEAR CN52N (Excel → objetos normalizados, sem salvar no banco)
// ─────────────────────────────────────────────────────────────────────────────
export function parsearCN52N(rows) {
  if (!rows || !rows.length) throw new Error('Planilha CN52N vazia')

  const sample = rows[0]

  const pepKey          = findKey(sample, 'wbs', 'elemento', 'pep', 'vbs')
  const movementKey     = findKey(sample, 'movementtype', 'tipmov', 'tipomov', 'movement', 'moveme', 'tp')
  const centroKey       = findKey(sample, 'centro', 'center', 'plant', 'planta')
  const materialKey     = findKey(sample, 'material')
  const necessariaKey   = findKey(sample, 'necessaria', 'necessario', 'necessidade', 'necess', 'qtdnec', 'qtdnecess', 'planejad')
  const retiradaKey     = findKey(sample, 'retirada', 'retirado', 'baixad', 'qtdret', 'qtdretirad', 'retirad')
  const precoKey        = findKey(sample, 'price', 'preco', 'valor', 'custo', 'pricecurrency', 'precolcurrency')
  // Novos campos da CN52N
  const grupoKey        = findKey(sample, 'grupomercad', 'grupodemerced', 'grupodemerco', 'grupomercadorias',
                                  'matgroup', 'materialgroup', 'grpdemerc', 'grpmerc', 'grupo')
  const descricaoKey    = findKey(sample, 'textomaterial', 'textmat', 'descricaomaterial', 'descricao',
                                  'description', 'materialtext', 'denominacao', 'texto')
  const recebedorKey    = findKey(sample, 'recebedor', 'recebedordemercadoria', 'recebedormerc',
                                  'goodsrecipient', 'recipient', 'recip')

  const parsed = rows
    .map(row => ({
      pep:                String(row[pepKey]          || '').trim(),
      movement_type:      String(row[movementKey]     || '').trim(),
      material:           String(row[materialKey]     || '').trim(),
      qtd_necessaria:     parseFloat(row[necessariaKey]) || 0,
      qtd_retirada:       parseFloat(row[retiradaKey])   || 0,
      preco:              parseFloat(String(row[precoKey] || '0').replace(',', '.')) || 0,
      centro:               String(row[centroKey]       || '').trim(),
      grupo_mercadorias:    String(row[grupoKey]        || '').trim(),
      descricao_cn52n:      String(row[descricaoKey]    || '').trim(),
      recebedor_mercadoria: String(row[recebedorKey]    || '').trim(),
    }))
    .filter(r => r.pep && r.material)

  if (!parsed.length) throw new Error('Nenhum registro válido encontrado na CN52N')

  return parsed
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESSAR ADERÊNCIA
// Recebe linhas CN52N (parsed) + maps de lookup do banco e retorna resultado final
// ─────────────────────────────────────────────────────────────────────────────
export function processarAderencia(cn52nRows, { conversorMap, siglaMunMap, mb52Map }) {
  return cn52nRows.map(r => {
    const {
      pep, movement_type, material, qtd_necessaria, qtd_retirada, preco, centro,
      grupo_mercadorias, descricao_cn52n, recebedor_mercadoria,
    } = r

    // ── PEP III e Tipo PEP ────────────────────────────────────────────────
    const pep_iii  = pep.substring(0, 21).trim()
    const tipo_pep = pep.slice(-1).toUpperCase()          // último caractere: M ou I

    // ── Cálculo de saldo e status ─────────────────────────────────────────
    const saldo = qtd_necessaria - qtd_retirada
    const status =
      saldo > 0 ? 'PENDENTE' :
      saldo < 0 ? 'RETIRADO_A_MAIS' :
      'OK'

    // ── Lookup CONVERSOR ──────────────────────────────────────────────────
    const conv            = conversorMap[material] || {}
    const fator           = conv.fator_conversao || 1
    // Descrição: prioriza CONVERSOR, fallback no texto da própria CN52N
    const descricao       = conv.descricao || descricao_cn52n || ''
    const material_classe = conv.classe    || ''

    // ── Qtde Prevista = Qtd Necessária × Fator de Conversão ──────────────
    const qtde_prev = qtd_necessaria * fator

    // ── Cálculo financeiro ────────────────────────────────────────────────
    const valor_total = qtd_necessaria * preco

    // Movimento 581 inverte o sinal do pendente
    const valor_pendente = movement_type === '581'
      ? -(saldo * preco)
      :   saldo * preco

    // ── Lookup MB52 ───────────────────────────────────────────────────────
    // Classe  → coluna "Classe"    do MB52 (fallback: CONVERSOR)
    // Tipo Mat → coluna "Subclasse" do MB52 (sem fallback)
    const mb52               = mb52Map[material] || {}
    const classe             = mb52.classe        || material_classe
    const tipo_mat           = mb52.tipo_mat      || ''
    const estoque_disponivel = mb52.estoque_disponivel ?? 0

    // ── Lookup SIGLA_MUN ─────────────────────────────────────────────────
    const mun      = siglaMunMap[centro] || {}
    const municipio = mun.municipio      || ''
    const sigla     = mun.sigla          || ''
    const polo      = mun.polo           || ''

    return {
      pep_iii, tipo_pep,
      pep, centro,
      material, descricao,
      movement_type,
      grupo_mercadorias,
      recebedor_mercadoria,
      qtd_necessaria, qtd_retirada, qtde_prev, saldo,
      status,
      preco, valor_total, valor_pendente,
      classe, tipo_mat, material_classe,
      estoque_disponivel,
      municipio, sigla, polo,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR TOTAIS (dashboard) a partir dos dados já processados
// ─────────────────────────────────────────────────────────────────────────────
export function calcularTotais(rows) {
  if (!rows.length) return null
  return {
    total:           rows.length,
    totalNecessario: rows.reduce((s, r) => s + (r.qtd_necessaria || 0), 0),
    totalRetirado:   rows.reduce((s, r) => s + (r.qtd_retirada   || 0), 0),
    totalPendente:   rows.reduce((s, r) => s + (r.saldo > 0 ? r.saldo : 0), 0),
    totalValor:      rows.reduce((s, r) => s + (r.valor_total     || 0), 0),
    totalValorPend:  rows.reduce((s, r) => s + (r.valor_pendente  || 0), 0),
    contOK:          rows.filter(r => r.status === 'OK').length,
    contPendente:    rows.filter(r => r.status === 'PENDENTE').length,
    contExcesso:     rows.filter(r => r.status === 'RETIRADO_A_MAIS').length,
  }
}
