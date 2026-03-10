/**
 * Utilitários para Requisição de Material
 */

/**
 * Gera um SKU automático com prefixo REQ + timestamp + sequência
 * @param {number} index - Índice do item na lista
 * @returns {string} SKU gerado
 */
export function gerarSKU(index) {
  const ts = Date.now().toString().slice(-6)
  const seq = String(index + 1).padStart(3, '0')
  return `REQ-${ts}-${seq}`
}

/**
 * Gera o número da requisição
 * @param {Array} historico - Histórico de requisições
 * @returns {string} Número da requisição
 */
export function gerarNumeroRequisicao(historico = []) {
  const ano = new Date().getFullYear()
  const proximo = (historico.length + 1).toString().padStart(4, '0')
  return `REQ-${ano}-${proximo}`
}

/**
 * Valida os campos obrigatórios do formulário de requisição
 * @param {Object} form - Dados do formulário
 * @param {Array} materiais - Lista de materiais
 * @returns {Array} Lista de erros
 */
export function validarRequisicao(form, materiais) {
  const erros = []

  if (!form.obra?.trim()) erros.push('Obra é obrigatória')
  if (!form.local?.trim()) erros.push('Local é obrigatório')
  if (!form.operacao?.trim()) erros.push('Operação é obrigatória')
  if (!form.responsavelOperacao?.trim()) erros.push('Responsável da operação é obrigatório')
  if (!form.responsavelAlmoxarifado?.trim()) erros.push('Responsável do almoxarifado é obrigatório')
  if (!materiais.length) erros.push('Adicione pelo menos um material')

  materiais.forEach((m, i) => {
    if (!m.descricao?.trim()) erros.push(`Material ${i + 1}: descrição obrigatória`)
    if (!m.quantidade || Number(m.quantidade) <= 0) erros.push(`Material ${i + 1}: quantidade inválida`)
    if (!m.unidade?.trim()) erros.push(`Material ${i + 1}: unidade obrigatória`)
  })

  return erros
}

/**
 * Cria um objeto de material novo com SKU gerado
 * @param {number} index
 */
export function novoMaterial(index) {
  return {
    id: Date.now() + index,
    sku: gerarSKU(index),
    descricao: '',
    quantidade: '',
    unidade: 'UN',
  }
}
