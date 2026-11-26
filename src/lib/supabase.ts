import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.generated'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url) throw new Error('Falta VITE_SUPABASE_URL en .env.local')
if (!key) throw new Error('Falta VITE_SUPABASE_ANON_KEY en .env.local')

export const supabase = createClient<Database>(url, key)
export const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '')

export async function googleDisponible() {
  const response = await fetch(url + '/auth/v1/settings', { headers: { apikey: key } })
  if (!response.ok) throw new Error('No se pudo consultar la autenticación.')
  const { external } = await response.json() as { external?: { google?: boolean } }
  return !!external?.google
}
