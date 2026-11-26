export function env(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error('Falta una variable del servidor.')
  return value
}

export function json(body: object, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers })
}

export function failure(error: string, hint: string, status: number, headers?: HeadersInit) {
  return json({ error, hint }, status, headers)
}

export function serverKey(kind: 'publishable' | 'secret') {
  const dictionary = Deno.env.get(kind === 'publishable' ? 'SUPABASE_PUBLISHABLE_KEYS' : 'SUPABASE_SECRET_KEYS')
  const keys: { default?: string } | null = dictionary ? JSON.parse(dictionary) : null
  return keys?.default || env(kind === 'publishable' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY')
}
