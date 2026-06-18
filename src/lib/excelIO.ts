import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// Exporta una lista simple a Excel con encabezado azul institucional.
export async function exportarExcelSimple(
  archivo: string, hoja: string, headers: string[], filas: (string | number)[][], anchos?: number[],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(hoja)
  ws.addRow(headers)
  const h = ws.getRow(1)
  h.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
  filas.forEach(f => ws.addRow(f))
  headers.forEach((_, i) => { ws.getColumn(i + 1).width = anchos?.[i] ?? (i === 0 ? 30 : 18) })
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), archivo)
}

// Lee la primera hoja de un Excel y devuelve sus filas como arreglos de texto.
export async function leerFilas(file: File): Promise<string[][]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  const out: string[][] = []
  ws.eachRow(row => {
    const cells: string[] = []
    row.eachCell({ includeEmpty: true }, c => cells.push(String(c.text ?? '').trim()))
    out.push(cells)
  })
  return out
}
