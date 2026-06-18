import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { CatalogoSigla } from '../../lib/types'
import { exportarExcelSimple, leerFilas } from '../../lib/excelIO'
import { Btn, PageHeader } from '../../components/ui'

type Form = Partial<CatalogoSigla>
const CATS = [
  { v: '', l: '— (no cuenta capacidad)' },
  { v: 'dia', l: 'Día' }, { v: 'manana', l: 'Mañana (M8)' }, { v: 'tarde', l: 'Tarde (T8)' },
  { v: 'noche', l: 'Noche' }, { v: 'noche8', l: 'Noche 8h (N8)' },
]
const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-light'

const CAT_VALIDAS = ['dia', 'manana', 'tarde', 'noche', 'noche8']
const esSi = (v: string) => ['si', 'sí', 'x', 'true', '1', 'verdadero'].includes(v.trim().toLowerCase())

export default function Siglas() {
  const [lista, setLista] = useState<CatalogoSigla[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const cargar = () => supabase.from('catalogo_siglas').select('*').order('orden').then(r => setLista((r.data as CatalogoSigla[]) ?? []))
  useEffect(() => { cargar() }, [])

  function exportar() {
    const headers = ['Sigla', 'Descripcion', 'Horas', 'Categoria (dia/manana/tarde/noche/noche8)', 'Es ausencia (Si/No)', 'Activo (Si/No)', 'Orden']
    const filas = lista.map(s => [s.sigla, s.descripcion, s.horas, s.categoria_capacidad ?? '', s.es_ausencia ? 'Si' : 'No', s.activo ? 'Si' : 'No', s.orden])
    exportarExcelSimple('Catalogo_Siglas.xlsx', 'Siglas', headers, filas, [12, 44, 8, 32, 16, 14, 8])
  }

  async function importar(file: File) {
    setMsg('Procesando…')
    const filas = await leerFilas(file)
    const payload: Record<string, unknown>[] = []
    const errores: string[] = []
    filas.slice(1).forEach((r, i) => {
      const sigla = (r[0] ?? '').trim()
      if (!sigla) return
      const cat = (r[3] ?? '').trim().toLowerCase()
      if (cat && !CAT_VALIDAS.includes(cat)) { errores.push(`Fila ${i + 2}: categoría "${r[3]}" inválida`); return }
      payload.push({
        sigla, descripcion: (r[1] ?? '').trim() || sigla, horas: Number(r[2]) || 0,
        categoria_capacidad: cat || null, es_ausencia: esSi(r[4] ?? ''),
        activo: r[5] != null && r[5] !== '' ? esSi(r[5]) : true, orden: Number(r[6]) || 0,
      })
    })
    if (payload.length === 0) { setMsg('Sin filas válidas. ' + errores.join('; ')); return }
    const { error, count } = await supabase.from('catalogo_siglas').upsert(payload, { onConflict: 'sigla', count: 'exact' })
    setMsg(error ? 'Error: ' + error.message : `Siglas importadas/actualizadas: ${count ?? payload.length}.` + (errores.length ? ` Omitidas: ${errores.length}` : ''))
    cargar()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); if (!form) return
    const payload = {
      sigla: form.sigla?.trim(), descripcion: form.descripcion?.trim(), horas: Number(form.horas) || 0,
      es_ausencia: form.es_ausencia ?? false, categoria_capacidad: form.categoria_capacidad || null,
      activo: form.activo ?? true, orden: Number(form.orden) || 0,
    }
    if (form.id) await supabase.from('catalogo_siglas').update(payload).eq('id', form.id)
    else await supabase.from('catalogo_siglas').insert(payload)
    setForm(null); cargar()
  }

  return (
    <div>
      <PageHeader title="Catálogo de siglas" subtitle="Códigos de turno, horas y categoría de capacidad"
        action={<div className="flex gap-2">
          <Btn variant="ghost" onClick={exportar}>⬇ Exportar</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>⬆ Importar</Btn>
          <Btn onClick={() => setForm({ horas: 0, activo: true, es_ausencia: false, orden: (lista[lista.length - 1]?.orden ?? 0) + 10 })}>+ Nueva sigla</Btn>
        </div>} />
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
      {msg && <p className="mb-3 text-sm text-brand">{msg}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-brand text-left">
            <tr><th className="px-3 py-2">Sigla</th><th className="px-3 py-2">Descripción</th><th className="px-3 py-2 text-right">Horas</th><th className="px-3 py-2">Capacidad</th><th className="px-3 py-2">Ausencia</th><th className="px-3 py-2">Estado</th><th></th></tr>
          </thead>
          <tbody>
            {lista.map(s => (
              <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 font-bold text-brand">{s.sigla}</td>
                <td className="px-3 py-1.5 text-gray-600">{s.descripcion}</td>
                <td className="px-3 py-1.5 text-right">{s.horas}</td>
                <td className="px-3 py-1.5">{CATS.find(c => c.v === (s.categoria_capacidad ?? ''))?.l}</td>
                <td className="px-3 py-1.5">{s.es_ausencia ? 'Sí' : ''}</td>
                <td className="px-3 py-1.5"><span className={`rounded-full px-2 py-0.5 text-xs ${s.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td className="px-3 py-1.5 text-right"><button onClick={() => setForm(s)} className="text-brand-light hover:underline">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onClick={() => setForm(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={guardar} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h2 className="text-lg font-semibold text-brand">{form.id ? 'Editar' : 'Nueva'} sigla</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-gray-600">Sigla</span>
                <input required value={form.sigla ?? ''} onChange={e => setForm({ ...form, sigla: e.target.value })} className={inp} /></label>
              <label className="block"><span className="text-xs text-gray-600">Horas</span>
                <input type="number" step="0.5" value={form.horas ?? 0} onChange={e => setForm({ ...form, horas: Number(e.target.value) })} className={inp} /></label>
              <label className="block col-span-2"><span className="text-xs text-gray-600">Descripción</span>
                <input required value={form.descripcion ?? ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} className={inp} /></label>
              <label className="block"><span className="text-xs text-gray-600">Categoría capacidad</span>
                <select value={form.categoria_capacidad ?? ''} onChange={e => setForm({ ...form, categoria_capacidad: (e.target.value || null) as CatalogoSigla['categoria_capacidad'] })} className={inp}>
                  {CATS.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select></label>
              <label className="block"><span className="text-xs text-gray-600">Orden</span>
                <input type="number" value={form.orden ?? 0} onChange={e => setForm({ ...form, orden: Number(e.target.value) })} className={inp} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.es_ausencia ?? false} onChange={e => setForm({ ...form, es_ausencia: e.target.checked })} /> Es ausencia (no suma horas)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.activo ?? true} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activa</label>
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
