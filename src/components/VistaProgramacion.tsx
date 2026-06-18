import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CatalogoSigla, Colaborador } from '../lib/types'
import { semanasDelMes } from '../lib/calendario'

const CONTADORES: { cat: CatalogoSigla['categoria_capacidad']; label: string }[] = [
  { cat: 'dia', label: 'Total personal día' },
  { cat: 'manana', label: 'Total personal mañana (M8)' },
  { cat: 'tarde', label: 'Total personal tarde (T8)' },
  { cat: 'noche', label: 'Total personal noche' },
  { cat: 'noche8', label: 'Personal N8' },
]

// Vista de SOLO LECTURA de la programación de un servicio/cargo/mes.
export default function VistaProgramacion({ servicioId, cargoId, anio, mes }:
  { servicioId: string; cargoId: string; anio: number; mes: number }) {
  const [colabs, setColabs] = useState<Colaborador[]>([])
  const [asig, setAsig] = useState<Map<string, string>>(new Map())
  const [siglas, setSiglas] = useState<CatalogoSigla[]>([])
  const [festivos, setFestivos] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(true)
  const [vacio, setVacio] = useState(false)

  useEffect(() => {
    let activo = true
    async function load() {
      setCargando(true); setVacio(false)
      const [{ data: prog }, { data: sigs }, { data: fes }] = await Promise.all([
        supabase.from('programaciones').select('id').eq('servicio_id', servicioId).eq('cargo_id', cargoId).eq('anio', anio).eq('mes', mes).maybeSingle(),
        supabase.from('catalogo_siglas').select('*').eq('activo', true).order('orden'),
        supabase.from('festivos_colombia').select('fecha'),
      ])
      if (!activo) return
      setSiglas((sigs as CatalogoSigla[]) ?? [])
      setFestivos(new Set((fes ?? []).map((f: { fecha: string }) => f.fecha)))
      if (!prog) { setVacio(true); setColabs([]); setAsig(new Map()); setCargando(false); return }
      const pid = (prog as { id: string }).id
      const [{ data: cs }, { data: as }] = await Promise.all([
        supabase.from('colaboradores').select('*').eq('servicio_id', servicioId).eq('cargo_id', cargoId).eq('activo', true).order('nombre_completo'),
        supabase.from('asignaciones').select('colaborador_id,fecha,sigla_id').eq('programacion_id', pid),
      ])
      if (!activo) return
      setColabs((cs as Colaborador[]) ?? [])
      const m = new Map<string, string>()
      ;(as ?? []).forEach((a: { colaborador_id: string; fecha: string; sigla_id: string }) => m.set(`${a.colaborador_id}|${a.fecha}`, a.sigla_id))
      setAsig(m)
      setCargando(false)
    }
    load()
    return () => { activo = false }
  }, [servicioId, cargoId, anio, mes])

  const siglaMap = useMemo(() => { const m = new Map<string, CatalogoSigla>(); siglas.forEach(s => m.set(s.id, s)); return m }, [siglas])
  const semanas = useMemo(() => semanasDelMes(anio, mes, festivos), [anio, mes, festivos])
  const horasSemana = (colId: string, dias: { fecha: string }[]) =>
    dias.reduce((t, d) => t + (siglaMap.get(asig.get(`${colId}|${d.fecha}`) ?? '')?.horas ?? 0), 0)
  const contar = (fecha: string, cat: CatalogoSigla['categoria_capacidad']) =>
    colabs.reduce((t, c) => t + (siglaMap.get(asig.get(`${c.id}|${fecha}`) ?? '')?.categoria_capacidad === cat ? 1 : 0), 0)

  if (cargando) return <p className="text-sm text-gray-400 py-3">Cargando programación…</p>
  if (vacio) return <p className="text-sm text-gray-400 py-3">No existe programación creada para este período.</p>
  if (colabs.length === 0) return <p className="text-sm text-gray-400 py-3">Sin colaboradores en este servicio/cargo.</p>

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className="sticky left-0 z-10 bg-brand text-white px-3 py-1.5 text-left min-w-[180px]">Colaborador</th>
            {semanas.flatMap(s => s.dias.map(d => (
              <th key={`n${d.fecha}`} className={`border px-1 py-0.5 ${d.esFes ? 'bg-red-100 text-red-700 font-bold' : 'bg-brand-50 text-brand'}`}>{d.letra}<br />{d.dia}</th>
            ))).concat(<th key="th-tot" rowSpan={2} className="bg-brand-dark text-white px-2 border border-white/20">Total</th>)}
          </tr>
        </thead>
        <tbody>
          {colabs.map(c => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="sticky left-0 z-10 bg-white border px-3 py-1 font-medium text-gray-700 whitespace-nowrap">{c.nombre_completo}</td>
              {semanas.flatMap(s => s.dias.map(d => {
                const sig = siglaMap.get(asig.get(`${c.id}|${d.fecha}`) ?? '')
                return <td key={d.fecha} className={`border px-1 py-1 text-center ${d.esFes ? 'bg-red-50/40' : ''}`}>{sig?.sigla ?? ''}</td>
              }))}
              <td className="border px-2 text-center font-bold text-brand bg-brand-50">{semanas.reduce((t, s) => t + horasSemana(c.id, s.dias), 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {CONTADORES.map(({ cat, label }) => (
            <tr key={cat} className="bg-gray-50">
              <td className="sticky left-0 z-10 bg-gray-100 border px-3 py-1 font-semibold text-brand whitespace-nowrap">{label}</td>
              {semanas.flatMap(s => s.dias.map(d => <td key={d.fecha} className="border px-1 text-center text-gray-700">{contar(d.fecha, cat) || ''}</td>))}
              <td className="border bg-gray-100"></td>
            </tr>
          ))}
        </tfoot>
      </table>
      <p className="px-3 py-2 text-xs text-gray-400">Vista de solo lectura · objetivo semanal 44 h.</p>
    </div>
  )
}
