import { supabase } from './supabaseClient'

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DE CHAVES
// ─────────────────────────────────────────────────────────────────────────────
function norm(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_.\-/\\]/g, '')
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
// IMPORTAR CONVERSOR  (salva no banco — tabela de referência permanente)
// ─────────────────────────────────────────────────────────────────────────────
export async function importarConversor(rows, nomeArquivo) {
  if (!rows.length) throw new Error('Planilha vazia')

  await supabase.from('importacoes').insert({
    tipo: 'CONVERSOR', nome_arquivo: nomeArquivo, total_registros: rows.length,
  })

  const sample = rows[0]
  const materialKey  = findKey(sample, 'material', 'codigo', 'mat')
  const descricaoKey = findKey(sample, 'descricao', 'description', 'desc', 'nome', 'texto')
  const classeKey    = findKey(sample, 'classe', 'class', 'grupo', 'tipo')

  let fatorKey = findKey(sample, 'fator', 'conversao', 'fc', 'multiplicad', 'indice', 'conv', 'fatorconv')
  if (!fatorKey) fatorKey = keyByPosition(sample, 8) // col I (índice 8) como fallback

  await supabase.from('conversor').delete().not('id', 'is', null)

  const lote = rows.map(row => ({
    material:        String(row[materialKey]  || '').trim(),
    descricao:       String(row[descricaoKey] || '').trim(),
    classe:          String(row[classeKey]    || '').trim(),
    fator_conversao: parseFloat(String(row[fatorKey] || '1').replace(',', '.')) || 1,
  })).filter(r => r.material)

  for (let i = 0; i < lote.length; i += 500) {
    const { error } = await supabase.from('conversor').insert(lote.slice(i, i + 500))
    if (error) throw new Error('Erro ao inserir CONVERSOR: ' + error.message)
  }

  return { total: lote.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAR SIGLA_MUN  (salva no banco — tabela de referência permanente)
// ─────────────────────────────────────────────────────────────────────────────
export async function importarSiglaMun(rows, nomeArquivo) {
  if (!rows.length) throw new Error('Planilha vazia')

  await supabase.from('importacoes').insert({
    tipo: 'SIGLA_MUN', nome_arquivo: nomeArquivo, total_registros: rows.length,
  })

  const sample = rows[0]
  const centroKey    = findKey(sample, 'centro', 'center', 'cc', 'planta')
  const municipioKey = findKey(sample, 'municipio', 'cidade', 'city', 'localidade')
  const siglaKey     = findKey(sample, 'sigla', 'abrev', 'codigo', 'uf')
  const poloKey      = findKey(sample, 'polo', 'regional', 'area', 'regiao')

  await supabase.from('sigla_mun').delete().not('id', 'is', null)

  const mapa = {}
  rows.forEach(row => {
    const centro = String(row[centroKey] || '').trim()
    if (centro && !mapa[centro]) {
      mapa[centro] = {
        centro,
        municipio: String(row[municipioKey] || '').trim(),
        sigla:     String(row[siglaKey]     || '').trim(),
        polo:      String(row[poloKey]      || '').trim(),
      }
    }
  })
  const lote = Object.values(mapa)

  for (let i = 0; i < lote.length; i += 500) {
    const { error } = await supabase.from('sigla_mun').insert(lote.slice(i, i + 500))
    if (error) throw new Error('Erro ao inserir SIGLA_MUN: ' + error.message)
  }

  return { total: lote.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAR MB52  (salva no banco — tabela de referência permanente)
// ─────────────────────────────────────────────────────────────────────────────
export async function importarMB52(rows, nomeArquivo) {
  if (!rows.length) throw new Error('Planilha vazia')

  await supabase.from('importacoes').insert({
    tipo: 'MB52', nome_arquivo: nomeArquivo, total_registros: rows.length,
  })

  const sample = rows[0]
  const keys   = Object.keys(sample)

  let materialKey = findKey(sample, 'material', 'mat', 'nomaterial', 'nrmat', 'codigomaterial', 'codigo')
  if (!materialKey) materialKey = keys[3] || keys[0]
  const matIdx = keys.indexOf(materialKey)

  // CLASSE → coluna "Classe" do MB52
  let classeKey = findKey(sample, 'classe', 'class', 'agrupamento', 'agrup', 'grupodemerc',
    'grupomerc', 'grupomercad', 'materialgroup', 'matgroup', 'matgrp', 'grpmerc')
  if (!classeKey && matIdx >= 0) classeKey = keys[matIdx + 3] || ''

  // TIPO MAT → coluna "Subclasse" do MB52
  let tipoMatKey = findKey(sample, 'subclasse', 'subclass', 'sub',
    'tipomat', 'tipomaterial', 'tipodemat', 'tipodematerial', 'materialtype', 'mattype', 'typmat')
  if (!tipoMatKey && matIdx >= 0) tipoMatKey = keys[matIdx + 4] || ''

  const depositoKey = findKey(sample, 'deposito', 'deposit', 'armazem', 'almox', 'sloc', 'storageloc')
  const estoqueKey  = findKey(sample, 'estoquedisponivel', 'disponivel', 'unrestrictedstock',
    'estoquelivre', 'livre', 'saldodisponivel', 'qtdestoque', 'estoque', 'saldo')

  await supabase.from('mb52').delete().not('id', 'is', null)

  const lote = rows.map(row => ({
    material:           String(row[materialKey]  || '').trim(),
    deposito:           String(row[depositoKey]  || '').trim(),
    classe:             String(row[classeKey]    || '').trim() || null,
    tipo_mat:           String(row[tipoMatKey]   || '').trim() || null,
    estoque_disponivel: parseFloat(
      String(row[estoqueKey] || '0').replace(/\./g, '').replace(',', '.')
    ) || 0,
  })).filter(r => r.material)

  for (let i = 0; i < lote.length; i += 500) {
    const { error } = await supabase.from('mb52').insert(lote.slice(i, i + 500))
    if (error) throw new Error('Erro ao inserir MB52: ' + error.message)
  }

  return {
    total: lote.length,
    mapeamento: { materialKey, classeKey, tipoMatKey, depositoKey, estoqueKey },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSCAR TABELAS DE REFERÊNCIA DO BANCO
// Retorna mapas { [material]: dados } para lookup rápido em memória
// ─────────────────────────────────────────────────────────────────────────────
export async function buscarTabelasReferencia() {
  const [convRes, siglRes, mb52Res] = await Promise.all([
    supabase.from('conversor') .select('material, descricao, classe, fator_conversao').range(0, 9999),
    supabase.from('sigla_mun') .select('centro, municipio, sigla, polo').range(0, 9999),
    supabase.from('mb52')      .select('material, classe, tipo_mat, estoque_disponivel').range(0, 9999),
  ])

  if (convRes.error)  throw new Error('Erro ao buscar CONVERSOR: '  + convRes.error.message)
  if (siglRes.error)  throw new Error('Erro ao buscar SIGLA_MUN: '  + siglRes.error.message)
  if (mb52Res.error)  throw new Error('Erro ao buscar MB52: '       + mb52Res.error.message)

  // Transforma em mapas para lookup O(1)
  const conversorMap = {}
  ;(convRes.data || []).forEach(r => { conversorMap[r.material] = r })

  const siglaMunMap = {}
  ;(siglRes.data || []).forEach(r => { siglaMunMap[r.centro] = r })

  const mb52Map = {}
  ;(mb52Res.data || []).forEach(r => { mb52Map[r.material] = r })

  return { conversorMap, siglaMunMap, mb52Map }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS DAS IMPORTAÇÕES (apenas tabelas de referência)
// ─────────────────────────────────────────────────────────────────────────────
export async function buscarStatusImportacoes() {
  const { data, error } = await supabase
    .from('importacoes')
    .select('tipo, nome_arquivo, total_registros, created_at')
    .in('tipo', ['CONVERSOR', 'SIGLA_MUN', 'MB52'])
    .order('created_at', { ascending: false })

  if (error) return {}

  const status = {}
  ;['CONVERSOR', 'SIGLA_MUN', 'MB52'].forEach(tipo => {
    status[tipo] = (data || []).find(d => d.tipo === tipo) || null
  })
  return status
}
