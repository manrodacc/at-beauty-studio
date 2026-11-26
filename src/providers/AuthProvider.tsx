import { useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { AppError, mensajeError, obtener, verificar } from '@/lib/errors'
import { googleDisponible, siteUrl, supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database.generated'

type Registration = { correo: string; password: string; nombres: string; apellidos: string; telefono: string }
export const cuentaCreada = 'Tu cuenta se ha creado con éxito.'
const googleStartKey = 'at-google-auth-start'

function confirmGoogleRegistration(user?: User) {
  let started: string | null
  try {
    started = sessionStorage.getItem(googleStartKey)
    sessionStorage.removeItem(googleStartKey)
  } catch { return }
  if (!started || !user?.last_sign_in_at || user.app_metadata.provider !== 'google') return
  // Compare durations so a difference between the device and server clocks is harmless.
  const accountAge = Date.parse(user.last_sign_in_at) - Date.parse(user.created_at)
  if (accountAge >= 0 && accountAge <= Date.now() - Number(started)) toast.success(cuentaCreada)
}

const authActions = {
  signIn: async (email: string, password: string) => obtener(await supabase.auth.signInWithPassword({ email, password })),
  signUp: async ({ correo, password, ...data }: Registration) => obtener(await supabase.auth.signUp({ email: correo, password, options: { data, emailRedirectTo: siteUrl + '/app' } })),
  signInGoogle: async () => {
    if (!await googleDisponible()) throw new AppError('provider_disabled', 'El acceso con Google todavía no está configurado.')
    try { sessionStorage.setItem(googleStartKey, String(Date.now())) } catch { /* El acceso también funciona sin almacenamiento de sesión. */ }
    return obtener(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/app' } }))
  },
  resetPassword: async (email: string) => obtener(await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl + '/definir-contrasena' })),
  signOut: async () => verificar((await supabase.auth.signOut()).error),
}
type Auth = typeof authActions & {
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileError: unknown
  refreshProfile: () => void
}
const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const cache = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileState, setProfileState] = useState<{ id: string; profile: Profile | null; error?: unknown } | null>(null)
  const [revision, setRevision] = useState(0)
  const userId = session?.user.id

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') confirmGoogleRegistration(next?.user)
      setSession(next)
      setInitializing(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    cache.removeQueries({ predicate: query => query.queryKey[0] !== 'catalogo' })
    if (!userId) setProfileState(null)
  }, [userId, cache])

  useEffect(() => {
    if (!userId) return
    let active = true
    async function load() {
      try {
        const profile = obtener(await supabase.from('profiles').select('*').eq('id', userId!).single())
        if (!active) return
        if (profile && !profile.estado) {
          toast.error('Cuenta desactivada')
          setProfileState({ id: userId!, profile: null, error: { hint: 'Cuenta desactivada.' } })
          await supabase.auth.signOut({ scope: 'local' })
          return
        }
        setProfileState({ id: userId!, profile })
      } catch (error) {
        if (active) setProfileState({ id: userId!, profile: null, error })
      }
    }
    void load()
    return () => { active = false }
  }, [userId, revision])

  return <AuthContext.Provider value={{
    ...authActions, session, profile: profileState && profileState.id === userId ? profileState.profile : null,
    loading: initializing || (!!userId && profileState?.id !== userId),
    profileError: profileState && profileState.id === userId ? profileState.error : null,
    refreshProfile: () => { setProfileState(null); setRevision(value => value + 1) },
  }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Falta el proveedor de autenticación.')
  return context
}

export async function salir() {
  try { await authActions.signOut() }
  catch (error) { toast.error(mensajeError(error)) }
}
