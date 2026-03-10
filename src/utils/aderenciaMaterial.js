/**
 * Utilitários para Aderência de Material
 */

/**
 * Detecta automaticamente as colunas chave na planilha
 * @param {Object} row - Primeira linha de dados
 */
export function detectColumns(row) {
  const keys = Object.keys(row)
  const find = (...terms) =>
    keys.find(k => terms.some(t => k.toLowerCase().includes(t.toLowerCase()))) || ''

  return {
    materialKey: find('material', 'descricao', 'item', 'produto'),
    requisitadoKey: find('requisit', 'solicit', 'qtd_req', 'quantidade_req'),
    baixadoKey: find('baixad', 'entregue', 'atendid', 'qtd_bai'),
    obraKey: find('obra', 'projeto', 'local', 'centro'),
    dataKey: find('data', 'date'),
  }
}

/**
 * Classifica o saldo como OK / POSITIVO / NEGATIVO
 */
function classificarSaldo(saldo) {
  if (saldo === 0) return 'OK'
  if (saldo > 0) return 'POSITIVO'
  return 'NEGATIVO'
}

/**
 * Processa os dados e calcula saldos de aderência
 * @param {Array} rawData - Dados brutos da planilha
 * @returns {Object} dados processados + totais
 */
export function processarAderencia(rawData) {
  if (!rawData || rawData.length === 0) return { rows: [], totais: {}, cols: {} }

  const cols = detectColumns(rawData[0])

  const rows = rawData.map((row) => {
    const requisitado = parseFloat(row[cols.requisitadoKey]) || 0
    const baixado = parseFloat(row[cols.baixadoKey]) || 0
    const saldo = requisitado - baixado
    const status = classificarSaldo(saldo)

    return {
      ...row,
      _requisitado: requisitado,
      _baixado: baixado,
      _saldo: saldo,
      _status: status,
    }
  })

  const totais = {
    totalRequisitado: rows.reduce((acc, r) => acc + r._requisitado, 0),
    totalBaixado: rows.reduce((acc, r) => acc + r._baixado, 0),
    totalPendente: rows.reduce((acc, r) => (r._saldo > 0 ? acc + r._saldo : acc), 0),
    contOK: rows.filter(r => r._status === 'OK').length,
    contPositivo: rows.filter(r => r._status === 'POSITIVO').length,
    contNegativo: rows.filter(r => r._status === 'NEGATIVO').length,
  }

  return { rows, totais, cols }
}

/**
 * Agrupa os dados por obra/projeto
 */
export function agruparPorObra(rows, obraKey) {
  const grupos = {}
  rows.forEach(row => {
    const obra = row[obraKey] || 'Sem Obra'
    if (!grupos[obra]) grupos[obra] = []
    grupos[obra].push(row)
  })
  return grupos
}
