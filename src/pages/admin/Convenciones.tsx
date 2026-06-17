import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/ui'

interface MapeoRow { id: string; sigla_id: string; base_codigo: string | null; revisado: boolean; sigla: string; descripcion: string }
interface Conv { id: string; codigo: string; nombre: string; horas: number; hdo: number; hno: number; hdf: number; hnf: number; dia_siguiente: string }

const BASES = [
  { v: '', l: 'Sin recargo (libre/ausencia)' },
  { v: 'd', l: 'd — Diurno 12h' }, { v: 'n', l: 'n — Nocturno 12h' },
  { v: 'm8', l: 'm8 — Mañana 8h' }, { v: 't8', l: 't8 — Tarde 8h' }, { v: 'n8', l: 'n8 — Noche 8h' },
  { v: 'm', l: 'm — Mañana 6h' }, { v: 't', l: 't — Tarde 6h' },
  { v: 'c', l: 'c — Día 11h' }, { v: 'p', l: 'p — Noche 11h' },
  { v: 'a', l: 'a — Admin 9h' }, { v: 'b', l: 'b — Admin 8h' },
]

export default function Convenciones() {
  const [mapeo, setMapeo] = useState<MapeoRow[]>([])
  const [convs, setConvs] = useState<Conv[]>([])

  const cargar = async () => {
    const { data } = await supabase.from('mapeo_siglas_convencion')
      .select('id,sigla_id,base_codigo,revisado,catalogo_siglas(sigla,descripcion)')
    const rows: MapeoRow[] = (data ?? []).map((m: any) => ({
      id: m.id, sigla_id: m.sigla_id, base_codigo: m.base_codigo, revisado: m.revisado,
      sigla: m.catalogo_siglas?.sigla ?? '', descripcion: m.catalogo_siglas?.descripcion ?? '',
    })).sort((a, b) => a.sigla.localeCompare(b.sigla))
    setMapeo(rows)
    const { data: c } = await supabase.from('convenciones_recargo').select('*').order('codigo')
    setConvs((c as Conv[]) ?? [])
  }
  useEffect(() => { cargar() }, [])

  async function setBase(row: MapeoRow, base: string) {
    await supabase.from('mapeo_siglas_convencion').update({ base_codigo: base || null, revisado: true }).eq('id', row.id)
    setMapeo(ms => ms.map(m => m.id === row.id ? { ...m, base_codigo: base || null, revisado: true } : m))
  }

  return (
    <div>
      <PageHeader title="Convenciones de recargo" subtitle="Equivalencia entre siglas de programación y el cálculo de recargos" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h3 className="font-semibold text-brand mb-3">Mapeo sigla → recargo</h3>
          <p className="text-xs text-gray-500 mb-3">Las filas en ámbar requieren tu confirmación.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand text-left"><tr><th className="px-2 py-2">Sigla</th><th className="px-2 py-2">Descripción</th><th className="px-2 py-2">Base de recargo</th></tr></thead>
              <tbody>
                {mapeo.map(m => (
                  <tr key={m.id} className={`border-t border-gray-100 ${!m.revisado ? 'bg-amber-50' : ''}`}>
                    <td className="px-2 py-1.5 font-bold text-brand">{m.sigla}</td>
                    <td className="px-2 py-1.5 text-gray-500 text-xs">{m.descripcion}</td>
                    <td className="px-2 py-1.5">
                      <select value={m.base_codigo ?? ''} onChange={e => setBase(m, e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-light">
                        {BASES.map(b => <option key={b.v} value={b.v}>{b.l}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h3 className="font-semibold text-brand mb-3">Tabla de conversión (horas)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand text-left"><tr><th className="px-2 py-2">Código</th><th className="px-2 py-2">Día sig.</th><th className="px-2 py-2 text-right">HDO</th><th className="px-2 py-2 text-right">HNO</th><th className="px-2 py-2 text-right">HDF</th><th className="px-2 py-2 text-right">HNF</th></tr></thead>
              <tbody>
                {convs.map(c => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 font-medium" title={c.nombre}>{c.codigo}</td>
                    <td className="px-2 py-1.5 text-gray-500">{c.dia_siguiente}</td>
                    <td className="px-2 py-1.5 text-right">{c.hdo}</td>
                    <td className="px-2 py-1.5 text-right">{c.hno}</td>
                    <td className="px-2 py-1.5 text-right">{c.hdf}</td>
                    <td className="px-2 py-1.5 text-right">{c.hnf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
