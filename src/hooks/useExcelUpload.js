import { useState } from 'react'
import { readExcelFile } from '../services/excelService'

/**
 * Hook para gerenciar upload de arquivos Excel
 */
export function useExcelUpload() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileUpload = async (file) => {
    if (!file) return

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const excelData = await readExcelFile(file)
      setData(excelData)
      return excelData
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setData([])
    setError(null)
    setLoading(false)
  }

  return {
    data,
    loading,
    error,
    handleFileUpload,
    reset,
  }
}
