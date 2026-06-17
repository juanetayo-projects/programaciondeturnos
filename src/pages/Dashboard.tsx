import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { MetricCard, PageHeader } from '../components/ui'

export default function Dashboard() {
  const { perfil } = useAuth()
  const [m, setM] = useState({ colab: 0, activos: 0, servicios: 0, prog: 0 })

  useEffect(() => {
    async function load() {
      const head = { count: 'exact' as const, head: true }
      const [c, a, s, p] = await Promise.all([
        supabase.from('colaboradores').select('id', head),
        supabase.from('colaboradores').select('id', head).eq('activo', true),
        supabase.from('servicios').select('id', head).eq('activo', true),
        supabase.from('programaciones').select('id', head),
      ])
      setM({ colab: c.count ?? 0, activos: a.count ?? 0, servicios: s.count ?? 0, prog: p.count ?? 0 })
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader title={`Hola, ${perfil?.nombre?.split(' ')[0] ?? ''}`} subtitle="Resumen general" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Colaboradores" value={m.colab} hint={`${m.activos} activos`} />
        <MetricCard label="Servicios" value={m.servicios} />
        <MetricCard label="Programaciones" value={m.prog} />
        <MetricCard label="Mes actual" value={new Date().toLocaleDateString('es-CO', { month: 'long' })} />
      </div>
    </div>
  )
}
