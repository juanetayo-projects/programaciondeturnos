import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Cargo, Servicio } from '../../lib/types'
import { Btn, PageHeader } from '../../components/ui'

export default function ServiciosCargos() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [nuevoServ, setNuevoServ] = useState('')
  const [nuevoCargo, setNuevoCargo] = useState('')

  const cargar = () => {
    supabase.from('servicios').select('*').order('nombre').then(r => setServicios((r.data as Servicio[]) ?? []))
    supabase.from('cargos').select('*').order('nombre').then(r => setCargos((r.data as Cargo[]) ?? []))
  }
  useEffect(cargar, [])

  const addServ = async () => { if (!nuevoServ.trim()) return; await supabase.from('servicios').insert({ nombre: nuevoServ.trim() }); setNuevoServ(''); cargar() }
  const addCargo = async () => { if (!nuevoCargo.trim()) return; await supabase.from('cargos').insert({ nombre: nuevoCargo.trim() }); setNuevoCargo(''); cargar() }
  const toggleServ = async (s: Servicio) => { await supabase.from('servicios').update({ activo: !s.activo }).eq('id', s.id); cargar() }
  const toggleCargo = async (c: Cargo) => { await supabase.from('cargos').update({ activo: !c.activo }).eq('id', c.id); cargar() }

  return (
    <div>
      <PageHeader title="Servicios y cargos" subtitle="Áreas/procesos y tipos de cargo" />
      <div className="grid md:grid-cols-2 gap-6">
        <Panel titulo="Servicios" valor={nuevoServ} setValor={setNuevoServ} onAdd={addServ}
          items={servicios} onToggle={toggleServ} />
        <Panel titulo="Cargos" valor={nuevoCargo} setValor={setNuevoCargo} onAdd={addCargo}
          items={cargos} onToggle={toggleCargo} />
      </div>
    </div>
  )
}

function Panel<T extends { id: string; nombre: string; activo: boolean }>(
  { titulo, valor, setValor, onAdd, items, onToggle }:
  { titulo: string; valor: string; setValor: (v: string) => void; onAdd: () => void; items: T[]; onToggle: (i: T) => void }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h3 className="font-semibold text-brand mb-3">{titulo}</h3>
      <div className="flex gap-2 mb-3">
        <input value={valor} onChange={e => setValor(e.target.value)} placeholder={`Nuevo ${titulo.toLowerCase().slice(0, -1)}…`}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light" />
        <Btn onClick={onAdd}>Agregar</Btn>
      </div>
      <ul className="divide-y divide-gray-100">
        {items.map(i => (
          <li key={i.id} className="flex items-center justify-between py-2 text-sm">
            <span className={i.activo ? '' : 'text-gray-400 line-through'}>{i.nombre}</span>
            <button onClick={() => onToggle(i)} className="text-xs text-gray-500 hover:text-brand">
              {i.activo ? 'Desactivar' : 'Activar'}
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="py-4 text-center text-gray-400 text-sm">Sin registros.</li>}
      </ul>
    </div>
  )
}
