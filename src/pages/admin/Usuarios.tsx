import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Perfil, Rol, Servicio } from '../../lib/types'
import { Btn, PageHeader } from '../../components/ui'

const ROLES: { v: Rol; l: string }[] = [
  { v: 'admin', l: 'Administrador' }, { v: 'coordinador', l: 'Coordinador' }, { v: 'nomina', l: 'Nómina' },
]
const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light'

interface FormNuevo { email: string; password: string; nombre: string; rol: Rol; servicio_id: string }

export default function Usuarios() {
  const [lista, setLista] = useState<Perfil[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [nuevo, setNuevo] = useState<FormNuevo | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = () => supabase.from('perfiles').select('*').order('nombre').then(r => setLista((r.data as Perfil[]) ?? []))
  useEffect(() => {
    cargar()
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => setServicios((r.data as Servicio[]) ?? []))
  }, [])

  const servNombre = (id: string | null) => servicios.find(s => s.id === id)?.nombre ?? '—'

  async function actualizar(p: Perfil, cambios: Partial<Perfil>) {
    await supabase.from('perfiles').update(cambios).eq('id', p.id)
    cargar()
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault(); if (!nuevo) return
    setGuardando(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: { action: 'create', ...nuevo, servicio_id: nuevo.rol === 'coordinador' ? nuevo.servicio_id : null },
    })
    setGuardando(false)
    const err = error?.message || (data as { error?: string })?.error
    if (err) { setMsg('Error: ' + err); return }
    setNuevo(null); setMsg('Usuario creado correctamente.'); cargar()
  }

  async function eliminar(p: Perfil) {
    if (!confirm(`¿Eliminar al usuario ${p.nombre}? Esta acción no se puede deshacer.`)) return
    const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: { action: 'delete', id: p.id } })
    const err = error?.message || (data as { error?: string })?.error
    setMsg(err ? 'Error: ' + err : 'Usuario eliminado.')
    cargar()
  }

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Acceso al sistema y roles"
        action={<Btn onClick={() => { setMsg(null); setNuevo({ email: '', password: '', nombre: '', rol: 'coordinador', servicio_id: servicios[0]?.id ?? '' }) }}>+ Nuevo usuario</Btn>} />

      {msg && <p className={`mb-3 text-sm ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-brand text-left">
            <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Correo</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Servicio (coord.)</th><th className="px-3 py-2">Estado</th><th></th></tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 font-medium text-gray-700">{p.nombre}</td>
                <td className="px-3 py-1.5 text-gray-500">{p.email}</td>
                <td className="px-3 py-1.5">
                  <select value={p.rol} onChange={e => actualizar(p, { rol: e.target.value as Rol })} className="rounded border border-gray-200 px-2 py-1 text-xs">
                    {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  {p.rol === 'coordinador' ? (
                    <select value={p.servicio_id ?? ''} onChange={e => actualizar(p, { servicio_id: e.target.value || null })} className="rounded border border-gray-200 px-2 py-1 text-xs">
                      <option value="">— Todos</option>
                      {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  ) : <span className="text-gray-400">{servNombre(p.servicio_id)}</span>}
                </td>
                <td className="px-3 py-1.5">
                  <button onClick={() => actualizar(p, { activo: !p.activo })}
                    className={`rounded-full px-2 py-0.5 text-xs ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-3 py-1.5 text-right"><button onClick={() => eliminar(p)} className="text-red-500 hover:underline">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nuevo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onClick={() => setNuevo(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={crear} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h2 className="text-lg font-semibold text-brand">Nuevo usuario</h2>
            <label className="block"><span className="text-xs text-gray-600">Nombre</span>
              <input required value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} className={inp} /></label>
            <label className="block"><span className="text-xs text-gray-600">Correo</span>
              <input type="email" required value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} className={inp} /></label>
            <label className="block"><span className="text-xs text-gray-600">Contraseña temporal</span>
              <input required minLength={6} value={nuevo.password} onChange={e => setNuevo({ ...nuevo, password: e.target.value })} className={inp} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-gray-600">Rol</span>
                <select value={nuevo.rol} onChange={e => setNuevo({ ...nuevo, rol: e.target.value as Rol })} className={inp}>
                  {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select></label>
              {nuevo.rol === 'coordinador' && (
                <label className="block"><span className="text-xs text-gray-600">Servicio</span>
                  <select value={nuevo.servicio_id} onChange={e => setNuevo({ ...nuevo, servicio_id: e.target.value })} className={inp}>
                    <option value="">— Todos</option>
                    {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select></label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setNuevo(null)}>Cancelar</Btn>
              <Btn type="submit" disabled={guardando}>{guardando ? 'Creando…' : 'Crear usuario'}</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
