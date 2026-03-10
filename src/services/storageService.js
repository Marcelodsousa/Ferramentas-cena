/**
 * Serviço para gerenciar LocalStorage
 */

const STORAGE_KEYS = {
  ANALISE_PEP_HISTORY: 'cena_tools_analise_pep_history',
  REQUISICOES: 'cena_tools_requisicoes',
}

/**
 * Salva dados no LocalStorage
 * @param {string} key - Chave de armazenamento
 * @param {*} data - Dados para salvar
 */
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Erro ao salvar no LocalStorage:', error)
    throw new Error('Erro ao salvar dados')
  }
}

/**
 * Lê dados do LocalStorage
 * @param {string} key - Chave de armazenamento
 * @param {*} defaultValue - Valor padrão se não existir
 * @returns {*} Dados recuperados
 */
export function getFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error('Erro ao ler do LocalStorage:', error)
    return defaultValue
  }
}

/**
 * Remove dados do LocalStorage
 * @param {string} key - Chave de armazenamento
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Erro ao remover do LocalStorage:', error)
  }
}

export { STORAGE_KEYS }
