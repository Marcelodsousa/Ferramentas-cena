import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Upload, FileSpreadsheet, FileText, RefreshCw,
  CheckCircle, AlertTriangle, Database, Trash2
} from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import { readExcelFile, exportToExcel } from '../../services/excelService'
import { exportToPDF } from '../../services/pdfService'
import {
  importarConversor, importarSiglaMun, importarMB52,
  buscarTabelasReferencia, buscarStatusImportacoes,
} from '../../services/aderenciaService'
import { parsearCN52N, processarAderencia, calcularTotais } from '../../utils/aderenciaCalc'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import Loading from '../../components/UI/Loading'
import DataTable from '../../components/Table/DataTable'

const columnHelper = createColumnHelper()

// ── Formatadores ──────────────────────────────────────────────────────────────
const fmt    = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
const fmtBRL = v => v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Badge de status ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  OK:              { label: 'OK',             cls: 'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-300' },
  PENDENTE:        { label: 'Pendente',       cls: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  RETIRADO_A_MAIS: { label: 'Retirado a mais',cls: 'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300' },
}
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
}

// ── Config das bases de referência (salvas no banco) ─────────────────────────
const BASES_REF = [
  {
    key: 'CONVERSOR',
    label: 'CONVERSOR',
    subtitle: 'Descrição e classe dos materiais',
    color: 'green',
    campos: 'Material · Descrição · Classe · Fator de Conversão',
  },
  {
    key: 'SIGLA_MUN',
    label: 'SIGLA_MUN',
    subtitle: 'Centro → Município / Sigla / Polo',
    color: 'purple',
    campos: 'Centro · Município · Sigla · Polo',
  },
  {
    key: 'MB52',
    label: 'MB52',
    subtitle: 'Estoque disponível por material',
    color: 'orange',
    campos: 'Material · Depósito · Classe · Tipo Mat · Estoque Disponível',
  },
]

const COLOR_MAP = {
  green:  { badge: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',  border: 'border-green-300  dark:border-green-700' },
  purple: { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  orange: { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AderenciaMaterial() {
  // ── Tabelas de referência (do banco) ───────────────────────────────────────
  const [importStatus, setImportStatus] = useState({})
  const [refMaps, setRefMaps]           = useState(null)   // { conversorMap, siglaMunMap, mb52Map }
  const [loadingRef, setLoadingRef]     = useState(false)

  // ── CN52N (apenas em memória) ──────────────────────────────────────────────
  const [cn52nInfo, setCn52nInfo]       = useState(null)   // { nome, total, rows: [] }
  const [loadingCN52N, setLoadingCN52N] = useState(false)
  const [erroCN52N, setErroCN52N]       = useState('')

  // ── Upload de referências ──────────────────────────────────────────────────
  const [uploading, setUploading]       = useState({})
  const [uploadErrors, setUploadErrors] = useState({})

  // ── Export ────────────────────────────────────────────────────────────────
  const [gerandoPDF,   setGerandoPDF]   = useState(false)
  const [gerandoXLSX,  setGerandoXLSX]  = useState(false)

  // ── Filtros ────────────────────────────────────────────────────────────────
  const FILTROS_INICIAL = {
    pep: '', tipoPep: '', material: '', descricao: '', tipoMat: '',
    classe: '', grupo: '', centro: '', tipoMov: '', recebedor: '', status: 'TODOS',
  }
  const [filtros, setFiltros] = useState(FILTROS_INICIAL)

  // ── Refs para input file ───────────────────────────────────────────────────
  const cn52nRef = useRef(null)

  // ── Carregar status e tabelas de referência ao montar ─────────────────────
  useEffect(() => {
    const inicializar = async () => {
      setLoadingRef(true)
      try {
        const [status, maps] = await Promise.all([
          buscarStatusImportacoes(),
          buscarTabelasReferencia(),
        ])
        setImportStatus(status)
        setRefMaps(maps)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingRef(false)
      }
    }
    inicializar()
  }, [])

  // ── Dados processados (CN52N × tabelas de referência) ─────────────────────
  const allRows = useMemo(() => {
    if (!cn52nInfo?.rows || !refMaps) return []
    try {
      return processarAderencia(cn52nInfo.rows, refMaps)
    } catch {
      return []
    }
  }, [cn52nInfo, refMaps])

  // ── Totais gerais (sem filtro — linha do dashboard base) ──────────────────
  const totais = useMemo(() => calcularTotais(allRows), [allRows])

  // ── Valores únicos para dropdowns — calculados dos dados completos ─────────
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort()

  const opTipoPep   = useMemo(() => uniq(allRows.map(r => r.tipo_pep)),              [allRows])
  const opTipoMov   = useMemo(() => uniq(allRows.map(r => r.movement_type)),         [allRows])
  const opRecebedor = useMemo(() => uniq(allRows.map(r => r.recebedor_mercadoria)),  [allRows])
  const opCentro    = useMemo(() => uniq(allRows.map(r => r.centro)),                [allRows])
  const opClasse    = useMemo(() => uniq(allRows.map(r => r.classe)),                [allRows])
  const opTipoMat   = useMemo(() => uniq(allRows.map(r => r.tipo_mat)),              [allRows])
  const opDescricao = useMemo(() => uniq(allRows.map(r => r.descricao)),             [allRows])

  // ── Totais dinâmicos (baseados nos dados filtrados) ────────────────────────
  // Calculado APÓS rows — declarado aqui para referência circular ser evitada
  // (rows é declarado logo abaixo, totaisFiltrados usa rows via segundo useMemo)

  // ── Filtro local em tempo real ─────────────────────────────────────────────
  const rows = useMemo(() => {
    const s = v => String(v || '').toLowerCase()
    return allRows.filter(r => {
      if (filtros.pep      && !s(r.pep_iii)         .includes(s(filtros.pep)))      return false
      if (filtros.tipoPep  && s(r.tipo_pep)          !== s(filtros.tipoPep))         return false
      if (filtros.material  && !s(r.material) .includes(s(filtros.material)))  return false
      if (filtros.descricao && s(r.descricao) !== s(filtros.descricao))         return false
      if (filtros.tipoMat   && s(r.tipo_mat)  !== s(filtros.tipoMat))           return false
      if (filtros.grupo     && !s(r.grupo_mercadorias)    .includes(s(filtros.grupo)))    return false
      if (filtros.centro    && s(r.centro)               !== s(filtros.centro))           return false
      if (filtros.tipoMov   && s(r.movement_type)        !== s(filtros.tipoMov))          return false
      if (filtros.recebedor && s(r.recebedor_mercadoria) !== s(filtros.recebedor))        return false
      if (filtros.classe    && s(r.classe)               !== s(filtros.classe))           return false
      if (filtros.status !== 'TODOS' && r.status !== filtros.status)                       return false
      return true
    })
  }, [allRows, filtros])

  // ── Totais dinâmicos calculados sobre os rows JÁ filtrados ────────────────
  const totaisFiltrados = useMemo(() => {
    if (!rows.length) return { valorTotal: 0, valorPendente: 0 }
    return {
      valorTotal:    rows.reduce((s, r) => s + (r.valor_total    || 0), 0),
      valorPendente: rows.reduce((s, r) => s + (r.valor_pendente || 0), 0),
    }
  }, [rows])

  // ── Upload CN52N (em memória) ──────────────────────────────────────────────
  const handleCN52NUpload = async (file) => {
    if (!file) return
    setLoadingCN52N(true)
    setErroCN52N('')
    try {
      const data  = await readExcelFile(file)
      const parsed = parsearCN52N(data)
      setCn52nInfo({ nome: file.name, total: parsed.length, rows: parsed })
    } catch (e) {
      setErroCN52N(e.message)
    } finally {
      setLoadingCN52N(false)
      if (cn52nRef.current) cn52nRef.current.value = ''
    }
  }

  const handleLimparCN52N = () => {
    setCn52nInfo(null)
    setErroCN52N('')
    setFiltros(FILTROS_INICIAL)
    if (cn52nRef.current) cn52nRef.current.value = ''
  }

  // ── Upload tabelas de referência (salvas no banco) ─────────────────────────
  const handleRefUpload = useCallback(async (baseKey, file) => {
    if (!file) return
    setUploading(p => ({ ...p, [baseKey]: true }))
    setUploadErrors(p => ({ ...p, [baseKey]: '' }))
    try {
      const data = await readExcelFile(file)
      const fns  = { CONVERSOR: importarConversor, SIGLA_MUN: importarSiglaMun, MB52: importarMB52 }
      await fns[baseKey](data, file.name)
      // Recarregar status e mapas de referência
      const [status, maps] = await Promise.all([
        buscarStatusImportacoes(),
        buscarTabelasReferencia(),
      ])
      setImportStatus(status)
      setRefMaps(maps)
    } catch (e) {
      setUploadErrors(p => ({ ...p, [baseKey]: e.message }))
    } finally {
      setUploading(p => ({ ...p, [baseKey]: false }))
    }
  }, [])

  const handleLimparFiltros = () => setFiltros(FILTROS_INICIAL)

  // ── Exportações ────────────────────────────────────────────────────────────
  // Export sempre usa 'rows' (resultado dos filtros aplicados)
  const handleExportExcel = async () => {
    setGerandoXLSX(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      exportToExcel(rows.map(r => ({
      'PEP III':            r.pep_iii,
      'Tipo PEP':           r.tipo_pep,
      'Centro':             r.centro                   || '',
      'Tipo Movimento':     r.movement_type            || '',
      'Recebedor Merc.':    r.recebedor_mercadoria     || '',
      'Material':           r.material,
      'Descrição':          r.descricao                || '',
      'Grupo Mercadorias':  r.grupo_mercadorias        || '',
      'Tipo Mat':           r.tipo_mat                 || '',
      'Classe':             r.classe                   || '',
      'Qtde Prev':          r.qtde_prev,
      'Qtd Necessária':     r.qtd_necessaria,
      'Qtd Retirada':       r.qtd_retirada,
      'Saldo':              r.saldo,
      'Status':             r.status,
      'Valor Total':        r.valor_total,
      'Valor Pendente':     r.valor_pendente,
    })), 'aderencia_material.xlsx')
    } finally {
      setGerandoXLSX(false)
    }
  }

  // Colunas do PDF — formato correto: [{key, header}]
  const PDF_COLUMNS = [
    { key: 'pep_iii',              header: 'PEP III'       },
    { key: 'tipo_pep',             header: 'Tipo PEP'      },
    { key: 'centro',               header: 'Centro'        },
    { key: 'movement_type',        header: 'Mov.'          },
    { key: 'recebedor_mercadoria', header: 'Recebedor'     },
    { key: 'material',             header: 'Material'      },
    { key: 'grupo_mercadorias',    header: 'Grupo Merc.'   },
    { key: 'tipo_mat',             header: 'Tipo Mat'      },
    { key: 'classe',               header: 'Classe'        },
    { key: 'qtde_prev',            header: 'Qtde Prev'     },
    { key: 'saldo',                header: 'Saldo'         },
    { key: 'status',               header: 'Status'        },
    { key: 'valor_pendente',       header: 'Vlr Pendente'  },
  ]

  const handleExportPDF = async () => {
    setGerandoPDF(true)
    // Pequeno delay para o React renderizar o estado antes de bloquear a thread
    await new Promise(r => setTimeout(r, 50))
    try {
      exportToPDF(
        rows,
        PDF_COLUMNS,
        'Aderência de Material',
        'aderencia_material.pdf',
        { totais, totaisFiltrados, filtros, temFiltro }
      )
    } finally {
      setGerandoPDF(false)
    }
  }

  // ── Colunas da tabela ──────────────────────────────────────────────────────
  const columns = useMemo(() => [
    columnHelper.accessor('pep_iii', {
      header: 'PEP III',
      cell: i => <span className="font-mono text-xs whitespace-nowrap">{i.getValue() || '—'}</span>,
    }),
    columnHelper.accessor('tipo_pep', {
      header: 'Tipo PEP',
      cell: i => {
        const v = i.getValue()
        return v
          ? <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${v === 'M' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'}`}>{v}</span>
          : <span className="text-gray-400">—</span>
      },
    }),
    columnHelper.accessor('material', {
      header: 'Material',
      cell: i => <span className="font-mono text-xs">{i.getValue()}</span>,
    }),
    columnHelper.accessor('tipo_mat', {
      header: 'Tipo Mat',
      cell: i => i.getValue() || <span className="text-gray-400">—</span>,
    }),
    columnHelper.accessor('qtde_prev', {
      header: 'Qtde Prev',
      cell: i => <span className="font-medium">{fmt(i.getValue())}</span>,
    }),
    columnHelper.accessor('qtd_necessaria', {
      header: 'Qtd Neces.',
      cell: i => <span className="font-medium">{fmt(i.getValue())}</span>,
    }),
    columnHelper.accessor('qtd_retirada', {
      header: 'Qtd Retir.',
      cell: i => <span className="font-medium">{fmt(i.getValue())}</span>,
    }),
    columnHelper.accessor('saldo', {
      header: 'Saldo',
      cell: i => {
        const v = i.getValue()
        const color = v == 0
          ? 'text-green-600 dark:text-green-400'
          : v > 0
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400'
        return <span className={`font-bold ${color}`}>{fmt(v)}</span>
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: i => <StatusBadge status={i.getValue()} />,
    }),
    columnHelper.accessor('valor_total', {
      header: 'Valor Total',
      cell: i => <span className="text-sm tabular-nums">{fmtBRL(i.getValue())}</span>,
    }),
    columnHelper.accessor('valor_pendente', {
      header: 'Valor Pendente',
      cell: i => {
        const v = i.getValue()
        const color = v < 0
          ? 'text-red-600 dark:text-red-400'
          : v > 0
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-green-600 dark:text-green-400'
        return <span className={`text-sm tabular-nums font-medium ${color}`}>{fmtBRL(v)}</span>
      },
    }),
    columnHelper.accessor('classe', {
      header: 'Classe',
      cell: i => i.getValue() || <span className="text-gray-400">—</span>,
    }),
  ], [])

  const temAnalise = !!cn52nInfo && allRows.length > 0
  const temFiltro  = filtros.pep || filtros.tipoPep || filtros.material || filtros.descricao ||
                     filtros.tipoMat || filtros.classe || filtros.grupo ||
                     filtros.centro || filtros.tipoMov || filtros.recebedor ||
                     filtros.status !== 'TODOS'

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold mb-1">Aderência de Material</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Analise o que foi planejado × retirado por PEP
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 1 — CN52N (em memória, temporário)
      ══════════════════════════════════════════════════════════════════════ */}
      <Card className="border-2 border-blue-300 dark:border-blue-700">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-2">
              CN52N
            </span>
            <p className="font-semibold text-gray-800 dark:text-gray-100">Base de análise (temporária)</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Carregada em memória · Não é salva no banco · Limpa ao clicar em "Limpar análise"
            </p>
          </div>

          {cn52nInfo && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{cn52nInfo.nome}</p>
              <p className="text-xs text-gray-500">{cn52nInfo.total.toLocaleString('pt-BR')} registros carregados</p>
            </div>
          )}
        </div>

        {/* Estado: sem CN52N */}
        {!cn52nInfo && !loadingCN52N && (
          <div className="mt-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center">
            <Upload className="w-10 h-10 mx-auto text-blue-400 mb-3" />
            <p className="text-sm font-medium mb-1">Selecione o arquivo CN52N para iniciar a análise</p>
            <p className="text-xs text-gray-500 mb-4">Formatos aceitos: .xlsx, .xls, .csv</p>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <Upload className="w-4 h-4" /> Selecionar arquivo CN52N
              </span>
              <input ref={cn52nRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => handleCN52NUpload(e.target.files[0])} />
            </label>
          </div>
        )}

        {/* Estado: carregando */}
        {loadingCN52N && <Loading message="Processando CN52N..." />}

        {/* Estado: erro */}
        {erroCN52N && <Alert type="error" className="mt-3">{erroCN52N}</Alert>}

        {/* Estado: carregado */}
        {cn52nInfo && !loadingCN52N && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {cn52nInfo.total.toLocaleString('pt-BR')} registros em memória
              </span>
            </div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-400 text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Trocar arquivo
              </span>
              <input ref={cn52nRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => handleCN52NUpload(e.target.files[0])} />
            </label>
            <Button variant="secondary" onClick={handleLimparCN52N}
              className="flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-3.5 h-3.5" /> Limpar análise
            </Button>
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 2 — Tabelas de referência (salvas no banco)
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Tabelas de Referência — salvas no banco
          </span>
        </div>
        {loadingRef && <Loading message="Carregando referências..." />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BASES_REF.map(base => {
            const info   = importStatus[base.key]
            const colors = COLOR_MAP[base.color]
            const carregando = uploading[base.key]
            const erro   = uploadErrors[base.key]

            return (
              <Card key={base.key} className={`border ${colors.border}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${colors.badge}`}>
                    {base.label}
                  </span>
                  {info && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{base.subtitle}</p>

                {info && (
                  <div className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">{info.nome_arquivo}</span>
                    <br />
                    {info.total_registros?.toLocaleString('pt-BR')} registros
                    · {new Date(info.created_at).toLocaleString('pt-BR')}
                  </div>
                )}

                <p className="text-xs text-gray-400 mb-3">{base.campos}</p>

                {erro && <Alert type="error" className="mb-2 text-xs">{erro}</Alert>}

                {carregando ? (
                  <Loading message={`Importando ${base.label}...`} />
                ) : (
                  <label className="cursor-pointer block">
                    <span className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed ${colors.border} text-sm hover:opacity-80 transition-opacity`}>
                      <Upload className="w-4 h-4" />
                      {info ? 'Reimportar' : `Importar ${base.label}`}
                    </span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleRefUpload(base.key, e.target.files[0])} />
                  </label>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 3 — Dashboard de totais
      ══════════════════════════════════════════════════════════════════════ */}
      {temAnalise && totais && (
        <>
          {/* Linha 1 — contadores de registros e status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="!p-4">
              <div className="text-xs text-gray-500 mb-1">Total registros</div>
              <div className="text-xl font-bold">
                {temFiltro
                  ? <>{rows.length.toLocaleString('pt-BR')} <span className="text-sm font-normal text-gray-400">/ {totais.total.toLocaleString('pt-BR')}</span></>
                  : totais.total.toLocaleString('pt-BR')}
              </div>
            </Card>
            <Card className="!p-4">
              <div className="text-xs text-gray-500 mb-1">Qtd Necessária</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(totais.totalNecessario)}</div>
            </Card>
            <Card className="!p-4">
              <div className="text-xs text-gray-500 mb-1">✅ OK</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{totais.contOK.toLocaleString('pt-BR')}</div>
            </Card>
            <Card className="!p-4">
              <div className="text-xs text-gray-500 mb-1">⚠️ Pendente</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{totais.contPendente.toLocaleString('pt-BR')}</div>
            </Card>
            <Card className="!p-4">
              <div className="text-xs text-gray-500 mb-1">🔴 Retirado a mais</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{totais.contExcesso.toLocaleString('pt-BR')}</div>
            </Card>
          </div>

          {/* Linha 2 — indicadores financeiros dinâmicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="!p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    💰 Valor Total {temFiltro && <span className="text-blue-500 font-medium">(filtrado)</span>}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {fmtBRL(totaisFiltrados.valorTotal)}
                  </div>
                </div>
                {temFiltro && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total geral</div>
                    <div className="text-sm text-gray-500">{fmtBRL(totais.totalValor)}</div>
                  </div>
                )}
              </div>
            </Card>
            <Card className="!p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    ⚠️ Valor Pendente {temFiltro && <span className="text-yellow-600 font-medium">(filtrado)</span>}
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {fmtBRL(totaisFiltrados.valorPendente)}
                  </div>
                </div>
                {temFiltro && (
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total geral</div>
                    <div className="text-sm text-gray-500">{fmtBRL(totais.totalValorPend)}</div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 4 — Estado inicial sem CN52N
      ══════════════════════════════════════════════════════════════════════ */}
      {!cn52nInfo && !loadingCN52N && (
        <Card>
          <div className="text-center py-10">
            <AlertTriangle className="w-14 h-14 mx-auto text-yellow-400 mb-4" />
            <p className="text-lg font-medium mb-1">Carregue a base CN52N para iniciar a análise</p>
            <p className="text-gray-500 text-sm">
              CONVERSOR, SIGLA_MUN e MB52 já estão no banco e serão usadas automaticamente.
            </p>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 5 — Filtros
      ══════════════════════════════════════════════════════════════════════ */}
      {temAnalise && (
        <Card>
          {/* Linha 1 */}
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <div>
              <label className="block text-xs font-medium mb-1">PEP III</label>
              <input value={filtros.pep}
                onChange={e => setFiltros(p => ({ ...p, pep: e.target.value }))}
                placeholder="Ex: PI-2300412"
                className="input-field w-44 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tipo PEP</label>
              <select value={filtros.tipoPep}
                onChange={e => setFiltros(p => ({ ...p, tipoPep: e.target.value }))}
                className="input-field w-28 text-sm">
                <option value="">Todos</option>
                {opTipoPep.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tipo Movimento</label>
              <select value={filtros.tipoMov}
                onChange={e => setFiltros(p => ({ ...p, tipoMov: e.target.value }))}
                className="input-field w-32 text-sm">
                <option value="">Todos</option>
                {opTipoMov.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Centro</label>
              <select value={filtros.centro}
                onChange={e => setFiltros(p => ({ ...p, centro: e.target.value }))}
                className="input-field w-32 text-sm">
                <option value="">Todos</option>
                {opCentro.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Recebedor de Mercadoria</label>
              <select value={filtros.recebedor}
                onChange={e => setFiltros(p => ({ ...p, recebedor: e.target.value }))}
                className="input-field w-44 text-sm">
                <option value="">Todos</option>
                {opRecebedor.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select value={filtros.status}
                onChange={e => setFiltros(p => ({ ...p, status: e.target.value }))}
                className="input-field w-44 text-sm">
                <option value="TODOS">Todos</option>
                <option value="OK">OK</option>
                <option value="PENDENTE">Pendente</option>
                <option value="RETIRADO_A_MAIS">Retirado a mais</option>
              </select>
            </div>
          </div>
          {/* Linha 2 */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Material</label>
              <input value={filtros.material}
                onChange={e => setFiltros(p => ({ ...p, material: e.target.value }))}
                placeholder="Código do material"
                className="input-field w-40 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Texto Material</label>
              <select value={filtros.descricao}
                onChange={e => setFiltros(p => ({ ...p, descricao: e.target.value }))}
                className="input-field w-56 text-sm">
                <option value="">Todos</option>
                {opDescricao.map(v => <option key={v} value={v} title={v}>{v.length > 35 ? v.slice(0, 35) + '…' : v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tipo de Material <span className="text-gray-400 font-normal">(Subclasse)</span></label>
              <select value={filtros.tipoMat}
                onChange={e => setFiltros(p => ({ ...p, tipoMat: e.target.value }))}
                className="input-field w-44 text-sm">
                <option value="">Todos</option>
                {opTipoMat.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Classe <span className="text-gray-400 font-normal">(MB52)</span></label>
              <select value={filtros.classe}
                onChange={e => setFiltros(p => ({ ...p, classe: e.target.value }))}
                className="input-field w-36 text-sm">
                <option value="">Todos</option>
                {opClasse.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Grupo de Mercadorias</label>
              <input value={filtros.grupo}
                onChange={e => setFiltros(p => ({ ...p, grupo: e.target.value }))}
                placeholder="Ex: 13520"
                className="input-field w-36 text-sm" />
            </div>
            {temFiltro && (
              <Button type="button" variant="secondary" onClick={handleLimparFiltros}
                className="self-end">
                Limpar Filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 6 — Tabela de resultados
      ══════════════════════════════════════════════════════════════════════ */}
      {temAnalise && (
        <Card>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-semibold">
              Resultado da Análise{' '}
              <span className="text-sm font-normal text-gray-500">
                {temFiltro && rows.length !== allRows.length
                  ? `${rows.length.toLocaleString('pt-BR')} de ${allRows.length.toLocaleString('pt-BR')} registros`
                  : `${rows.length.toLocaleString('pt-BR')} registros`}
              </span>
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleExportExcel} disabled={gerandoXLSX}
                className={`flex items-center gap-1.5 min-w-[88px] justify-center transition-all ${gerandoXLSX ? 'opacity-70 cursor-wait' : ''}`}>
                {gerandoXLSX ? (
                  <>
                    <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <><FileSpreadsheet className="w-4 h-4" /> Excel</>
                )}
              </Button>
              <Button variant="secondary" onClick={handleExportPDF} disabled={gerandoPDF}
                className={`flex items-center gap-1.5 min-w-[80px] justify-center transition-all ${gerandoPDF ? 'opacity-70 cursor-wait' : ''}`}>
                {gerandoPDF ? (
                  <>
                    <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                    </svg>
                    Gerando...
                  </>
                ) : (
                  <><FileText className="w-4 h-4" /> PDF</>
                )}
              </Button>
            </div>
          </div>
          <DataTable data={rows} columns={columns} />
        </Card>
      )}
    </div>
  )
}
