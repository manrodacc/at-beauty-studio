import { Bell, CalendarCheck2, CalendarDays, ChartNoAxesCombined, ClipboardList, Clock3, CreditCard, House, Package, Receipt, Settings, Sparkles, UserRound, Users } from 'lucide-react'
import type { Role } from '@/types/database.generated'

export const homeFor = (role: Role) => ({ admin: '/admin/inicio', colaboradora: '/app/agenda', cliente: '/app/inicio' })[role]

export const navigation = {
  cliente: [
    { path: '/app/inicio', label: 'Inicio', icon: House, mobile: true },
    { path: '/app/agendar', label: 'Agendar', icon: CalendarDays, mobile: true },
    { path: '/app/mis-citas', label: 'Mis citas', icon: CalendarCheck2, mobile: true },
    { path: '/app/historial', label: 'Historial', icon: ClipboardList, mobile: false },
    { path: '/app/perfil', label: 'Perfil', icon: UserRound, mobile: true },
  ],
  colaboradora: [
    { path: '/app/agenda', label: 'Agenda', icon: CalendarDays },
    { path: '/app/pagos', label: 'Pagos', icon: CreditCard },
    { path: '/app/asistencia', label: 'Asistencia', icon: Clock3 },
    { path: '/app/inventario', label: 'Inventario', icon: Package },
    { path: '/app/notificaciones', label: 'Notificaciones', icon: Bell },
  ],
  admin: [
    { path: '/admin/inicio', label: 'Inicio', icon: House },
    { path: '/admin/citas', label: 'Citas', icon: CalendarDays },
    { path: '/admin/clientes', label: 'Clientes', icon: Users },
    { path: '/admin/colaboradoras', label: 'Colaboradoras', icon: UserRound },
    { path: '/admin/servicios', label: 'Servicios', icon: Sparkles },
    { path: '/admin/inventario', label: 'Inventario', icon: Package },
    { path: '/admin/pagos', label: 'Pagos', icon: CreditCard },
    { path: '/admin/caja', label: 'Caja', icon: Receipt },
    { path: '/admin/asistencia', label: 'Asistencia', icon: Clock3 },
    { path: '/admin/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
    { path: '/admin/configuracion', label: 'Configuración', icon: Settings },
  ],
}
