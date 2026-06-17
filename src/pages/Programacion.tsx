import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { Cargo, CatalogoSigla, Colaborador, ReglaColor, Servicio } from '../lib/types'
import { semanasDelMes, type SemanaCal } from '../lib/calendario'
import { colorHoras } from '../lib/colorRules'
import { Btn, FilterBar, PageHeader, selectCls } from '../components/ui'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAT_TINT: Record<string, string> = {
  dia: 'bg-sky-50', manana: 'bg-amber-50', tarde: 'bg-orange-50', noche: 'bg-indigo-50', noche8: 'bg-violet-50',
}
const CONTADORES: { cat: CatalogoSigla['categoria_capacidad']; label: string }[] = [
  { cat: 'dia', label: 'Total personal día' },
  { cat: 'manana', label: 'Total personal mañana (M8)' },
  { cat: 'tarde', label: 'Total personal tarde (T8)' },
  { cat: 'noche', label: 'Total personal noche' },
  { cat: 'noche8', label: 'Personal N8' },
]

export default function Programacion() {
  const { perfil } = useAuth()
  const esCoord = perfil?.rol === 'coordinador'
  const soloLectura = perfil?.rol === 'nomina'

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [siglas, setSiglas] = useState<CatalogoSigla[]>([])
  const [reglas, setReglas] = useState<ReglaColor[]>([])
  const [festivos, setFestivos] = useState<Set<string>>(new Set())

  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [servicioId, setServicioId] = useState('')
  const [cargoId, setCargoId] = useState('')

  const [progId, setProgId] = useState<string | null>(null)
  const [colabs, setColabs] = useState<Colaborador[]>([])
  // asignaciones: `${colabId}|${fecha}` -> sigla_id
  const [asig, setAsig] = useState<Map<string, string>>(new Map())
  const [editando, setEditando] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => {
      const s = (r.data as Servicio[]) ?? []; setServicios(s)
      setServicioId(esCoord && perfil?.servicio_id ? perfil.servicio_id : s[0]?.id ?? '')
    })
    supabase.from('cargos').select('*').eq('activo', true).order('nombre').then(r => {
      const c = (r.data as Cargo[]) ?? []; setCargos(c); setCargoId(c[0]?.id ?? '')
    })
    supabase.from('catalogo_siglas').select('*').eq('activo', true).order('orden').then(r => setSiglas((r.data as CatalogoSigla[]) ?? []))
    supabase.from('reglas_color').select('*').then(r => setReglas((r.data as ReglaColor[]) ?? []))
    supabase.from('festivos_colombia').select('fecha').then(r => setFestivos(new Set((r.data ?? []).map((x: { fecha: string }) => x.fecha))))
  }, [])

  const siglaMap = useMemo(() => {
    const m = new Map<string, CatalogoSigla>(); siglas.forEach(s => m.set(s.id, s)); return m
  }, [siglas])
  const semanas: SemanaCal[] = useMemo(() => semanasDelMes(anio, mes, festivos), [anio, mes, festivos])

  async function cargar() {
    if (!servicioId || !cargoId) return
    setCargando(true); setMsg(null)
    // upsert programación
    const { data: prog, error } = await supabase.from('programaciones')
      .upsert({ servicio_id: servicioId, cargo_id: cargoId, anio, mes, creado_por: perfil?.id },
        { onConflict: 'servicio_id,cargo_id,anio,mes' })
      .select('id').single()
    if (error) { setMsg('Error al cargar: ' + error.message); setCargando(false); return }
    const pid = (prog as { id: string }).id
    setProgId(pid)
    const [{ data: cs }, { data: as }] = await Promise.all([
      supabase.from('colaboradores').select('*').eq('servicio_id', servicioId).eq('cargo_id', cargoId).eq('activo', true).order('nombre_completo'),
      supabase.from('asignaciones').select('colaborador_id,fecha,sigla_id').eq('programacion_id', pid),
    ])
    setColabs((cs as Colaborador[]) ?? [])
    const m = new Map<string, string>()
    ;(as ?? []).forEach((a: { colaborador_id: string; fecha: string; sigla_id: string }) => m.set(`${a.colaborador_id}|${a.fecha}`, a.sigla_id))
    setAsig(m)
    setCargando(false)
  }

  async function setCell(colabId: string, fecha: string, siglaId: string) {
    if (!progId) return
    const key = `${colabId}|${fecha}`
    const next = new Map(asig)
    if (!siglaId) {
      next.delete(key); setAsig(next); setEditando(null)
      await supabase.from('asignaciones').delete().eq('programacion_id', progId).eq('colaborador_id', colabId).eq('fecha', fecha)
    } else {
      next.set(key, siglaId); setAsig(next); setEditando(null)
      await supabase.from('asignaciones').upsert(
        { programacion_id: progId, colaborador_id: colabId, fecha, sigla_id: siglaId },
        { onConflict: 'programacion_id,colaborador_id,fecha' })
    }
  }

  const horasSemana = (colabId: string, s: SemanaCal) =>
    s.dias.reduce((t, d) => t + (siglaMap.get(asig.get(`${colabId}|${d.fecha}`) ?? '')?.horas ?? 0), 0)

  const contar = (fecha: string, cat: CatalogoSigla['categoria_capacidad']) =>
    colabs.reduce((t, c) => t + (siglaMap.get(asig.get(`${c.id}|${fecha}`) ?? '')?.categoria_capacidad === cat ? 1 : 0), 0)

  const totalDias = semanas.reduce((t, s) => t + s.dias.length, 0)

  return (
    <div>
      <PageHeader title="Programación de turnos"
        subtitle="Cuadro mensual por servicio y cargo · suma semanal objetivo 44 h" />

      <FilterBar>
        <select className={selectCls} value={servicioId} onChange={e => setServicioId(e.target.value)} disabled={esCoord}>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className={selectCls} value={cargoId} onChange={e => setCargoId(e.target.value)}>
          {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className={selectCls} value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={selectCls} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <Btn onClick={cargar} disabled={cargando}>{cargando ? 'Cargando…' : 'Cargar / Crear'}</Btn>
      </FilterBar>

      {msg && <p className="mb-3 text-sm text-red-600">{msg}</p>}

      {!progId ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-black/5">
          Selecciona servicio, cargo y mes, luego pulsa <b>Cargar / Crear</b>.
        </div>
      ) : colabs.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-black/5">
          No hay colaboradores activos para este servicio y cargo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th rowSpan={3} className="sticky left-0 z-10 bg-brand text-white px-3 py-2 text-left min-w-[200px]">Colaborador</th>
                {semanas.map(s => (
                  <th key={s.indice} colSpan={s.dias.length} className="bg-brand text-white border border-white/20 px-1 py-1">Semana {s.indice + 1}</th>
                )).reduce<JSX.Element[]>((acc, el, i) => { acc.push(el); acc.push(<th key={`hs${i}`} rowSpan={3} className="bg-brand-dark text-white px-1 border border-white/20">HS</th>); return acc }, [])}
              </tr>
              <tr>
                {semanas.flatMap(s => s.dias.map(d => (
                  <th key={`l${d.fecha}`} className={`border px-1 py-0.5 ${d.esFes ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand'}`}>{d.letra}</th>
                )))}
              </tr>
              <tr>
                {semanas.flatMap(s => s.dias.map(d => (
                  <th key={`n${d.fecha}`} title={d.esDom ? 'Domingo' : d.esFes ? 'Festivo' : ''}
                    className={`border px-1 py-0.5 ${d.esFes ? 'bg-red-100 text-red-700 font-bold' : 'bg-brand-50 text-brand'}`}>{d.dia}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {colabs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white border px-3 py-1 font-medium text-gray-700 whitespace-nowrap">{c.nombre_completo}</td>
                  {semanas.map(s => [
                    ...s.dias.map(d => {
                      const key = `${c.id}|${d.fecha}`
                      const sig = siglaMap.get(asig.get(key) ?? '')
                      const tint = sig?.es_ausencia ? 'bg-gray-100 text-gray-500' : sig?.categoria_capacidad ? CAT_TINT[sig.categoria_capacidad] : ''
                      const isEdit = editando === key
                      return (
                        <td key={d.fecha} className={`border p-0 text-center ${d.esFes ? 'bg-red-50/40' : ''}`}>
                          {isEdit && !soloLectura ? (
                            <select autoFocus value={asig.get(key) ?? ''} onBlur={() => setEditando(null)}
                              onChange={e => setCell(c.id, d.fecha, e.target.value)}
                              className="w-16 text-xs border-0 bg-white outline-none">
                              <option value="">—</option>
                              {siglas.map(s2 => <option key={s2.id} value={s2.id}>{s2.sigla}</option>)}
                            </select>
                          ) : (
                            <button disabled={soloLectura} onClick={() => setEditando(key)}
                              className={`block w-full min-w-[34px] px-1 py-1 ${tint} ${!soloLectura ? 'hover:ring-1 hover:ring-brand-light' : ''}`}>
                              {sig?.sigla ?? ''}
                            </button>
                          )}
                        </td>
                      )
                    }),
                    (() => { const h = horasSemana(c.id, s); const col = colorHoras(h, reglas); return (
                      <td key={`hs${s.indice}`} className="border px-1 text-center font-semibold"
                        style={col ? { backgroundColor: col.bg, color: col.fg } : undefined}>{h}</td>
                    ) })(),
                  ])}
                </tr>
              ))}
            </tbody>
            <tfoot>
              {CONTADORES.map(({ cat, label }) => (
                <tr key={cat} className="bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-100 border px-3 py-1 font-semibold text-brand whitespace-nowrap">{label}</td>
                  {semanas.map(s => [
                    ...s.dias.map(d => <td key={d.fecha} className="border px-1 text-center text-gray-700">{contar(d.fecha, cat) || ''}</td>),
                    <td key={`hs${s.indice}`} className="border bg-gray-100"></td>,
                  ])}
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}

      {progId && colabs.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{colabs.length} colaboradores · {totalDias} días · los cambios se guardan automáticamente.</p>
      )}
    </div>
  )
}
