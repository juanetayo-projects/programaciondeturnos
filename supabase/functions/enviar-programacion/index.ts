// Edge Function: envía por correo (Resend) la programación a cada colaborador.
// Entrada: { programacionId }. Usa el service role para leer datos y enviar.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FROM = Deno.env.get('RESEND_FROM') ?? 'Programación de Turnos <onboarding@resend.dev>'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { programacionId } = await req.json()
    if (!programacionId) return json({ error: 'Falta programacionId' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: prog } = await sb.from('programaciones')
      .select('id,anio,mes,servicio_id,cargo_id,servicios(nombre),cargos(nombre)').eq('id', programacionId).single()
    if (!prog) return json({ error: 'Programación no encontrada' }, 404)

    const [{ data: colabs }, { data: asigs }, { data: sigs }] = await Promise.all([
      sb.from('colaboradores').select('id,nombre_completo,email').eq('servicio_id', prog.servicio_id).eq('cargo_id', prog.cargo_id).eq('activo', true),
      sb.from('asignaciones').select('colaborador_id,fecha,sigla_id').eq('programacion_id', programacionId),
      sb.from('catalogo_siglas').select('id,sigla,descripcion'),
    ])
    const sigMap = new Map((sigs ?? []).map((s: any) => [s.id, s]))
    const porColab = new Map<string, { fecha: string; sigla: string; desc: string }[]>()
    for (const a of asigs ?? []) {
      const s = sigMap.get(a.sigla_id)
      const arr = porColab.get(a.colaborador_id) ?? []
      arr.push({ fecha: a.fecha, sigla: s?.sigla ?? '', desc: s?.descripcion ?? '' })
      porColab.set(a.colaborador_id, arr)
    }

    const servicio = (prog as any).servicios?.nombre ?? ''
    const cargo = (prog as any).cargos?.nombre ?? ''
    const periodo = `${MESES[prog.mes - 1]} ${prog.anio}`

    let enviados = 0; const sinCorreo: string[] = []
    for (const c of colabs ?? []) {
      if (!c.email) { sinCorreo.push(c.nombre_completo); continue }
      const turnos = (porColab.get(c.id) ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))
      const filas = turnos.map(t => `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb">${t.fecha}</td><td style="padding:4px 8px;border:1px solid #e5e7eb"><b>${t.sigla}</b></td><td style="padding:4px 8px;border:1px solid #e5e7eb">${t.desc}</td></tr>`).join('')
      const html = `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
          <div style="background:#0D2D6B;color:#fff;padding:16px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">Programación de Turnos</h2>
            <p style="margin:4px 0 0;color:#cdd9f0">${servicio} · ${cargo} · ${periodo}</p>
          </div>
          <div style="padding:16px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
            <p>Hola <b>${c.nombre_completo}</b>, esta es tu programación de turnos para ${periodo}:</p>
            <table style="border-collapse:collapse;font-size:13px"><thead><tr style="background:#EAF0FA;color:#0D2D6B"><th style="padding:6px 8px;text-align:left;border:1px solid #e5e7eb">Fecha</th><th style="padding:6px 8px;border:1px solid #e5e7eb">Turno</th><th style="padding:6px 8px;text-align:left;border:1px solid #e5e7eb">Descripción</th></tr></thead><tbody>${filas || '<tr><td colspan="3" style="padding:8px">Sin turnos asignados.</td></tr>'}</tbody></table>
            <p style="color:#6b7280;font-size:12px;margin-top:16px">Clínica de Alta Complejidad Santa Bárbara — Sistema Interno</p>
          </div>
        </div>`
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: c.email, subject: `Programación de turnos — ${servicio} — ${periodo}`, html }),
      })
      if (r.ok) enviados++
    }

    await sb.from('programaciones').update({ estado: 'enviada', enviado_at: new Date().toISOString() }).eq('id', programacionId)
    return json({ enviados, sinCorreo, total: (colabs ?? []).length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
