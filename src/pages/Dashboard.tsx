import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { FilterBar, MetricCard, PageHeader, selectCls } from '../components/ui'
import type { Cargo, Servicio } from '../lib/types'

const I = {
  clip: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6a1 1 0 011 1v1H8V6a1 1 0 011-1zM8 7H6a1 1 0 00-1 1v11a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-2" /></svg>,
  check: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  x: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 10l4 4m0-4l-4 4m8-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  layers: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5zm9 9l-9 5-9-5" /></svg>,
  cal: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" /></svg>,
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface ColabRow { id: string; activo: boolean; servicio_id: string; cargo_id: string }

export default function Dashboard() {
  const { perfil } = useAuth()
  const [colabs, setColabs] = useState<ColabRow[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [progCount, setProgCount] = useState(0)
  const hoy = new Date()
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [mes, setMes] = useState('')
  const [servicio, setServicio] = useState('')
  const [cargo, setCargo] = useState('')

  useEffect(() => {
    supabase.from('colaboradores').select('id,activo,servicio_id,cargo_id').then(r => setColabs((r.data as ColabRow[]) ?? []))
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => setServicios((r.data as Servicio[]) ?? []))
    supabase.from('cargos').select('*').eq('activo', true).order('nombre').then(r => setCargos((r.data as Cargo[]) ?? []))
  }, [])

  useEffect(() => {
    let q = supabase.from('programaciones').select('id', { count: 'exact', head: true }).eq('anio', Number(anio))
    if (mes) q = q.eq('mes', Number(mes))
    if (servicio) q = q.eq('servicio_id', servicio)
    if (cargo) q = q.eq('cargo_id', cargo)
    q.then(r => setProgCount(r.count ?? 0))
  }, [anio, mes, servicio, cargo])

  const f = useMemo(() => colabs.filter(c =>
    (!servicio || c.servicio_id === servicio) && (!cargo || c.cargo_id === cargo)), [colabs, servicio, cargo])
  const total = f.length
  const activos = f.filter(c => c.activo).length
  const inactivos = total - activos

  const anios = ['2025', '2026', '2027']
  function limpiar() { setAnio(String(hoy.getFullYear())); setMes(''); setServicio(''); setCargo('') }

  return (
    <div>
      <PageHeader title={`Hola, ${perfil?.nombre?.split(' ')[0] ?? ''}`} subtitle="Resumen general" />

      <FilterBar onClear={limpiar}>
        <select className={selectCls} value={anio} onChange={e => setAnio(e.target.value)}>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className={selectCls} value={mes} onChange={e => setMes(e.target.value)}>
          <option value="">Mes</option>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className={selectCls} value={servicio} onChange={e => setServicio(e.target.value)}>
          <option value="">Proceso / Área</option>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className={selectCls} value={cargo} onChange={e => setCargo(e.target.value)}>
          <option value="">Cargo</option>
          {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </FilterBar>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard color="blue" icon={I.clip} label="Total colaboradores" value={total} />
        <MetricCard color="green" icon={I.check} label="Activos" value={activos}
          hint={total ? `${Math.round((activos / total) * 100)}% del total` : undefined} />
        <MetricCard color="red" icon={I.x} label="Inactivos" value={inactivos}
          hint={total ? `${Math.round((inactivos / total) * 100)}% del total` : undefined} />
        <MetricCard color="amber" icon={I.layers} label="Servicios" value={servicios.length} />
        <MetricCard color="purple" icon={I.cal} label="Programaciones" value={progCount} hint={anio} />
      </div>
    </div>
  )
}
