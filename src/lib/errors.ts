type SupabaseError = { message?: string; hint?: string | null; code?: string }
type ContextoError = 'servicios' | 'productos'

export class AppError extends Error {
  constructor(public codigo: string, public mensaje: string) {
    super(mensaje)
  }
}

const authErrors: Record<string, string> = {
  '23505': 'Ya existe una categoría con ese nombre.',
  '23503': 'Esa categoría tiene servicios. Desactívala en lugar de borrarla.',
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Ese correo ya está registrado.',
  email_not_confirmed: 'Confirma tu correo antes de entrar.',
  weak_password: 'La contraseña es muy corta.',
  over_email_send_rate_limit: 'Espera unos minutos antes de pedir otro correo.',
  provider_disabled: 'El acceso con Google todavía no está configurado.',
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'User already registered': 'Ese correo ya está registrado.',
  'Email not confirmed': 'Confirma tu correo antes de entrar.',
  horario_no_disponible: 'Esa hora ya se ocupó. Te mostramos otras disponibles.',
}

export function mensajeError(error: unknown, contexto: ContextoError = 'servicios') {
  if (error instanceof AppError) return error.mensaje
  const e = error as SupabaseError | null
  if (e?.code === '23503' && contexto === 'productos') return 'Esa categoría tiene productos. Desactívala en lugar de borrarla.'
  return authErrors[e?.code ?? ''] || e?.hint || authErrors[e?.message ?? ''] || 'Ocurrió un error. Inténtalo de nuevo.'
}

export function codigoError(error: unknown) {
  return error instanceof AppError ? error.codigo : (error as SupabaseError | null)?.message
}

export function verificar(error: SupabaseError | null, contexto?: ContextoError) {
  if (error) throw new AppError(error.message ?? '', mensajeError(error, contexto))
}

export function obtener<T extends { data: unknown; error: SupabaseError | null }>(result: T, contexto?: ContextoError): T['data'] {
  verificar(result.error, contexto)
  return result.data
}
