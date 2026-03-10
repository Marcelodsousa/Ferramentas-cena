import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Plus, Trash2, FileText, ShoppingCart, History } from 'lucide-react'
import { gerarNumeroRequisicao, validarRequisicao, novoMaterial } from '../../utils/requisicaoMaterial'
import { getFromStorage, saveToStorage, STORAGE_KEYS } from '../../services/storageService'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import Modal from '../../components/UI/Modal'

const UNIDADES = ['UN', 'M', 'M²', 'M³', 'KG', 'CX', 'PC', 'L', 'TON', 'SC']

const FORM_INICIAL = {
  obra: '',
  local: '',
  operacao: '',
  responsavelOperacao: '',
  responsavelAlmoxarifado: '',
}

function RequisicaoMaterial() {
  const [form, setForm] = useState(FORM_INICIAL)
  const [materiais, setMateriais] = useState([novoMaterial(0)])
  const [erros, setErros] = useState([])
  const [showHistorico, setShowHistorico] = useState(false)
  const [sucesso, setSucesso] = useState('')

  const historico = getFromStorage(STORAGE_KEYS.REQUISICOES, [])

  // ── Formulário ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── Materiais ────────────────────────────────────────────────────────────
  const adicionarMaterial = () => {
    setMateriais(prev => [...prev, novoMaterial(prev.length)])
  }

  const removerMaterial = (id) => {
    setMateriais(prev => prev.filter(m => m.id !== id))
  }

  const handleMaterialChange = (id, campo, valor) => {
    setMateriais(prev =>
      prev.map(m => m.id === id ? { ...m, [campo]: valor } : m)
    )
  }

  // ── Geração de PDF ───────────────────────────────────────────────────────
  const gerarPDF = (requisicao) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Cabeçalho
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('REQUISIÇÃO DE MATERIAL', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nº ${requisicao.numero}`, pageWidth / 2, 28, { align: 'center' })

    // Dados da requisição
    doc.setFontSize(10)
    const col1X = 14
    const col2X = 110
    let y = 40

    const campo = (label, valor, x, yPos) => {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, x, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(valor || '-', x + 45, yPos)
    }

    campo('Data', new Date(requisicao.data).toLocaleDateString('pt-BR'), col1X, y)
    campo('Nº Requisição', requisicao.numero, col2X, y)
    y += 8
    campo('Obra', requisicao.form.obra, col1X, y)
    campo('Local', requisicao.form.local, col2X, y)
    y += 8
    campo('Operação', requisicao.form.operacao, col1X, y)
    y += 8
    campo('Resp. Operação', requisicao.form.responsavelOperacao, col1X, y)
    campo('Resp. Almoxarifado', requisicao.form.responsavelAlmoxarifado, col2X, y)
    y += 12

    // Tabela de materiais
    autoTable(doc, {
      startY: y,
      head: [['SKU', 'Descrição', 'Qtd', 'Unidade']],
      body: requisicao.materiais.map(m => [m.sku, m.descricao, m.quantidade, m.unidade]),
      headStyles: { fillColor: [37, 132, 196] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 35 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
      },
    })

    // Assinaturas
    const afterTable = doc.lastAutoTable.finalY + 20
    doc.setFontSize(10)
    doc.line(14, afterTable, 85, afterTable)
    doc.line(110, afterTable, 195, afterTable)
    doc.text('Responsável da Operação', 14, afterTable + 6)
    doc.text('Responsável do Almoxarifado', 110, afterTable + 6)

    doc.save(`requisicao_${requisicao.numero}.pdf`)
  }

  // ── Submissão ────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const errosList = validarRequisicao(form, materiais)
    if (errosList.length > 0) {
      setErros(errosList)
      return
    }
    setErros([])

    const historicoAtual = getFromStorage(STORAGE_KEYS.REQUISICOES, [])
    const requisicao = {
      id: Date.now(),
      numero: gerarNumeroRequisicao(historicoAtual),
      data: new Date().toISOString(),
      form,
      materiais,
    }

    saveToStorage(STORAGE_KEYS.REQUISICOES, [requisicao, ...historicoAtual])
    gerarPDF(requisicao)

    // Reset
    setForm(FORM_INICIAL)
    setMateriais([novoMaterial(0)])
    setSucesso(`Requisição ${requisicao.numero} gerada e salva com sucesso!`)
    setTimeout(() => setSucesso(''), 5000)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Requisição de Material</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Gere requisições formais de materiais para o almoxarifado
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowHistorico(true)}>
          <History className="w-4 h-4 mr-2 inline" />
          Histórico ({historico.length})
        </Button>
      </div>

      {sucesso && <Alert type="success">{sucesso}</Alert>}

      {erros.length > 0 && (
        <Alert type="error">
          <ul className="list-disc list-inside space-y-1">
            {erros.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Alert>
      )}

      {/* Dados da Requisição */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Dados da Requisição</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Obra <span className="text-red-500">*</span>
            </label>
            <input
              name="obra"
              value={form.obra}
              onChange={handleFormChange}
              placeholder="Nome da obra ou projeto"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Local <span className="text-red-500">*</span>
            </label>
            <input
              name="local"
              value={form.local}
              onChange={handleFormChange}
              placeholder="Local de aplicação"
              className="input-field"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Operação <span className="text-red-500">*</span>
            </label>
            <input
              name="operacao"
              value={form.operacao}
              onChange={handleFormChange}
              placeholder="Descrição da operação"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Responsável da Operação <span className="text-red-500">*</span>
            </label>
            <input
              name="responsavelOperacao"
              value={form.responsavelOperacao}
              onChange={handleFormChange}
              placeholder="Nome do responsável"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Responsável do Almoxarifado <span className="text-red-500">*</span>
            </label>
            <input
              name="responsavelAlmoxarifado"
              value={form.responsavelAlmoxarifado}
              onChange={handleFormChange}
              placeholder="Nome do responsável"
              className="input-field"
            />
          </div>
        </div>
      </Card>

      {/* Lista de Materiais */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Lista de Materiais <span className="text-sm font-normal text-gray-500">({materiais.length} {materiais.length === 1 ? 'item' : 'itens'})</span>
          </h3>
          <Button onClick={adicionarMaterial}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Adicionar Material
          </Button>
        </div>

        <div className="space-y-3">
          {/* Cabeçalho da tabela */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2">
            <div className="col-span-2">SKU</div>
            <div className="col-span-5">Descrição</div>
            <div className="col-span-2">Quantidade</div>
            <div className="col-span-2">Unidade</div>
            <div className="col-span-1"></div>
          </div>

          {materiais.map((m, index) => (
            <div key={m.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-700/40 rounded-lg p-2">
              {/* SKU */}
              <div className="col-span-12 md:col-span-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 md:hidden">SKU: </span>
                <span className="font-mono text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-2 py-1 rounded">
                  {m.sku}
                </span>
              </div>

              {/* Descrição */}
              <div className="col-span-12 md:col-span-5">
                <input
                  value={m.descricao}
                  onChange={e => handleMaterialChange(m.id, 'descricao', e.target.value)}
                  placeholder="Descrição do material"
                  className="input-field text-sm"
                />
              </div>

              {/* Quantidade */}
              <div className="col-span-5 md:col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={m.quantidade}
                  onChange={e => handleMaterialChange(m.id, 'quantidade', e.target.value)}
                  placeholder="Qtd"
                  className="input-field text-sm"
                />
              </div>

              {/* Unidade */}
              <div className="col-span-5 md:col-span-2">
                <select
                  value={m.unidade}
                  onChange={e => handleMaterialChange(m.id, 'unidade', e.target.value)}
                  className="input-field text-sm"
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Remover */}
              <div className="col-span-2 md:col-span-1 flex justify-end">
                <button
                  onClick={() => removerMaterial(m.id)}
                  disabled={materiais.length === 1}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remover material"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} className="px-8">
            <FileText className="w-4 h-4 mr-2 inline" />
            Gerar Requisição (PDF)
          </Button>
        </div>
      </Card>

      {/* Modal de Histórico */}
      <Modal
        isOpen={showHistorico}
        onClose={() => setShowHistorico(false)}
        title={`Histórico de Requisições (${historico.length})`}
      >
        {historico.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma requisição gerada ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {historico.map(req => (
              <div key={req.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-primary-600 dark:text-primary-400">{req.numero}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(req.data).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>Obra:</strong> {req.form.obra}</p>
                  <p><strong>Local:</strong> {req.form.local}</p>
                  <p><strong>Operação:</strong> {req.form.operacao}</p>
                  <p><strong>Resp. Operação:</strong> {req.form.responsavelOperacao}</p>
                  <p><strong>Materiais:</strong> {req.materiais.length} {req.materiais.length === 1 ? 'item' : 'itens'}</p>
                </div>
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => gerarPDF(req)} className="text-sm py-1 px-3">
                    <FileText className="w-3 h-3 mr-1 inline" />
                    Reimprimir PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default RequisicaoMaterial
