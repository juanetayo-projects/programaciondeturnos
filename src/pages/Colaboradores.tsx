import { useEffect, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { Cargo, Colaborador, Servicio } from '../lib/types'
import { Btn, PageHeader } from '../components/ui'

type Form = Partial<Colaborador>

const VACIO: Form = { nombre_completo: '', numero_documento: '', email: '', telefono: '', activo: true }

export default function Colaboradores() {
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const [lista, setLista] = useState<Colaborador[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [filtroServicio, setFiltroServicio] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar, setBuscar] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function cargar() {
    const { data } = await supabase.from('colaboradores').select('*').order('nombre_completo')
    setLista((data as Colaborador[]) ?? [])
  }
  useEffect(() => {
    supabase.from('servicios').select('*').eq('activo', true).order('nombre').then(r => setServicios((r.data as Servicio[]) ?? []))
    supabase.from('cargos').select('*').eq('activo', true).order('nombre').then(r => setCargos((r.data as Cargo[]) ?? []))
    cargar()
  }, [])

  const servNombre = (id: string) => servicios.find(s => s.id === id)?.nombre ?? '—'
  const cargoNombre = (id: string) => cargos.find(c => c.id === id)?.nombre ?? '—'

  const filtrada = lista.filter(c =>
    (!filtroServicio || c.servicio_id === filtroServicio) &&
    (!filtroEstado || String(c.activo) === filtroEstado) &&
    (!buscar || c.nombre_completo.toLowerCase().includes(buscar.toLowerCase()) || c.numero_documento.includes(buscar))
  )

  function nuevo() {
    setError(null)
    setForm({ ...VACIO, servicio_id: esAdmin ? servicios[0]?.id : perfil?.servicio_id ?? undefined, cargo_id: cargos[0]?.id })
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setGuardando(true); setError(null)
    const payload = {
      nombre_completo: form.nombre_completo?.trim(),
      numero_documento: form.numero_documento?.trim(),
      email: form.email?.trim() || null,
      telefono: form.telefono?.trim() || null,
      servicio_id: form.servicio_id,
      cargo_id: form.cargo_id,
      activo: form.activo ?? true,
      fecha_ingreso: form.fecha_ingreso || null,
    }
    const res = form.id
      ? await supabase.from('colaboradores').update(payload).eq('id', form.id)
      : await supabase.from('colaboradores').insert(payload)
    setGuardando(false)
    if (res.error) { setError(res.error.message.includes('duplicate') ? 'Ya existe un colaborador con ese documento.' : res.error.message); return }
    setForm(null); cargar()
  }

  async function toggleActivo(c: Colaborador) {
    await supabase.from('colaboradores').update({ activo: !c.activo }).eq('id', c.id)
    cargar()
  }

  async function descargarPlantilla() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Colaboradores')
    ws.columns = [
      { header: 'Nombre Completo', key: 'n', width: 34 },
      { header: 'Numero Documento', key: 'd', width: 18 },
      { header: 'Email', key: 'e', width: 30 },
      { header: 'Telefono', key: 't', width: 16 },
      { header: 'Servicio', key: 's', width: 20 },
      { header: 'Cargo', key: 'c', width: 22 },
    ]
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
    ws.addRow(['JUAN PEREZ EJEMPLO', '12345678', 'juan.perez@correo.co', '3001234567', servicios[0]?.nombre ?? 'UCI UCIN', cargos[0]?.nombre ?? 'Auxiliar de Enfermería'])
    const listas = wb.addWorksheet('Valores válidos')
    listas.addRow(['Servicios', 'Cargos'])
    const maxL = Math.max(servicios.length, cargos.length)
    for (let i = 0; i < maxL; i++) listas.addRow([servicios[i]?.nombre ?? '', cargos[i]?.nombre ?? ''])
    listas.getRow(1).font = { bold: true }
    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf]), 'Plantilla_Colaboradores.xlsx')
  }

  async function importar(file: File) {
    setImportMsg('Procesando…')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
    const ws = wb.worksheets[0]
    const servByName = new Map(servicios.map(s => [s.nombre.trim().toLowerCase(), s.id]))
    const cargoByName = new Map(cargos.map(c => [c.nombre.trim().toLowerCase(), c.id]))
    const filas: Record<string, unknown>[] = []
    const errores: string[] = []
    ws.eachRow((row, n) => {
      if (n === 1) return // encabezado
      const val = (i: number) => String(row.getCell(i).text ?? '').trim()
      const nombre = val(1), doc = val(2)
      if (!nombre && !doc) return
      const sId = servByName.get(val(5).toLowerCase()), cId = cargoByName.get(val(6).toLowerCase())
      if (!sId) { errores.push(`Fila ${n}: servicio "${val(5)}" no existe`); return }
      if (!cId) { errores.push(`Fila ${n}: cargo "${val(6)}" no existe`); return }
      filas.push({ nombre_completo: nombre, numero_documento: doc, email: val(3) || null, telefono: val(4) || null, servicio_id: sId, cargo_id: cId })
    })
    if (filas.length === 0) { setImportMsg('No se encontraron filas válidas. ' + errores.join('; ')); return }
    const { error, count } = await supabase.from('colaboradores').upsert(filas, { onConflict: 'numero_documento', count: 'exact' })
    if (error) { setImportMsg('Error: ' + error.message); return }
    setImportMsg(`Importados/actualizados: ${count ?? filas.length}.` + (errores.length ? ` Omitidos: ${errores.length} (${errores.slice(0, 3).join('; ')}${errores.length > 3 ? '…' : ''})` : ''))
    cargar()
  }

  return (
    <div>
      <PageHeader title="Colaboradores" subtitle="Gestión del personal por servicio"
        action={<div className="flex gap-2">
          <Btn variant="ghost" onClick={descargarPlantilla}>⬇ Plantilla</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}>⬆ Importar</Btn>
          <Btn onClick={nuevo}>+ Nuevo colaborador</Btn>
        </div>} />
      <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
      {importMsg && <p className="mb-3 text-sm text-brand">{importMsg}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        <input placeholder="Buscar nombre o documento…" value={buscar} onChange={e => setBuscar(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm min-w-56" />
        <select value={filtroServicio} onChange={e => setFiltroServicio(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Todos los servicios</option>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-brand text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Nombre</th>
              <th className="px-3 py-2 font-semibold">Documento</th>
              <th className="px-3 py-2 font-semibold">Correo</th>
              <th className="px-3 py-2 font-semibold">Servicio</th>
              <th className="px-3 py-2 font-semibold">Cargo</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrada.map(c => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">{c.nombre_completo}</td>
                <td className="px-3 py-2">{c.numero_documento}</td>
                <td className="px-3 py-2">{c.email ?? <span className="text-amber-600">sin correo</span>}</td>
                <td className="px-3 py-2">{servNombre(c.servicio_id)}</td>
                <td className="px-3 py-2">{cargoNombre(c.cargo_id)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => { setError(null); setForm(c) }} className="text-brand-light hover:underline mr-3">Editar</button>
                  <button onClick={() => toggleActivo(c)} className="text-gray-500 hover:underline">{c.activo ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
            {filtrada.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Sin colaboradores.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onClick={() => setForm(null)}>
          <form onClick={e => e.stopPropagation()} onSubmit={guardar}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-3">
            <h2 className="text-lg font-semibold text-brand">{form.id ? 'Editar' : 'Nuevo'} colaborador</h2>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre completo" full>
                <input required value={form.nombre_completo ?? ''} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} className={inp} />
              </Campo>
              <Campo label="Número de documento">
                <input required value={form.numero_documento ?? ''} onChange={e => setForm({ ...form, numero_documento: e.target.value })} className={inp} />
              </Campo>
              <Campo label="Correo electrónico">
                <input type="email" value={form.email ?? ''} onChange={e => setForm({ ...form, email: e.target.value })} className={inp} />
              </Campo>
              <Campo label="Teléfono">
                <input value={form.telefono ?? ''} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inp} />
              </Campo>
              <Campo label="Fecha de ingreso">
                <input type="date" value={form.fecha_ingreso ?? ''} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} className={inp} />
              </Campo>
              <Campo label="Servicio">
                <select required value={form.servicio_id ?? ''} onChange={e => setForm({ ...form, servicio_id: e.target.value })} className={inp}>
                  <option value="" disabled>Seleccione…</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </Campo>
              <Campo label="Cargo">
                <select required value={form.cargo_id ?? ''} onChange={e => setForm({ ...form, cargo_id: e.target.value })} className={inp}>
                  <option value="" disabled>Seleccione…</option>
                  {cargos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Btn>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-light focus:ring-1 focus:ring-brand-light outline-none'
function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  )
}
