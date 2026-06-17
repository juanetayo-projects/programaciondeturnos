import { esFestivoOrDomingo, ymd } from './festivos'

export interface DiaCal { fecha: string; dia: number; dow: number; letra: string; esFes: boolean; esDom: boolean }
export interface SemanaCal { indice: number; dias: DiaCal[] }

const LETRAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] // por día de la semana (0=Dom)

// Genera las semanas (Lun→Dom) del mes, incluyendo solo los días del mes.
// Una semana nueva inicia cada lunes.
export function semanasDelMes(anio: number, mes: number, festivos: Set<string>): SemanaCal[] {
  const dias = new Date(anio, mes, 0).getDate() // mes 1-12 → días del mes
  const semanas: SemanaCal[] = []
  let actual: DiaCal[] = []
  let idx = 0
  for (let d = 1; d <= dias; d++) {
    const fecha = new Date(anio, mes - 1, d)
    const dow = fecha.getDay()
    if (dow === 1 && actual.length) { semanas.push({ indice: idx++, dias: actual }); actual = [] }
    const f = ymd(fecha)
    actual.push({ fecha: f, dia: d, dow, letra: LETRAS[dow], esFes: festivos.has(f) || dow === 0, esDom: dow === 0 })
    void esFestivoOrDomingo // (regla de festivo centralizada en festivos.ts)
  }
  if (actual.length) semanas.push({ indice: idx, dias: actual })
  return semanas
}
