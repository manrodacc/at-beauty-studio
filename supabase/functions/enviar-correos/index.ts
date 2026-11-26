import { createClient } from 'npm:@supabase/supabase-js@2'
import { timingSafeEqual } from 'node:crypto'
import { env, failure, json, serverKey } from '../_shared/http.ts'

const encoder = new TextEncoder()
function sameSecret(provided: string, expected: string) {
  const left = encoder.encode(provided)
  const right = encoder.encode(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

Deno.serve(async request => {
  if (request.method !== 'POST') return failure('metodo_no_permitido', 'Usa una solicitud POST.', 405)
  try {
    if (!sameSecret(request.headers.get('X-Studio-Cron') ?? '', env('CORREO_CRON_SECRET')))
      return failure('no_autorizado', 'Esta función está reservada al trabajo programado del estudio.', 403)
    const apiKey = env('RESEND_API_KEY')
    const from = env('CORREO_REMITENTE')
    const site = new URL(env('SITE_URL')).origin
    const admin = createClient(env('SUPABASE_URL'), serverKey('secret'), { auth: { autoRefreshToken: false, persistSession: false } })
    const recent = new Date(Date.now() - 23 * 60 * 60_000).toISOString()
    const queue = await admin.from('notificaciones').select('id,id_usuario,titulo,mensaje')
      .eq('enviar_correo', true).is('correo_enviado_at', null).gte('created_at', recent)
      .order('created_at').limit(40)
    if (queue.error) return failure('cola_no_disponible', 'No se pudo consultar la cola de correos.', 503)

    const rows = queue.data
    if (!rows.length) return json({ enviados: 0, pendientes: 0 })
    const people = await admin.from('profiles').select('id,correo,estado').in('id', [...new Set(rows.map(row => row.id_usuario))])
    if (people.error) return failure('destinatarios_no_disponibles', 'No se pudo consultar a los destinatarios.', 503)
    const addresses = new Map(people.data.filter(person => person.estado && person.correo).map(person => [person.id, person.correo]))
    let enviados = 0
    let pendientes = 0
    for (const row of rows) {
      const address = addresses.get(row.id_usuario)
      if (!address) continue
      const html = '<main lang="es" style="background:#fff1f7;color:#3e1236;padding:28px;font-family:Arial,sans-serif"><h1>AT Beauty Studio</h1><h2>'
        + escapeHtml(row.titulo) + '</h2><p>' + escapeHtml(row.mensaje).replace(/\n/g, '<br>') + '</p><p><a style="color:#9d2763" href="' + escapeHtml(site) + '/app">Ver mi cuenta</a></p></main>'
      try {
        const sent = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(9000),
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'at-beauty-notificacion-' + row.id },
          body: JSON.stringify({ from, to: [address], subject: row.titulo, html, text: row.titulo + '\n\n' + row.mensaje + '\n\n' + site + '/app' }),
        })
        if (!sent.ok) { pendientes += 1; continue }
        const marked = await admin.from('notificaciones').update({ correo_enviado_at: new Date().toISOString() })
          .eq('id', row.id).is('correo_enviado_at', null)
        if (marked.error) pendientes += 1
        else enviados += 1
      } catch { pendientes += 1 }
    }
    return json({ enviados, pendientes }, pendientes ? 503 : 200)
  } catch {
    return failure('error_servidor', 'No se pudo procesar la cola de correos.', 500)
  }
})
