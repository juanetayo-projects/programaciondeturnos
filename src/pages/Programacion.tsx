import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { Cargo, CatalogoSigla, Colaborador, ReglaColor, Servicio } from '../lib/types'
import { semanasDelMes, type SemanaCal } from '../lib/calendario'
import { colorHoras } from '../lib/colorRules'
import { exportarExcel, exportarPDF, type Celda, type Matriz } from '../lib/exportar'
import { Btn, FilterBar, PageHeader, selectCls } from '../components/ui'
import HeatmapCapacidad from '../components/HeatmapCapacidad'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAT_TINT: Record<string, string> = {
  dia: 'bg-sky-50', manana: 'bg-amber-50', tarde: 'bg-orange-50', noche: 'bg-indigo-50', noche8: 'bg-violet-50',
}
const CAT_HEX: Record<string, string> = {
  dia: '#E0F2FE', manana: '#FEF3C7', tarde: '#FFEDD5', noche: '#E0E7FF', noche8: '#EDE9FE',
}
const HDR_HEX = '#EAF0FA', HDR_FG = '#0D2D6B', FES_HEX = '#FEE2E2', FES_FG = '#B91C1C', AUS_HEX = '#F3F4F6'
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

  const [sp] = useSearchParams()
  const hoy = new Date()
  const [anio, setAnio] = useState(Number(sp.get('anio')) || hoy.getFullYear())
  const [mes, setMes] = useState(Number(sp.get('mes')) || hoy.getMonth() + 1)
  const [servicioId, setServicioId] = useState(sp.get('servicio') ?? '')
  const [cargoId, setCargoId] = useState(sp.get('cargo') ?? '')
  const autoRef = useRef(false)

  const [progId, setProgId] = useState<string | null>(null)
  const [colabs, setColabs] = useState<Colaborador[]>([])
  // asignaciones: `${colabId}|${fecha}` -> sigla_id
  const [asig, setAsig] = useState<Map<string, string>>(new Map())
  const [editando, setEditando] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [nuevoColab, setNuevoColab] = useState<{ nombre_completo: string; numero_documento: string; email: string; telefono: string } | null>(null)
  const [colabMsg, setColabMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => {
      const s = (r.data as Servicio[]) ?? []; setServicios(s)
      setServicioId(prev => prev || (esCoord && perfil?.servicio_id ? perfil.servicio_id : s[0]?.id ?? ''))
    })
    supabase.from('cargos').select('*').eq('activo', true).order('nombre').then(r => {
      const c = (r.data as Cargo[]) ?? []; setCargos(c); setCargoId(prev => prev || (c[0]?.id ?? ''))
    })
    supabase.from('catalogo_siglas').select('*').eq('activo', true).order('orden').then(r => setSiglas((r.data as CatalogoSigla[]) ?? []))
    supabase.from('reglas_color').select('*').then(r => setReglas((r.data as ReglaColor[]) ?? []))
    supabase.from('festivos_colombia').select('fecha').then(r => setFestivos(new Set((r.data ?? []).map((x: { fecha: string }) => x.fecha))))
  }, [])

  // Auto-cargar si se llegó con parámetros (p. ej. desde Liquidación)
  useEffect(() => {
    if (autoRef.current) return
    if (sp.get('servicio') && servicioId && cargoId && servicios.length && cargos.length) {
      autoRef.current = true
      cargar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicios, cargos, servicioId, cargoId])

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

  function construirMatriz(): Matriz {
    const encabezado: Celda[] = [{ v: 'Colaborador', bold: true, bg: HDR_HEX, fg: HDR_FG }]
    semanas.forEach(s => {
      s.dias.forEach(d => encabezado.push({ v: `${d.letra}${d.dia}`, bold: true, bg: d.esFes ? FES_HEX : HDR_HEX, fg: d.esFes ? FES_FG : HDR_FG }))
      encabezado.push({ v: `HS S${s.indice + 1}`, bold: true, bg: HDR_HEX, fg: HDR_FG })
    })
    encabezado.push({ v: 'Total', bold: true, bg: HDR_HEX, fg: HDR_FG })
    const filas: Celda[][] = colabs.map(c => {
      const row: Celda[] = [{ v: c.nombre_completo, bold: true }]
      semanas.forEach(s => {
        s.dias.forEach(d => {
          const sig = siglaMap.get(asig.get(`${c.id}|${d.fecha}`) ?? '')
          row.push({ v: sig?.sigla ?? '', bg: sig?.es_ausencia ? AUS_HEX : sig?.categoria_capacidad ? CAT_HEX[sig.categoria_capacidad] : undefined })
        })
        const h = horasSemana(c.id, s); const col = colorHoras(h, reglas)
        row.push({ v: h, bold: true, bg: col?.bg, fg: col?.fg })
      })
      row.push({ v: semanas.reduce((t, s) => t + horasSemana(c.id, s), 0), bold: true, bg: HDR_HEX, fg: HDR_FG })
      return row
    })
    CONTADORES.forEach(({ cat, label }) => {
      const row: Celda[] = [{ v: label, bold: true, bg: HDR_HEX, fg: HDR_FG }]
      semanas.forEach(s => { s.dias.forEach(d => row.push({ v: contar(d.fecha, cat) || '' })); row.push({ v: '', bg: HDR_HEX }) })
      row.push({ v: '', bg: HDR_HEX })
      filas.push(row)
    })
    const servN = servicios.find(s => s.id === servicioId)?.nombre ?? ''
    const cargoN = cargos.find(c => c.id === cargoId)?.nombre ?? ''
    return { titulo: 'Cuadro de Turnos', sub: `${servN} · ${cargoN} · ${MESES[mes - 1]} ${anio}`, encabezado, filas }
  }
  const nombreArchivo = `Turnos_${(servicios.find(s => s.id === servicioId)?.nombre ?? '').replace(/\s+/g, '')}_${MESES[mes - 1]}${anio}`

  async function enviarCorreos() {
    if (!progId) return
    if (!confirm('¿Enviar la programación por correo a todos los colaboradores con email registrado?')) return
    setEnviando(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('enviar-programacion', { body: { programacionId: progId } })
    setEnviando(false)
    if (error) { setMsg('Error al enviar: ' + error.message); return }
    const d = data as { enviados: number; sinCorreo: string[]; total: number }
    setMsg(`Correos enviados: ${d.enviados} de ${d.total}.` + (d.sinCorreo?.length ? ` Sin correo: ${d.sinCorreo.join(', ')}.` : ''))
  }

  async function agregarColaborador(e: React.FormEvent) {
    e.preventDefault(); if (!nuevoColab) return
    setColabMsg(null)
    const { error } = await supabase.from('colaboradores').insert({
      nombre_completo: nuevoColab.nombre_completo.trim(),
      numero_documento: nuevoColab.numero_documento.trim(),
      email: nuevoColab.email.trim() || null,
      telefono: nuevoColab.telefono.trim() || null,
      servicio_id: servicioId, cargo_id: cargoId, activo: true,
    })
    if (error) { setColabMsg(error.message.includes('duplicate') ? 'Ya existe un colaborador con ese documento.' : error.message); return }
    setNuevoColab(null); cargar()
  }

  async function quitarColaborador(c: Colaborador) {
    if (!confirm(`¿Quitar a ${c.nombre_completo} de la parrilla? Se desactivará (conserva su histórico).`)) return
    await supabase.from('colaboradores').update({ activo: false }).eq('id', c.id)
    cargar()
  }

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
        <>
        <div className="mb-3 flex justify-end gap-2 flex-wrap">
          {!soloLectura && <Btn variant="ghost" onClick={() => { setColabMsg(null); setNuevoColab({ nombre_completo: '', numero_documento: '', email: '', telefono: '' }) }}>+ Agregar colaborador</Btn>}
          <Btn variant="ghost" onClick={() => exportarExcel(construirMatriz(), nombreArchivo)}>⬇ Excel</Btn>
          <Btn variant="ghost" onClick={() => exportarPDF(construirMatriz(), nombreArchivo)}>⬇ PDF</Btn>
          {!soloLectura && <Btn onClick={enviarCorreos} disabled={enviando}>{enviando ? 'Enviando…' : '✉ Enviar a colaboradores'}</Btn>}
        </div>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th rowSpan={3} className="sticky left-0 z-10 bg-brand text-white px-3 py-2 text-left min-w-[200px]">Colaborador</th>
                {semanas.map(s => (
                  <th key={s.indice} colSpan={s.dias.length} className="bg-brand text-white border border-white/20 px-1 py-1">Semana {s.indice + 1}</th>
                )).reduce<JSX.Element[]>((acc, el, i) => { acc.push(el); acc.push(<th key={`hs${i}`} rowSpan={3} className="bg-brand-dark text-white px-1 border border-white/20">HS</th>); return acc }, [])}
                <th rowSpan={3} className="bg-brand-dark text-white px-2 border border-white/20">Total</th>
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
                  <td className="sticky left-0 z-10 bg-white border px-3 py-1 font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <span>{c.nombre_completo}</span>
                      {!soloLectura && <button onClick={() => quitarColaborador(c)} title="Quitar de la parrilla" className="text-red-400 hover:text-red-600">✕</button>}
                    </div>
                  </td>
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
                  <td className="border px-2 text-center font-bold text-brand bg-brand-50">{semanas.reduce((t, s) => t + horasSemana(c.id, s), 0)}</td>
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
                  <td className="border bg-gray-100"></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
        <div className="mt-5">
          <HeatmapCapacidad dias={semanas.flatMap(s => s.dias)} contar={contar} />
        </div>
        </>
      )}

      {progId && colabs.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">{colabs.length} colaboradores · {totalDias} días · los cambios se guardan automáticamente.</p>
      )}

      {nuevoColab && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-20" onClick={() => setNuevoColab(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={agregarColaborador} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h2 className="text-lg font-semibold text-brand">Agregar colaborador a la parrilla</h2>
            <p className="text-xs text-gray-500">Se asigna al servicio y cargo seleccionados y aparece en el cuadro.</p>
            <label className="block"><span className="text-xs text-gray-600">Nombre completo</span>
              <input required value={nuevoColab.nombre_completo} onChange={e => setNuevoColab({ ...nuevoColab, nombre_completo: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-gray-600">Documento</span>
                <input required value={nuevoColab.numero_documento} onChange={e => setNuevoColab({ ...nuevoColab, numero_documento: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light" /></label>
              <label className="block"><span className="text-xs text-gray-600">Teléfono</span>
                <input value={nuevoColab.telefono} onChange={e => setNuevoColab({ ...nuevoColab, telefono: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light" /></label>
            </div>
            <label className="block"><span className="text-xs text-gray-600">Correo</span>
              <input type="email" value={nuevoColab.email} onChange={e => setNuevoColab({ ...nuevoColab, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light" /></label>
            {colabMsg && <p className="text-sm text-red-600">{colabMsg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setNuevoColab(null)}>Cancelar</Btn>
              <Btn type="submit">Agregar</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
