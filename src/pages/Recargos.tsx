import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import VistaProgramacion from '../components/VistaProgramacion'
import { useAuth } from '../auth/AuthProvider'
import type { Cargo, Servicio } from '../lib/types'
import { indexarConvenciones, recargoMensual, type AsignacionInput, type ConvencionRecargo } from '../lib/recargos'
import { Btn, FilterBar, PageHeader, selectCls } from '../components/ui'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Fila {
  colaboradorId: string
  nombre: string
  servicio: string
  hdo: number; hno: number; hdf: number; hnf: number
  cHdo: number; cHno: number; cHdf: number; cHnf: number // calculados
}

export default function Recargos() {
  const { perfil } = useAuth()
  const puedeEditar = perfil?.rol === 'nomina' || perfil?.rol === 'admin'
  const [verGrid, setVerGrid] = useState(false)

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [servicioId, setServicioId] = useState('')
  const [cargoId, setCargoId] = useState('')

  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => setServicios((r.data as Servicio[]) ?? []))
    supabase.from('cargos').select('*').eq('activo', true).order('nombre').then(r => setCargos((r.data as Cargo[]) ?? []))
  }, [])

  async function calcular() {
    setCargando(true); setMsg(null); setFilas([])
    // 1. catálogos para el motor
    const [{ data: convs }, { data: fest }, { data: mapeo }, { data: sigs }] = await Promise.all([
      supabase.from('convenciones_recargo').select('codigo,hdo,hno,hdf,hnf,dia_siguiente'),
      supabase.from('festivos_colombia').select('fecha'),
      supabase.from('mapeo_siglas_convencion').select('sigla_id,base_codigo'),
      supabase.from('catalogo_siglas').select('id'),
    ])
    void sigs
    const idx = indexarConvenciones((convs as ConvencionRecargo[]) ?? [])
    const festivos = new Set((fest ?? []).map((f: { fecha: string }) => f.fecha))
    const baseMap = new Map<string, string | null>()
    ;(mapeo ?? []).forEach((m: { sigla_id: string; base_codigo: string | null }) => baseMap.set(m.sigla_id, m.base_codigo))

    // 2. programaciones del mes
    let pq = supabase.from('programaciones').select('id,servicio_id,cargo_id').eq('anio', anio).eq('mes', mes)
    if (servicioId) pq = pq.eq('servicio_id', servicioId)
    if (cargoId) pq = pq.eq('cargo_id', cargoId)
    const { data: progs } = await pq
    const progIds = (progs ?? []).map((p: { id: string }) => p.id)
    if (progIds.length === 0) { setMsg('No hay programaciones para ese período.'); setCargando(false); return }

    // 3. asignaciones + colaboradores + servicios + liquidaciones existentes
    const [{ data: asigs }, { data: colabs }, { data: servs }, { data: liqs }] = await Promise.all([
      supabase.from('asignaciones').select('colaborador_id,fecha,sigla_id').in('programacion_id', progIds),
      supabase.from('colaboradores').select('id,nombre_completo,servicio_id'),
      supabase.from('servicios').select('id,nombre'),
      supabase.from('liquidaciones_recargo').select('*').eq('anio', anio).eq('mes', mes),
    ])
    const servName = new Map<string, string>((servs ?? []).map((s: { id: string; nombre: string }) => [s.id, s.nombre]))
    const colMap = new Map<string, { nombre: string; servicio_id: string }>(
      (colabs ?? []).map((c: { id: string; nombre_completo: string; servicio_id: string }) => [c.id, { nombre: c.nombre_completo, servicio_id: c.servicio_id }]))
    const liqMap = new Map<string, { hdo: number; hno: number; hdf: number; hnf: number; ajustada: boolean }>(
      (liqs ?? []).map((l: { colaborador_id: string; hdo: number; hno: number; hdf: number; hnf: number; ajustada: boolean }) =>
        [l.colaborador_id, l]))

    // agrupar asignaciones por colaborador
    const porColab = new Map<string, AsignacionInput[]>()
    ;(asigs ?? []).forEach((a: { colaborador_id: string; fecha: string; sigla_id: string }) => {
      const arr = porColab.get(a.colaborador_id) ?? []
      arr.push({ fecha: a.fecha, base_codigo: baseMap.get(a.sigla_id) ?? null })
      porColab.set(a.colaborador_id, arr)
    })

    const res: Fila[] = []
    porColab.forEach((arr, colId) => {
      const r = recargoMensual(arr, festivos, idx)
      const liq = liqMap.get(colId)
      const info = colMap.get(colId)
      res.push({
        colaboradorId: colId,
        nombre: info?.nombre ?? colId,
        servicio: servName.get(info?.servicio_id ?? '') ?? '—',
        cHdo: r.hdo, cHno: r.hno, cHdf: r.hdf, cHnf: r.hnf,
        hdo: liq?.hdo ?? r.hdo, hno: liq?.hno ?? r.hno, hdf: liq?.hdf ?? r.hdf, hnf: liq?.hnf ?? r.hnf,
      })
    })
    res.sort((a, b) => a.nombre.localeCompare(b.nombre))
    setFilas(res)
    setCargando(false)
  }

  function editar(colId: string, campo: 'hdo' | 'hno' | 'hdf' | 'hnf', valor: number) {
    setFilas(fs => fs.map(f => f.colaboradorId === colId ? { ...f, [campo]: isNaN(valor) ? 0 : valor } : f))
  }

  async function guardar() {
    setGuardando(true); setMsg(null)
    const payload = filas.map(f => {
      const total = f.hdo + f.hno + f.hdf + f.hnf
      const ajustada = f.hdo !== f.cHdo || f.hno !== f.cHno || f.hdf !== f.cHdf || f.hnf !== f.cHnf
      return { anio, mes, colaborador_id: f.colaboradorId, hdo: f.hdo, hno: f.hno, hdf: f.hdf, hnf: f.hnf, total, ajustada, editado_por: perfil?.id }
    })
    const { error } = await supabase.from('liquidaciones_recargo').upsert(payload, { onConflict: 'anio,mes,colaborador_id' })
    setGuardando(false)
    setMsg(error ? 'Error al guardar: ' + error.message : 'Liquidación guardada correctamente.')
  }

  const tot = useMemo(() => filas.reduce((t, f) => ({
    hdo: t.hdo + f.hdo, hno: t.hno + f.hno, hdf: t.hdf + f.hdf, hnf: t.hnf + f.hnf,
  }), { hdo: 0, hno: 0, hdf: 0, hnf: 0 }), [filas])

  const Num = ({ f, campo }: { f: Fila; campo: 'hdo' | 'hno' | 'hdf' | 'hnf' }) => {
    const ajust = f[campo] !== f[(`c${campo[0].toUpperCase()}${campo.slice(1)}`) as 'cHdo']
    return puedeEditar ? (
      <input type="number" value={f[campo]} onChange={e => editar(f.colaboradorId, campo, parseFloat(e.target.value))}
        className={`w-16 rounded border px-1 py-0.5 text-right text-sm ${ajust ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} />
    ) : <span>{f[campo]}</span>
  }

  return (
    <div>
      <PageHeader title="Liquidación de recargos"
        subtitle="Horas diurnas/nocturnas, ordinarias/festivas — calculadas desde la programación" />

      <FilterBar>
        <select className={selectCls} value={anio} onChange={e => setAnio(Number(e.target.value))}>
          {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={selectCls} value={mes} onChange={e => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className={selectCls} value={servicioId} onChange={e => setServicioId(e.target.value)}>
          <option value="">Todos los servicios</option>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className={selectCls} value={cargoId} onChange={e => setCargoId(e.target.value)}>
          <option value="">Todos los cargos</option>
          {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <Btn onClick={calcular} disabled={cargando}>{cargando ? 'Calculando…' : 'Calcular'}</Btn>
        {filas.length > 0 && puedeEditar && <Btn variant="ghost" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar liquidación'}</Btn>}
        {servicioId && cargoId && (
          <Btn variant="ghost" onClick={() => setVerGrid(v => !v)}>{verGrid ? '▲ Ocultar programación' : '👁 Ver programación'}</Btn>
        )}
      </FilterBar>

      {msg && <p className={`mb-3 text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      {filas.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-black/5">
          Selecciona período y pulsa <b>Calcular</b>. {puedeEditar && 'Puedes ajustar los valores antes de guardar.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Colaborador</th>
                <th className="px-3 py-2 font-semibold">Servicio</th>
                <th className="px-3 py-2 font-semibold text-right" title="Horas Diurnas Ordinarias">HDO</th>
                <th className="px-3 py-2 font-semibold text-right" title="Horas Nocturnas Ordinarias">HNO</th>
                <th className="px-3 py-2 font-semibold text-right" title="Horas Diurnas Festivas">HDF</th>
                <th className="px-3 py-2 font-semibold text-right" title="Horas Nocturnas Festivas">HNF</th>
                <th className="px-3 py-2 font-semibold text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.colaboradorId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-700">{f.nombre}</td>
                  <td className="px-3 py-1.5 text-gray-500">{f.servicio}</td>
                  <td className="px-3 py-1.5 text-right"><Num f={f} campo="hdo" /></td>
                  <td className="px-3 py-1.5 text-right"><Num f={f} campo="hno" /></td>
                  <td className="px-3 py-1.5 text-right"><Num f={f} campo="hdf" /></td>
                  <td className="px-3 py-1.5 text-right"><Num f={f} campo="hnf" /></td>
                  <td className="px-3 py-1.5 text-right font-bold text-brand">{f.hdo + f.hno + f.hdf + f.hnf}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand/20 bg-brand-50 font-bold text-brand">
                <td className="px-3 py-2" colSpan={2}>Total general ({filas.length})</td>
                <td className="px-3 py-2 text-right">{tot.hdo}</td>
                <td className="px-3 py-2 text-right">{tot.hno}</td>
                <td className="px-3 py-2 text-right">{tot.hdf}</td>
                <td className="px-3 py-2 text-right">{tot.hnf}</td>
                <td className="px-3 py-2 text-right">{tot.hdo + tot.hno + tot.hdf + tot.hnf}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {filas.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">Los valores en ámbar fueron ajustados respecto al cálculo automático.</p>
      )}

      {verGrid && servicioId && cargoId && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-brand">Hoja de programación — {servicios.find(s => s.id === servicioId)?.nombre} · {cargos.find(c => c.id === cargoId)?.nombre} · {MESES[mes - 1]} {anio}</h3>
          <VistaProgramacion servicioId={servicioId} cargoId={cargoId} anio={anio} mes={mes} />
        </div>
      )}
    </div>
  )
}
