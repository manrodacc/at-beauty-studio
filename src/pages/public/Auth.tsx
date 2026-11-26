import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { homeFor } from '@/app/nav'
import { Logo } from '@/components/layout/Logo'
import { Button, Field, Failure, Skeleton } from '@/components/ui'
import { obtener } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { cuentaCreada, salir, useAuth } from '@/providers/AuthProvider'

const correo = z.email('Escribe un correo válido.').trim()
const password = z.string().min(8, 'Usa al menos 8 caracteres.')
const loginSchema = z.object({ correo, password: z.string().min(1, 'Escribe tu contraseña.') })
const registerSchema = z.object({ correo, password, nombres: z.string().trim().min(1, 'Escribe tus nombres.'), apellidos: z.string().trim().min(1, 'Escribe tus apellidos.'), telefono: z.string().trim().regex(/^(?:\+?[\d ()-]{7,18})?$/, 'Escribe un teléfono válido.') })
const resetSchema = z.object({ correo })
const newPasswordSchema = z.object({ password, confirmacion: z.string() }).refine(value => value.password === value.confirmacion, { path: ['confirmacion'], message: 'Las contraseñas deben coincidir.' })

function PasswordField({ register, error, label = 'Contraseña', autoComplete = 'current-password' }: { register: UseFormRegisterReturn; error?: string; label?: string; autoComplete?: string }) {
  const [visible, setVisible] = useState(false)
  return <Field label={label} error={error}><span className="password-input"><input {...register} aria-invalid={!!error} autoComplete={autoComplete} type={visible ? 'text' : 'password'}/><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></Field>
}

export default function Auth({ mode }: { mode: 'login' | 'registro' | 'definir' }) {
  return <main className="auth-page">
    <section className="auth-main"><Logo/><div className="auth-content">{mode === 'definir' ? <DefinePassword/> : <EntryForms key={mode} registration={mode === 'registro'}/>}</div></section>
    <aside className="auth-visual" aria-hidden><img src="/img/hero-800.webp" alt=""/><div><Sparkles/><p>Un momento<br/><em>para ti.</em></p></div></aside>
  </main>
}

function EntryForms({ registration }: { registration: boolean }) {
  const auth = useAuth()
  const location = useLocation()
  const [reset, setReset] = useState(new URLSearchParams(location.search).has('recuperar'))
  const [notice, setNotice] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const login = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) })
  const register = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { telefono: '' } })
  const recover = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) })
  const from = (location.state as { from?: string } | null)?.from
  const next = from && (from.startsWith('/app/') || from.startsWith('/admin/')) ? from : auth.profile ? homeFor(auth.profile.rol) : '/app'

  if (auth.loading) return <Skeleton/>
  if (auth.session && auth.profile) return <Navigate to={next} replace/>
  if (auth.session) return <><h1>No pudimos cargar tu perfil</h1><Failure error={auth.profileError} retry={auth.refreshProfile}/><Button variant="outline" onClick={() => void salir()}>Salir</Button></>
  if (confirmationEmail) return <>
    <h1>Cuenta creada</h1>
    <p role="status">{cuentaCreada} Revisa el mensaje que enviamos a <strong>{confirmationEmail}</strong> para confirmar tu correo electrónico.</p>
    <Button asChild><Link to="/login" state={location.state}>Ir al inicio de sesión</Link></Button>
  </>
  const toggleReset = () => { setReset(!reset); setError(null); setNotice('') }
  const submit = async (action: () => Promise<void>) => {
    setError(null); setNotice('')
    try { await action() } catch (problem) { setError(problem) }
  }

  return <>
    <p className="eyebrow"><Sparkles size={15}/> AT BEAUTY STUDIO</p>
    <h1>{reset ? 'Recupera tu acceso' : registration ? 'Crea tu cuenta' : 'Bienvenida de nuevo'}</h1>
    <p>{reset ? 'Te enviaremos un enlace para definir tu contraseña.' : registration ? 'Crea tu cuenta para reservar y consultar tus citas.' : 'Ingresa para reservar y gestionar tus citas.'}</p>
    {error !== null && <Failure error={error}/>}
    {notice && <div role="status" className="notice"><Mail size={19}/>{notice}</div>}
    {reset ? <form className="form-stack" onSubmit={recover.handleSubmit(values => submit(async () => {
      await auth.resetPassword(values.correo)
      setNotice('Si existe una cuenta con ese correo, recibirás un enlace de recuperación.')
    }))}>
      <Field label="Correo electrónico" error={recover.formState.errors.correo?.message}><input type="email" autoComplete="email" {...recover.register('correo')}/></Field>
      <Button type="submit" disabled={recover.formState.isSubmitting}>Enviar enlace</Button>
      <Button variant="ghost" onClick={toggleReset}>Volver al inicio de sesión</Button>
    </form> : registration ? <form className="form-stack" onSubmit={register.handleSubmit(values => submit(async () => {
      const data = await auth.signUp(values)
      if (data.session) toast.success(cuentaCreada)
      else if (data.user && data.user.identities?.length !== 0) setConfirmationEmail(values.correo)
      else setNotice('Revisa tu correo para continuar. Si ya tienes una cuenta, puedes iniciar sesión.')
    }))}>
      <div className="form-row">
        <Field label="Nombres" error={register.formState.errors.nombres?.message}><input autoComplete="given-name" {...register.register('nombres')}/></Field>
        <Field label="Apellidos" error={register.formState.errors.apellidos?.message}><input autoComplete="family-name" {...register.register('apellidos')}/></Field>
      </div>
      <Field label="Teléfono (opcional)" error={register.formState.errors.telefono?.message}><input type="tel" autoComplete="tel" {...register.register('telefono')}/></Field>
      <Field label="Correo electrónico" error={register.formState.errors.correo?.message}><input type="email" autoComplete="email" {...register.register('correo')}/></Field>
      <PasswordField register={register.register('password')} autoComplete="new-password" error={register.formState.errors.password?.message}/>
      <Button type="submit" disabled={register.formState.isSubmitting}>Crear cuenta</Button>
    </form> : <form className="form-stack" onSubmit={login.handleSubmit(values => submit(async () => { await auth.signIn(values.correo, values.password) }))}>
      <Field label="Correo electrónico" error={login.formState.errors.correo?.message}><input type="email" autoComplete="email" {...login.register('correo')}/></Field>
      <PasswordField register={login.register('password')} error={login.formState.errors.password?.message}/>
      <button type="button" className="text-link forgot-link" onClick={toggleReset}>Olvidé mi contraseña</button>
      <Button type="submit" disabled={login.formState.isSubmitting}>Ingresar</Button>
    </form>}
    {!reset && <><div className="auth-separator">o</div><Button variant="outline" className="google-button" disabled={googleBusy} onClick={() => {
      setGoogleBusy(true)
      void submit(async () => { await auth.signInGoogle() }).finally(() => setGoogleBusy(false))
    }}><span aria-hidden className="google-mark">G</span> Continuar con Google</Button>
    <p className="auth-switch">{registration ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'} <Link state={location.state} to={registration ? '/login' : '/registro'}>{registration ? 'Ingresa' : 'Regístrate'}</Link></p></>}
  </>
}

function DefinePassword() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [waiting, setWaiting] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const form = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) })
  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(false), 3000)
    return () => window.clearTimeout(timer)
  }, [])
  if (!session && waiting) return <Skeleton/>
  if (!session) return <><h1>El enlace venció o ya se usó</h1><p>Pide un nuevo enlace para definir tu contraseña.</p><Button asChild><Link to="/login?recuperar">Pedir otro enlace</Link></Button></>
  return <><h1>Define tu contraseña</h1><p>Elige una contraseña de al menos ocho caracteres.</p>{error !== null && <Failure error={error}/>}
    <form className="form-stack" onSubmit={form.handleSubmit(async values => {
      setError(null)
      try { obtener(await supabase.auth.updateUser({ password: values.password })); navigate('/app', { replace: true }) }
      catch (problem) { setError(problem) }
    })}>
      <PasswordField register={form.register('password')} autoComplete="new-password" error={form.formState.errors.password?.message}/>
      <PasswordField register={form.register('confirmacion')} label="Confirma tu contraseña" autoComplete="new-password" error={form.formState.errors.confirmacion?.message}/>
      <Button type="submit" disabled={form.formState.isSubmitting}>Guardar contraseña</Button>
    </form>
  </>
}
