import { useState, useMemo, useEffect } from 'react'
import { Upload, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react'
import { useExcelUpload } from '../../hooks/useExcelUpload'
import { analyzeData, compareWithHistory } from '../../utils/analisePEP'
import { exportToExcel } from '../../services/excelService'
import { exportToPDF } from '../../services/pdfService'
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../services/storageService'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import Loading from '../../components/UI/Loading'
import DataTable from '../../components/Table/DataTable'
import { createColumnHelper } from '@tanstack/react-table'

const columnHelper = createColumnHelper()

function AnaliseStatusPEP() {
  const { data, loading, error, handleFileUpload, reset } = useExcelUpload()
  const [analise, setAnalise] = useState(null)

  // Processar dados quando um arquivo é carregado
  useEffect(() => {
    if (data && data.length > 0) {
      const resultado = analyzeData(data)
      
      // Carregar histórico anterior
      const historico = getFromStorage(STORAGE_KEYS.ANALISE_PEP_HISTORY, [])
      if (historico.length > 0) {
        const comparacao = compareWithHistory(data, historico)
        setAnalise({ ...resultado, comparacao })
      } else {
        setAnalise(resultado)
      }
    } else {
      setAnalise(null)
    }
  }, [data])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleExportExcel = () => {
    if (!analise || !data) return
    
    const exportData = data.map((row, index) => ({
      ...row,
      Validacao: analise.validacoes[index]?.tipo === 'ok' ? 'OK' : analise.validacoes[index]?.erros.join(', ') || '',
    }))
    
    exportToExcel(exportData, 'analise_status_pep.xlsx')
  }

  const handleExportPDF = () => {
    if (!analise || !data) return
    
    const columns = [
      { key: analise.notaKey, header: 'Nota' },
      { key: analise.pepKey, header: 'PEP' },
      { key: analise.statusKey, header: 'Status' },
    ]
    
    exportToPDF(data, columns, 'Análise de Status PEP', 'analise_status_pep.pdf')
  }

  const handleSaveHistory = () => {
    if (data && data.length > 0) {
      saveToStorage(STORAGE_KEYS.ANALISE_PEP_HISTORY, data)
      alert('Histórico salvo com sucesso!')
    }
  }

  const tableColumns = useMemo(() => {
    if (!analise || !data.length) return []
    
    const baseColumns = [
      columnHelper.accessor(analise.notaKey, {
        header: 'Nota',
        cell: info => info.getValue(),
      }),
      columnHelper.accessor(analise.pepKey, {
        header: 'PEP',
        cell: info => info.getValue() || '-',
      }),
      columnHelper.accessor(analise.statusKey, {
        header: 'Status',
        cell: info => info.getValue() || '-',
      }),
    ]

    if (analise.comparacao) {
      baseColumns.push(
        columnHelper.accessor('statusAnterior', {
          header: 'Status Anterior',
          cell: info => info.getValue() || '-',
        }),
        columnHelper.accessor('alteracao', {
          header: 'Alteração',
          cell: info => {
            const value = info.getValue()
            const color = value === 'Alterado' ? 'text-yellow-600 dark:text-yellow-400' : 
                         value === 'Novo' ? 'text-blue-600 dark:text-blue-400' : 
                         'text-gray-600 dark:text-gray-400'
            return <span className={color}>{value}</span>
          },
        })
      )
    }

    baseColumns.push(
      columnHelper.accessor(row => {
        const index = data.indexOf(row)
        return analise.validacoes[index]?.tipo || 'ok'
      }, {
        header: 'Validação',
        cell: info => {
          const index = data.indexOf(info.row.original)
          const validacao = analise.validacoes[index]
          if (!validacao || validacao.tipo === 'ok') {
            return <span className="text-green-600 dark:text-green-400">✓ OK</span>
          }
          return (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{validacao.erros.join(', ')}</span>
            </div>
          )
        },
      })
    )

    return baseColumns
  }, [analise, data])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Análise de Status PEP</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Verifique se as notas possuem PEP correto e analise seus status
        </p>
      </div>

      {/* Upload de arquivo */}
      <Card>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 btn-primary cursor-pointer">
            <Upload className="w-5 h-5" />
            <span>Carregar Planilha</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {data.length > 0 && (
            <>
              <Button variant="secondary" onClick={reset}>
                Limpar
              </Button>
              <Button variant="secondary" onClick={handleSaveHistory}>
                Salvar Histórico
              </Button>
            </>
          )}
        </div>
        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}
      </Card>

      {/* Resumo */}
      {analise && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Notas</div>
            <div className="text-2xl font-bold">{analise.total}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notas Corretas</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analise.corretas}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Com Erro</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {analise.comErro}
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sem PEP</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {analise.semPEP}
            </div>
          </Card>
        </div>
      )}

      {/* Tabela de dados */}
      {loading && <Loading message="Processando planilha..." />}
      
      {analise && data.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Dados Analisados</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                Exportar Excel
              </Button>
              <Button variant="secondary" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2 inline" />
                Exportar PDF
              </Button>
            </div>
          </div>
          <DataTable 
            data={analise.comparacao || data} 
            columns={tableColumns}
          />
        </Card>
      )}

      {!loading && !data.length && (
        <Card>
          <div className="text-center py-12">
            <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Carregue uma planilha Excel para começar a análise
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

export default AnaliseStatusPEP
