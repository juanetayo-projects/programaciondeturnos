// Edge Function: gestión de usuarios (solo admin).
// Acciones: create (crea auth user + perfil) | delete (elimina usuario).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization') ?? ''
    // Cliente con el JWT del solicitante para identificarlo
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
    if (perfil?.rol !== 'admin') return json({ error: 'Solo el administrador puede gestionar usuarios' }, 403)

    const body = await req.json()
    if (body.action === 'create') {
      const { email, password, nombre, rol, servicio_id } = body
      if (!email || !password || !nombre) return json({ error: 'Faltan datos obligatorios' }, 400)
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      const { error: e2 } = await admin.from('perfiles').insert({
        id: created.user.id, nombre, email, rol: rol ?? 'coordinador', servicio_id: servicio_id || null,
      })
      if (e2) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: e2.message }, 400) }
      return json({ ok: true, id: created.user.id })
    }
    if (body.action === 'delete') {
      if (body.id === user.id) return json({ error: 'No puedes eliminar tu propio usuario' }, 400)
      const { error } = await admin.auth.admin.deleteUser(body.id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }
    return json({ error: 'Acción no válida' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
