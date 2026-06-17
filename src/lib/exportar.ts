import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

;(pdfMake as unknown as { vfs: unknown }).vfs = (pdfFonts as unknown as { pdfMake?: { vfs: unknown }; vfs?: unknown }).pdfMake?.vfs
  ?? (pdfFonts as unknown as { vfs: unknown }).vfs

export interface Celda { v: string | number; bg?: string; fg?: string; bold?: boolean }
export interface Matriz {
  titulo: string
  sub: string
  encabezado: Celda[]
  filas: Celda[][]
}

const argb = (hex?: string) => hex ? 'FF' + hex.replace('#', '').toUpperCase().padStart(6, '0') : undefined

export async function exportarExcel(m: Matriz, archivo: string) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Programación')

  ws.addRow([m.titulo]); ws.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0D2D6B' } }
  ws.addRow([m.sub]); ws.getRow(2).font = { italic: true, color: { argb: 'FF6B7280' } }
  ws.addRow([])

  const escribir = (cells: Celda[]) => {
    const row = ws.addRow(cells.map(c => c.v))
    cells.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' }
      const lado = { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      cell.border = { top: lado, bottom: lado, left: lado, right: lado }
      if (c.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(c.bg)! } }
      cell.font = { bold: c.bold, color: c.fg ? { argb: argb(c.fg)! } : undefined, size: 9 }
    })
  }
  escribir(m.encabezado)
  m.filas.forEach(escribir)

  ws.getColumn(1).width = 28
  for (let i = 2; i <= m.encabezado.length; i++) ws.getColumn(i).width = 4.5
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 4 }]

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivo + '.xlsx')
}

export function exportarPDF(m: Matriz, archivo: string) {
  const fila = (cells: Celda[], header = false): unknown[] => cells.map((c, i) => ({
    text: String(c.v),
    bold: c.bold || header,
    alignment: i === 0 ? 'left' : 'center',
    fontSize: 6,
    color: c.fg ?? (header ? '#FFFFFF' : '#1f2937'),
    fillColor: c.bg ?? (header ? '#0D2D6B' : undefined),
  }))
  const body = [fila(m.encabezado, true), ...m.filas.map(f => fila(f))]
  const widths = m.encabezado.map((_, i) => (i === 0 ? 90 : 'auto'))

  const doc = {
    pageOrientation: 'landscape',
    pageSize: 'A3',
    pageMargins: [16, 50, 16, 24],
    header: { text: `${m.titulo}  —  ${m.sub}`, margin: [16, 16, 16, 0], fontSize: 11, bold: true, color: '#0D2D6B' },
    content: [{ table: { headerRows: 1, widths, body }, layout: { hLineColor: () => '#E5E7EB', vLineColor: () => '#E5E7EB' } }],
    defaultStyle: { fontSize: 7 },
  }
  pdfMake.createPdf(doc as unknown as Parameters<typeof pdfMake.createPdf>[0]).download(archivo + '.pdf')
}
