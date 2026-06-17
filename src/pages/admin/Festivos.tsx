import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Btn, PageHeader, selectCls } from '../../components/ui'

interface Festivo { fecha: string; nombre: string }

export default function Festivos() {
  const [lista, setLista] = useState<Festivo[]>([])
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [fecha, setFecha] = useState('')
  const [nombre, setNombre] = useState('')

  const cargar = () => supabase.from('festivos_colombia').select('*').order('fecha').then(r => setLista((r.data as Festivo[]) ?? []))
  useEffect(() => { cargar() }, [])

  const add = async () => {
    if (!fecha || !nombre.trim()) return
    await supabase.from('festivos_colombia').upsert({ fecha, nombre: nombre.trim() })
    setFecha(''); setNombre(''); cargar()
  }
  const del = async (f: string) => { await supabase.from('festivos_colombia').delete().eq('fecha', f); cargar() }

  const filtrada = lista.filter(f => f.fecha.startsWith(String(anio)))
  const anios = Array.from(new Set(lista.map(f => f.fecha.slice(0, 4)))).concat([String(anio)])
  const aniosUnq = Array.from(new Set(anios)).sort()

  return (
    <div>
      <PageHeader title="Festivos" subtitle="Días festivos nacionales (los domingos se calculan automáticamente)" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:col-span-1 h-fit">
          <h3 className="font-semibold text-brand mb-3">Agregar festivo</h3>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 outline-none focus:border-brand-light" />
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Día de la Independencia"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 outline-none focus:border-brand-light" />
          <Btn onClick={add}>Agregar / Actualizar</Btn>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-brand">Calendario</h3>
            <select className={selectCls} value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {aniosUnq.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <ul className="divide-y divide-gray-100">
            {filtrada.map(f => (
              <li key={f.fecha} className="flex items-center justify-between py-2 text-sm">
                <span><b className="text-brand">{new Date(f.fecha + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</b> — {f.nombre}</span>
                <button onClick={() => del(f.fecha)} className="text-xs text-red-500 hover:underline">Eliminar</button>
              </li>
            ))}
            {filtrada.length === 0 && <li className="py-4 text-center text-gray-400">Sin festivos para {anio}.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
