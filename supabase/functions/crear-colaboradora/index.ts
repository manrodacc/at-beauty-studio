import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { env, failure, json, serverKey } from '../_shared/http.ts'

const reloj = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
const opt = z.string().trim().max(150).optional()
const schema = z.object({
  nombres: z.string().trim().min(1).max(150),
  apellidos: opt,
  telefono: opt,
  especialidad: opt,
  correo: z.email().trim().toLowerCase(),
  servicios: z.array(z.number().int().positive()).max(120),
  horarios: z.array(z.object({
    dia_semana: z.number().int().min(1).max(7), hora_inicio: reloj, hora_fin: reloj,
  })).max(70),
  estado: z.boolean().default(true),
})
const authOptions = { persistSession: false, autoRefreshToken: false }

function normalizeHour(hour: string) {
  return hour.length === 5 ? hour + ':00' : hour
}

Deno.serve(async request => {
  let cors: Record<string, string> = {}
  try {
    const site = new URL(env('SITE_URL')).origin
    const origin = request.headers.get('origin')
    cors = {
      'Access-Control-Allow-Origin': origin && [site, 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin) ? origin : site,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'POST') return failure('metodo_no_permitido', 'Usa la acción de invitación del panel.', 405, cors)
    const token = /^Bearer\s+([^\s]+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1]
    if (!token) return failure('no_autenticado', 'Inicia sesión de nuevo.', 401, cors)

    const url = env('SUPABASE_URL')
    const caller = createClient(url, serverKey('publishable'), { auth: authOptions, global: { headers: { Authorization: 'Bearer ' + token } } })
    const { data: { user }, error: authError } = await caller.auth.getUser(token)
    if (authError || !user) return failure('no_autenticado', 'Inicia sesión de nuevo.', 401, cors)
    const { data: profile, error: profileError } = await caller.from('profiles').select('rol,estado').eq('id', user.id).maybeSingle()
    if (profileError || profile?.rol !== 'admin' || !profile.estado) return failure('no_autorizado', 'Solo una administradora activa puede invitar colaboradoras.', 403, cors)

    const payload = schema.safeParse(await request.json().catch(() => null))
    if (!payload.success) return failure('datos_incompletos', 'Revisa el nombre, el correo, los servicios y el horario.', 400, cors)
    const values = payload.data
    const blocks = values.horarios.map(block => ({ ...block, hora_inicio: normalizeHour(block.hora_inicio), hora_fin: normalizeHour(block.hora_fin) }))
    const invalidSchedule = blocks.some((a, i) => a.hora_inicio >= a.hora_fin || blocks.some((b, j) => j > i && a.dia_semana === b.dia_semana && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin))
    if (invalidSchedule) return failure('horario_invalido', 'Revisa el orden y los cruces de los bloques del horario.', 400, cors)
    const services = [...new Set(values.servicios)]
    if (services.length) {
      const lookup = await caller.from('servicios').select('id').in('id', services)
      if (lookup.error) return failure('consulta_fallida', 'No pudimos revisar los servicios seleccionados.', 503, cors)
      if (lookup.data.length !== services.length) return failure('servicio_no_disponible', 'Uno de los servicios seleccionados ya no existe.', 400, cors)
    }

    const management = createClient(url, serverKey('secret'), { auth: authOptions })
    const lookupEmail = async () => management.from('profiles').select('id,rol')
      .ilike('correo', values.correo.replace(/[\\%_]/g, '\\$&')).maybeSingle()
    const found = await lookupEmail()
    if (found.error) return failure('consulta_fallida', 'No pudimos revisar si ese correo ya tiene cuenta.', 503, cors)
    if (found.data?.rol === 'admin') return failure('rol_administrativo', 'Este correo pertenece a una cuenta de administración.', 409, cors)
    let id = found.data?.id
    let invited = false
    if (!id) {
      const { data, error } = await management.auth.admin.inviteUserByEmail(values.correo, {
        redirectTo: site + '/definir-contrasena',
        data: { nombres: values.nombres, apellidos: values.apellidos ?? '', telefono: values.telefono ?? '' },
      })
      if (data.user && !error) {
        id = data.user.id
        invited = true
      } else if (error?.code === 'email_exists' || error?.code === 'user_already_exists') {
        const latest = await lookupEmail()
        if (latest.error || !latest.data || latest.data.rol === 'admin') return failure('invitacion_fallida', 'No pudimos vincular ese correo con una ficha de colaboradora.', 409, cors)
        id = latest.data.id
      } else {
        return failure('invitacion_fallida', 'No pudimos enviar la invitación. Revisa el correo e inténtalo nuevamente.', 502, cors)
      }
    }
    const { error } = await caller.rpc('admin_guardar_colaboradora', {
      p_usuario: id, p_nombres: values.nombres, p_apellidos: values.apellidos, p_telefono: values.telefono,
      p_especialidad: values.especialidad, p_servicios: services, p_horarios: blocks, p_estado: values.estado,
    })
    if (error) return failure(error.message, error.hint || 'No pudimos guardar la ficha. Puedes volver a intentarlo con el mismo correo.', 400, cors)
    return json({ ok: true, invitacion_enviada: invited }, 200, cors)
  } catch {
    return failure('error_servidor', 'No pudimos procesar la invitación en este momento.', 500, cors)
  }
})
