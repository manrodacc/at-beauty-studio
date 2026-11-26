import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { Skeleton } from '@/components/ui'
import { NotFound, RequireRole, RoleHome, RouteError } from './guards'

const Landing = lazy(() => import('@/pages/public/Landing'))
const Auth = lazy(() => import('@/pages/public/Auth'))
const Shell = lazy(() => import('@/components/layout/AppShell'))
const Client = lazy(() => import('@/pages/cliente/Client'))
const Booking = lazy(() => import('@/pages/cliente/Booking'))
const Staff = lazy(() => import('@/pages/colaboradora/Staff'))
const Admin = lazy(() => import('@/pages/admin/Admin'))
const Reports = lazy(() => import('@/pages/admin/Reports'))
const Notificaciones = lazy(() => import('@/features/notificaciones').then(module => ({ default: module.NotificacionesPage })))

export const router = createBrowserRouter([{
  element: <Suspense fallback={<div className="center-frame"><Skeleton/></div>}><Outlet/></Suspense>,
  errorElement: <RouteError/>,
  children: [
    { path: '/', element: <Landing/> },
    { path: '/login', element: <Auth mode="login"/> },
    { path: '/registro', element: <Auth mode="registro"/> },
    { path: '/definir-contrasena', element: <Auth mode="definir"/> },
    {
      path: '/app', element: <RequireRole/>, children: [
        { index: true, element: <RoleHome/> },
        { element: <RequireRole allow={['cliente', 'colaboradora']}/>, children: [
          { element: <Shell/>, children: [
            { path: 'notificaciones', element: <Notificaciones/> },
            { element: <RequireRole allow={['cliente']}/>, children: [
              { path: 'inicio', element: <Client page="inicio"/> },
              { path: 'agendar', element: <Booking/> },
              { path: 'mis-citas', element: <Client page="citas"/> },
              { path: 'historial', element: <Client page="historial"/> },
              { path: 'perfil', element: <Client page="perfil"/> },
            ] },
            { element: <RequireRole allow={['colaboradora']}/>, children: [
              { path: 'agenda', element: <Staff page="agenda"/> },
              { path: 'atencion/:cita', element: <Staff page="atencion"/> },
              { path: 'pagos', element: <Staff page="pagos"/> },
              { path: 'asistencia', element: <Staff page="asistencia"/> },
              { path: 'inventario', element: <Staff page="inventario"/> },
            ] },
          ] },
        ] },
      ],
    },
    {
      path: '/admin', element: <RequireRole allow={['admin']}/>, children: [
        { index: true, element: <RoleHome/> },
        { element: <Shell/>, children: [
          { path: 'inicio', element: <Admin page="inicio"/> },
          { path: 'citas', element: <Admin page="citas"/> },
          { path: 'atencion/:cita', element: <Staff page="atencion"/> },
          { path: 'clientes', element: <Admin page="clientes"/> },
          { path: 'colaboradoras', element: <Admin page="colaboradoras"/> },
          { path: 'servicios', element: <Admin page="servicios"/> },
          { path: 'inventario', element: <Staff page="inventario" admin/> },
          { path: 'pagos', element: <Staff page="pagos" admin/> },
          { path: 'caja', element: <Admin page="caja"/> },
          { path: 'asistencia', element: <Staff page="asistencia" admin/> },
          { path: 'reportes', element: <Reports/> },
          { path: 'configuracion', element: <Admin page="configuracion"/> },
        ] },
      ],
    },
    { path: '*', element: <NotFound/> },
  ],
}])
