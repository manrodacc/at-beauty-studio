type SupabaseError = { message?: string; hint?: string | null; code?: string }

export class AppError extends Error {
  constructor(public codigo: string, public mensaje: string) {
    super(mensaje)
  }
}

const authErrors: Record<string, string> = {
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

export function mensajeError(error: unknown) {
  if (error instanceof AppError) return error.mensaje
  const e = error as SupabaseError | null
  return e?.hint || authErrors[e?.code ?? ''] || authErrors[e?.message ?? ''] || 'Ocurrió un error. Inténtalo de nuevo.'
}

export function codigoError(error: unknown) {
  return error instanceof AppError ? error.codigo : (error as SupabaseError | null)?.message
}

export function verificar(error: SupabaseError | null) {
  if (error) throw new AppError(error.message ?? '', mensajeError(error))
}

export function obtener<T extends { data: unknown; error: SupabaseError | null }>(result: T): T['data'] {
  verificar(result.error)
  return result.data
}
