import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Paleta corporativa ────────────────────────────────────────────────────────
const COR = {
  azulEscuro:  [15,  55, 120],   // cabeçalho principal
  azulMedio:   [30,  90, 180],   // acento
  cinzaEscuro: [40,  40,  40],   // texto principal
  cinzaMedio:  [100,100, 100],   // texto secundário
  cinzaClaro:  [220,225, 235],   // bordas / linhas
  cinzaFundo:  [248,249, 252],   // fundo linhas pares
  branco:      [255,255, 255],
  verde:       [21, 128,  61],   // OK
  amarelo:     [146, 100,   0],  // Pendente
  vermelho:    [185,  28,  28],  // Excesso
  roxo:        [88,  28, 135],   // Qtd
}

// ── Formatadores ──────────────────────────────────────────────────────────────
const fmtNum = v => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }))
const fmtBRL = v => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

// Linha separadora sutil
function linha(doc, y, pageW, espessura = 0.2) {
  doc.setDrawColor(...COR.cinzaClaro)
  doc.setLineWidth(espessura)
  doc.line(14, y, pageW - 14, y)
}

// Card minimalista: borda esquerda colorida + fundo cinza muito claro
function drawCardMinimal(doc, x, y, w, h, corBorda, titulo, valor, sub = '') {
  // Fundo
  doc.setFillColor(...COR.cinzaFundo)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  // Borda esquerda colorida (4 px)
  doc.setFillColor(...corBorda)
  doc.rect(x, y, 3, h, 'F')
  // Titulo
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COR.cinzaMedio)
  doc.text(titulo, x + 6, y + 6)
  // Valor
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...corBorda)
  doc.text(valor, x + 6, y + 14)
  // Sub
  if (sub) {
    doc.setFontSize(5.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COR.cinzaMedio)
    doc.text(sub, x + 6, y + 19)
  }
  doc.setTextColor(...COR.cinzaEscuro)
}

/**
 * Exporta PDF com pagina de resumo + tabela de dados
 * @param {Array}  data      - Registros filtrados
 * @param {Array}  columns   - [{ key, header }]
 * @param {string} title     - Titulo do relatorio
 * @param {string} filename  - Nome do arquivo
 * @param {Object} resumo    - { totais, totaisFiltrados, filtros, temFiltro }
 */
export function exportToPDF(data, columns, title, filename = 'export.pdf', resumo = {}) {
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const agora = new Date().toLocaleString('pt-BR')

  const {
    totais          = {},
    totaisFiltrados = {},
    filtros         = {},
    temFiltro       = false,
  } = resumo

  // ══════════════════════════════════════════════════════════════════════════
  // PAGINA 1 — RESUMO EXECUTIVO
  // ══════════════════════════════════════════════════════════════════════════

  // ── Cabecalho azul escuro ──────────────────────────────────────────────────
  doc.setFillColor(...COR.azulEscuro)
  doc.rect(0, 0, pageW, 20, 'F')

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR.branco)
  doc.text(title, 14, 12)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 215, 240)
  doc.text(`Emitido em: ${agora}`, pageW - 14, 9, { align: 'right' })
  doc.text(`${data.length.toLocaleString('pt-BR')} registros`, pageW - 14, 15, { align: 'right' })
  doc.setTextColor(...COR.cinzaEscuro)

  // ── Titulo da secao ────────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR.cinzaMedio)
  doc.text('RESUMO EXECUTIVO', 14, 28)
  linha(doc, 30, pageW)

  // ── Linha 1 de cards — Contadores ─────────────────────────────────────────
  const cardW = (pageW - 28 - 5 * 4) / 6   // 6 cards com gap de 4mm
  const cardH = 24
  const gap   = 4
  const cy1   = 33

  const contadores = [
    { titulo: 'Total de Registros', valor: data.length.toLocaleString('pt-BR'),
      sub: totais.total && temFiltro ? `de ${totais.total.toLocaleString('pt-BR')} total` : '',
      cor: COR.azulMedio },
    { titulo: 'Status: OK',        valor: (totais.contOK      ?? 0).toLocaleString('pt-BR'), cor: COR.verde    },
    { titulo: 'Status: Pendente',  valor: (totais.contPendente?? 0).toLocaleString('pt-BR'), cor: COR.amarelo  },
    { titulo: 'Retirado a Mais',   valor: (totais.contExcesso ?? 0).toLocaleString('pt-BR'), cor: COR.vermelho },
    { titulo: 'Qtd. Necessaria',   valor: fmtNum(totais.totalNecessario),                    cor: COR.roxo     },
    { titulo: 'Qtd. Retirada',     valor: fmtNum(totais.totalRetirado),                      cor: COR.azulMedio},
  ]

  contadores.forEach((c, i) => {
    drawCardMinimal(doc, 14 + i * (cardW + gap), cy1, cardW, cardH, c.cor, c.titulo, c.valor, c.sub || '')
  })

  // ── Linha 2 de cards — Financeiro ─────────────────────────────────────────
  const cy2    = cy1 + cardH + gap
  const cardWF = (pageW - 28 - gap) / 2

  drawCardMinimal(doc, 14, cy2, cardWF, 26,
    COR.azulMedio,
    'Valor Total',
    fmtBRL(totaisFiltrados.valorTotal ?? totais.totalValor),
    temFiltro ? `Filtrado  |  Total geral: ${fmtBRL(totais.totalValor)}` : 'Total geral'
  )

  drawCardMinimal(doc, 14 + cardWF + gap, cy2, cardWF, 26,
    COR.amarelo,
    'Valor Pendente',
    fmtBRL(totaisFiltrados.valorPendente ?? totais.totalValorPend),
    temFiltro ? `Filtrado  |  Total geral: ${fmtBRL(totais.totalValorPend)}` : 'Total geral'
  )

  // ── Filtros aplicados ──────────────────────────────────────────────────────
  const cyF = cy2 + 26 + 10
  linha(doc, cyF, pageW)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR.cinzaMedio)
  doc.text('FILTROS APLICADOS', 14, cyF + 6)

  const LABEL_FILTRO = {
    pep:       'PEP III',
    tipoPep:   'Tipo PEP',
    tipoMov:   'Tipo de Movimento',
    centro:    'Centro',
    recebedor: 'Recebedor de Mercadoria',
    status:    'Status',
    material:  'Material',
    descricao: 'Texto Material',
    tipoMat:   'Tipo de Material',
    classe:    'Classe',
    grupo:     'Grupo de Mercadorias',
  }

  const ativos = Object.entries(filtros).filter(([, v]) => v && v !== 'TODOS')

  if (!ativos.length) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...COR.cinzaMedio)
    doc.text('Nenhum filtro aplicado — exibindo todos os registros.', 14, cyF + 13)
  } else {
    autoTable(doc, {
      startY:     cyF + 8,
      head:       [['Filtro', 'Valor']],
      body:       ativos.map(([k, v]) => [LABEL_FILTRO[k] || k, v]),
      styles:     { fontSize: 8, cellPadding: 2.5, textColor: COR.cinzaEscuro },
      headStyles: { fillColor: COR.azulEscuro, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, fillColor: COR.cinzaFundo } },
      alternateRowStyles: { fillColor: COR.branco },
      margin:     { left: 14, right: 14 },
      tableWidth: 140,
    })
  }

  // ── Rodape pag 1 ──────────────────────────────────────────────────────────
  linha(doc, pageH - 10, pageW)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COR.cinzaMedio)
  doc.text('Ferramentas CENA  -  Aderencia de Material', 14, pageH - 5)
  doc.text('Pagina 1 de 2', pageW - 14, pageH - 5, { align: 'right' })
  doc.setTextColor(...COR.cinzaEscuro)

  // ══════════════════════════════════════════════════════════════════════════
  // PAGINA 2+ — DADOS DETALHADOS
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage()

  // Faixa azul fina no topo
  doc.setFillColor(...COR.azulEscuro)
  doc.rect(0, 0, pageW, 13, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COR.branco)
  doc.text(`${title}  -  Detalhamento`, 14, 8.5)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(agora, pageW - 14, 8.5, { align: 'right' })
  doc.setTextColor(...COR.cinzaEscuro)

  const headers = columns.map(c => c.header)
  const body    = data.map(row =>
    columns.map(c => {
      const v = row[c.key]
      if (v == null || v === '') return '-'
      if (typeof v === 'number')  return v.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
      return String(v)
    })
  )

  let totalPags = 1
  autoTable(doc, {
    head:   [headers],
    body,
    startY: 17,
    styles: {
      fontSize:    6.5,
      cellPadding: 1.8,
      overflow:    'linebreak',
      textColor:   COR.cinzaEscuro,
    },
    headStyles: {
      fillColor:  COR.azulEscuro,
      textColor:  255,
      fontStyle:  'bold',
      fontSize:   7,
    },
    alternateRowStyles: { fillColor: COR.cinzaFundo },
    margin: { left: 10, right: 10 },
    didDrawPage: () => {
      totalPags = doc.internal.getNumberOfPages()
      // Linha + rodape em cada pagina de dados
      doc.setDrawColor(...COR.cinzaClaro)
      doc.setLineWidth(0.2)
      doc.line(10, pageH - 9, pageW - 10, pageH - 9)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COR.cinzaMedio)
      doc.text('Ferramentas CENA  -  Aderencia de Material', 14, pageH - 4.5)
      doc.text(`Pagina ${doc.internal.getCurrentPageInfo().pageNumber} de ?`, pageW - 14, pageH - 4.5, { align: 'right' })
      doc.setTextColor(...COR.cinzaEscuro)
    },
  })

  // Corrige numero de paginas em todos os rodapes
  const total = doc.internal.getNumberOfPages()
  for (let p = 2; p <= total; p++) {
    doc.setPage(p)
    doc.setFillColor(...COR.branco)
    doc.rect(pageW - 40, pageH - 8, 36, 6, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COR.cinzaMedio)
    doc.text(`Pagina ${p} de ${total}`, pageW - 14, pageH - 4.5, { align: 'right' })
  }

  doc.save(filename)
}
