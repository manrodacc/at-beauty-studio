import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Button, Failure, Skeleton } from '@/components/ui'
import { salir, useAuth } from '@/providers/AuthProvider'
import type { Role } from '@/types/database'
import { homeFor } from './nav'

export function RequireRole({ allow }: { allow?: Role[] }) {
  const { profile, session, loading, profileError, refreshProfile } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-frame"><Skeleton/></div>
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }}/>
  if (!profile) return <div className="center-frame"><h1>No pudimos cargar tu perfil</h1><Failure error={profileError} retry={refreshProfile}/><Button variant="outline" onClick={() => void salir()}>Salir</Button></div>
  if (allow && !allow.includes(profile.rol)) return <Navigate to={homeFor(profile.rol)} replace/>
  return <Outlet/>
}

export function RoleHome() {
  const { profile } = useAuth()
  return <Navigate to={homeFor(profile!.rol)} replace/>
}

export function NotFound() {
  return <main className="center-frame"><h1>Página no encontrada</h1><p>La dirección que abriste no está disponible.</p><Button asChild><Link to="/">Volver al inicio</Link></Button></main>
}

export function RouteError() {
  return <main className="center-frame"><h1>No pudimos abrir esta página</h1><p>Prueba cargándola de nuevo.</p><Button onClick={() => window.location.reload()}>Recargar página</Button> <Button asChild variant="outline"><Link to="/">Volver al inicio</Link></Button></main>
}
