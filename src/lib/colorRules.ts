import type { ReglaColor } from './types'

export interface ColorRes { bg: string; fg: string }

// Devuelve el color de la primera regla que cumpla, según las horas semanales.
export function colorHoras(h: number, reglas: ReglaColor[]): ColorRes | null {
  const orden = [...reglas].filter(r => r.activo).sort((a, b) => a.orden - b.orden)
  for (const r of orden) {
    const min = r.valor_min ?? 0
    const max = r.valor_max ?? 0
    let ok = false
    switch (r.operador) {
      case '=': ok = h === min; break
      case '<': ok = h < min; break
      case '>': ok = h > min; break
      case '<=': ok = h <= min; break
      case '>=': ok = h >= min; break
      case 'between': ok = h >= min && h <= max; break
    }
    if (ok) return { bg: r.color, fg: r.texto }
  }
  return null
}
