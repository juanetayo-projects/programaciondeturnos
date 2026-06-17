import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ReglaColor } from '../../lib/types'
import { Btn, PageHeader } from '../../components/ui'

type Form = Partial<ReglaColor>
const OPS = [
  { v: '=', l: 'Igual a (=)' }, { v: '<', l: 'Menor que (<)' }, { v: '>', l: 'Mayor que (>)' },
  { v: '<=', l: 'Menor o igual (≤)' }, { v: '>=', l: 'Mayor o igual (≥)' }, { v: 'between', l: 'Entre (rango)' },
]
const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light'

export default function Colores() {
  const [lista, setLista] = useState<ReglaColor[]>([])
  const [form, setForm] = useState<Form | null>(null)

  const cargar = () => supabase.from('reglas_color').select('*').order('orden').then(r => setLista((r.data as ReglaColor[]) ?? []))
  useEffect(() => { cargar() }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); if (!form) return
    const payload = {
      nombre: form.nombre?.trim(), operador: form.operador ?? '=',
      valor_min: form.valor_min ?? null, valor_max: form.operador === 'between' ? (form.valor_max ?? null) : null,
      color: form.color ?? '#0D2D6B', texto: form.texto ?? '#FFFFFF', orden: Number(form.orden) || 0, activo: form.activo ?? true,
    }
    if (form.id) await supabase.from('reglas_color').update(payload).eq('id', form.id)
    else await supabase.from('reglas_color').insert(payload)
    setForm(null); cargar()
  }
  const del = async (id: string) => { await supabase.from('reglas_color').delete().eq('id', id); cargar() }

  const desc = (r: ReglaColor) => r.operador === 'between' ? `entre ${r.valor_min} y ${r.valor_max} h` : `${r.operador} ${r.valor_min} h`

  return (
    <div>
      <PageHeader title="Reglas de color" subtitle="Resaltado de las horas semanales según el rango"
        action={<Btn onClick={() => setForm({ operador: '=', color: '#0D2D6B', texto: '#FFFFFF', activo: true, orden: (lista[lista.length - 1]?.orden ?? 0) + 10 })}>+ Nueva regla</Btn>} />

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-brand text-left">
            <tr><th className="px-3 py-2">Orden</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Condición</th><th className="px-3 py-2">Muestra</th><th className="px-3 py-2">Estado</th><th></th></tr>
          </thead>
          <tbody>
            {lista.map(r => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5">{r.orden}</td>
                <td className="px-3 py-1.5 font-medium">{r.nombre}</td>
                <td className="px-3 py-1.5 text-gray-600">{desc(r)}</td>
                <td className="px-3 py-1.5"><span className="rounded px-3 py-1 text-xs font-semibold" style={{ backgroundColor: r.color, color: r.texto }}>44</span></td>
                <td className="px-3 py-1.5"><span className={`rounded-full px-2 py-0.5 text-xs ${r.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{r.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  <button onClick={() => setForm(r)} className="text-brand-light hover:underline mr-3">Editar</button>
                  <button onClick={() => del(r.id)} className="text-red-500 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onClick={() => setForm(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={guardar} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h2 className="text-lg font-semibold text-brand">{form.id ? 'Editar' : 'Nueva'} regla</h2>
            <label className="block"><span className="text-xs text-gray-600">Nombre</span>
              <input required value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inp} /></label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block col-span-1"><span className="text-xs text-gray-600">Operador</span>
                <select value={form.operador ?? '='} onChange={e => setForm({ ...form, operador: e.target.value as ReglaColor['operador'] })} className={inp}>
                  {OPS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select></label>
              <label className="block"><span className="text-xs text-gray-600">Valor {form.operador === 'between' ? 'mín' : ''}</span>
                <input type="number" step="0.5" value={form.valor_min ?? ''} onChange={e => setForm({ ...form, valor_min: Number(e.target.value) })} className={inp} /></label>
              {form.operador === 'between' && <label className="block"><span className="text-xs text-gray-600">Valor máx</span>
                <input type="number" step="0.5" value={form.valor_max ?? ''} onChange={e => setForm({ ...form, valor_max: Number(e.target.value) })} className={inp} /></label>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-gray-600">Color fondo</span>
                <input type="color" value={form.color ?? '#0D2D6B'} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full h-9 rounded border border-gray-300" /></label>
              <label className="block"><span className="text-xs text-gray-600">Color texto</span>
                <input type="color" value={form.texto ?? '#FFFFFF'} onChange={e => setForm({ ...form, texto: e.target.value })} className="w-full h-9 rounded border border-gray-300" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <label className="block"><span className="text-xs text-gray-600">Orden</span>
                <input type="number" value={form.orden ?? 0} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} className={inp} /></label>
              <label className="flex items-center gap-2 text-sm mt-4"><input type="checkbox" checked={form.activo ?? true} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activa</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn type="submit">Guardar</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
