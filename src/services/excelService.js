import * as XLSX from 'xlsx'

/**
 * Lê um arquivo Excel e retorna os dados em formato de array de objetos
 * @param {File} file - Arquivo Excel
 * @returns {Promise<Array>} Array de objetos com os dados da planilha
 */
export async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Erro ao ler arquivo Excel: ' + error.message))
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Exporta dados para Excel
 * @param {Array} data - Array de objetos para exportar
 * @param {string} filename - Nome do arquivo
 */
export function exportToExcel(data, filename = 'export.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados')
  XLSX.writeFile(workbook, filename)
}
