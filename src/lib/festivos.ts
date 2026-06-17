// Determina si una fecha es "festiva" para efectos de recargos:
// domingo (día 0) o festivo nacional de Colombia.
// `festivos` es un Set de fechas 'YYYY-MM-DD'.

export function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function esFestivoOrDomingo(fecha: string, festivos: Set<string>): boolean {
  const d = parseYmd(fecha)
  return d.getDay() === 0 || festivos.has(fecha)
}

export function diaSiguiente(fecha: string): string {
  const d = parseYmd(fecha)
  d.setDate(d.getDate() + 1)
  return ymd(d)
}
