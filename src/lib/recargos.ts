// Motor de cálculo de recargos.
// Replica la hoja "Convenciones" del Excel de nómina: cada turno se parte en
// HDO/HNO/HDF/HNF. Los turnos nocturnos cruzan medianoche, por lo que el reparto
// depende de si el DÍA SIGUIENTE es ordinario o festivo.

import { esFestivoOrDomingo, diaSiguiente } from './festivos'

export interface ConvencionRecargo {
  codigo: string
  hdo: number
  hno: number
  hdf: number
  hnf: number
  dia_siguiente: 'ord' | 'fes'
}

export interface AsignacionInput {
  fecha: string            // 'YYYY-MM-DD'
  base_codigo: string | null // base de convención (d, n, m8, ...) o null = sin recargo
}

export interface Recargo {
  hdo: number
  hno: number
  hdf: number
  hnf: number
  total: number
}

type ConvIndex = Map<string, ConvencionRecargo> // key: `${codigo}|${dia_siguiente}`

export function indexarConvenciones(convs: ConvencionRecargo[]): ConvIndex {
  const idx: ConvIndex = new Map()
  for (const c of convs) idx.set(`${c.codigo}|${c.dia_siguiente}`, c)
  return idx
}

function lookup(idx: ConvIndex, codigo: string, ds: 'ord' | 'fes'): ConvencionRecargo | undefined {
  // La dimensión "día siguiente" solo aplica a turnos nocturnos. Para los diurnos
  // existe una sola fila, así que caemos a cualquier variante del mismo código.
  return idx.get(`${codigo}|${ds}`) ?? idx.get(`${codigo}|ord`) ?? idx.get(`${codigo}|fes`)
}

const vacio: Recargo = { hdo: 0, hno: 0, hdf: 0, hnf: 0, total: 0 }

// Calcula el recargo de UNA asignación.
export function recargoAsignacion(
  asig: AsignacionInput,
  festivos: Set<string>,
  idx: ConvIndex,
): Recargo {
  if (!asig.base_codigo) return { ...vacio }
  const curFes = esFestivoOrDomingo(asig.fecha, festivos)
  const codigo = asig.base_codigo + (curFes ? 'fes' : 'ord')
  const nextFes = esFestivoOrDomingo(diaSiguiente(asig.fecha), festivos)
  const conv = lookup(idx, codigo, nextFes ? 'fes' : 'ord')
  if (!conv) return { ...vacio }
  return {
    hdo: conv.hdo,
    hno: conv.hno,
    hdf: conv.hdf,
    hnf: conv.hnf,
    total: conv.hdo + conv.hno + conv.hdf + conv.hnf,
  }
}

// Suma los recargos de un colaborador en el mes.
export function recargoMensual(
  asignaciones: AsignacionInput[],
  festivos: Set<string>,
  idx: ConvIndex,
): Recargo {
  return asignaciones.reduce<Recargo>((acc, a) => {
    const r = recargoAsignacion(a, festivos, idx)
    return {
      hdo: acc.hdo + r.hdo,
      hno: acc.hno + r.hno,
      hdf: acc.hdf + r.hdf,
      hnf: acc.hnf + r.hnf,
      total: acc.total + r.total,
    }
  }, { ...vacio })
}
