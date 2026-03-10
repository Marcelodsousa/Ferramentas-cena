/**
 * Utilitários para análise de Status PEP
 */

/**
 * Valida se uma nota tem PEP
 * @param {Object} row - Linha da planilha
 * @returns {boolean}
 */
export function hasPEP(row) {
  const pep = row.PEP || row.pep || row.Pep
  return pep && pep.toString().trim() !== ''
}

/**
 * Verifica se há notas duplicadas
 * @param {Array} data - Array de dados
 * @returns {Object} Objeto com notas duplicadas
 */
export function findDuplicates(data) {
  const notaKey = findNotaKey(data[0])
  const notaCount = {}
  
  data.forEach((row, index) => {
    const nota = row[notaKey] || ''
    if (nota) {
      if (!notaCount[nota]) {
        notaCount[nota] = []
      }
      notaCount[nota].push(index)
    }
  })
  
  return Object.fromEntries(
    Object.entries(notaCount).filter(([_, indices]) => indices.length > 1)
  )
}

/**
 * Encontra a chave da coluna "Nota" (case-insensitive)
 * @param {Object} row - Primeira linha de dados
 * @returns {string} Nome da chave
 */
function findNotaKey(row) {
  const keys = Object.keys(row)
  return keys.find(key => 
    key.toLowerCase().includes('nota') || 
    key.toLowerCase().includes('numero')
  ) || keys[0]
}

/**
 * Encontra a chave da coluna "Status" (case-insensitive)
 * @param {Object} row - Primeira linha de dados
 * @returns {string} Nome da chave
 */
function findStatusKey(row) {
  const keys = Object.keys(row)
  return keys.find(key => 
    key.toLowerCase().includes('status') || 
    key.toLowerCase().includes('situacao')
  ) || keys[0]
}

/**
 * Encontra a chave da coluna "PEP" (case-insensitive)
 * @param {Object} row - Primeira linha de dados
 * @returns {string} Nome da chave
 */
function findPEPKey(row) {
  const keys = Object.keys(row)
  return keys.find(key => 
    key.toLowerCase() === 'pep' || 
    key.toLowerCase().includes('pep')
  ) || keys[0]
}

/**
 * Analisa os dados e retorna informações de validação
 * @param {Array} data - Array de dados
 * @returns {Object} Resultado da análise
 */
export function analyzeData(data) {
  if (!data || data.length === 0) {
    return {
      total: 0,
      corretas: 0,
      comErro: 0,
      semPEP: 0,
      duplicadas: 0,
      validacoes: [],
    }
  }

  const notaKey = findNotaKey(data[0])
  const statusKey = findStatusKey(data[0])
  const pepKey = findPEPKey(data[0])
  
  const duplicates = findDuplicates(data)
  const validacoes = []
  
  let corretas = 0
  let semPEP = 0
  let duplicadas = 0

  data.forEach((row, index) => {
    const nota = row[notaKey] || ''
    const pep = row[pepKey] || ''
    const status = row[statusKey] || ''
    
    const validacao = {
      index,
      nota,
      pep,
      status,
      erros: [],
      tipo: 'ok',
    }

    // Verificar PEP
    if (!hasPEP(row)) {
      validacao.erros.push('Sem PEP')
      validacao.tipo = 'sem_pep'
      semPEP++
    }

    // Verificar duplicatas
    if (duplicates[nota] && duplicates[nota].includes(index)) {
      validacao.erros.push('Nota duplicada')
      validacao.tipo = 'duplicada'
      duplicadas++
    }

    if (validacao.erros.length === 0) {
      corretas++
    } else {
      validacao.tipo = 'erro'
    }

    validacoes.push(validacao)
  })

  return {
    total: data.length,
    corretas,
    comErro: data.length - corretas,
    semPEP,
    duplicadas,
    validacoes,
    notaKey,
    statusKey,
    pepKey,
  }
}

/**
 * Compara dados atuais com histórico anterior
 * @param {Array} dadosAtuais - Dados atuais
 * @param {Array} dadosAnteriores - Dados anteriores
 * @returns {Array} Array com comparações
 */
export function compareWithHistory(dadosAtuais, dadosAnteriores) {
  if (!dadosAnteriores || dadosAnteriores.length === 0) {
    return dadosAtuais.map(row => ({
      ...row,
      statusAnterior: null,
      statusAtual: row.Status || row.status,
      alteracao: 'Novo',
    }))
  }

  const notaKey = findNotaKey(dadosAtuais[0])
  const statusKey = findStatusKey(dadosAtuais[0])
  
  // Criar mapa de histórico por nota
  const historicoMap = {}
  dadosAnteriores.forEach(row => {
    const nota = row[notaKey] || ''
    const status = row[statusKey] || ''
    if (nota) {
      historicoMap[nota] = status
    }
  })

  // Comparar dados atuais com histórico
  return dadosAtuais.map(row => {
    const nota = row[notaKey] || ''
    const statusAtual = row[statusKey] || ''
    const statusAnterior = historicoMap[nota] || null
    
    let alteracao = 'Sem alteração'
    if (!statusAnterior) {
      alteracao = 'Novo'
    } else if (statusAnterior !== statusAtual) {
      alteracao = 'Alterado'
    }

    return {
      ...row,
      statusAnterior,
      statusAtual,
      alteracao,
    }
  })
}
