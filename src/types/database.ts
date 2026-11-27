import type { Database, Tables } from './database.generated'

export type Role = Database['public']['Enums']['rol_usuario']
export type MetodoPago = Database['public']['Enums']['metodo_pago']
export type Profile = Tables<'profiles'>
export type Cliente = Tables<'clientes'>
export type Colaboradora = Tables<'colaboradoras'>
export type CategoriaServicio = Tables<'categorias_servicio'>
export type CategoriaProducto = Tables<'categorias_producto'>
export type Servicio = Tables<'servicios'>
export type Notificacion = Tables<'notificaciones'>
export type Producto = Tables<'productos'>
export type BloqueHorario = Pick<Tables<'horario_colaboradora'>, 'dia_semana' | 'hora_inicio' | 'hora_fin'>

// Postgres informa todos los campos de las vistas como anulables. Validamos
// los datos necesarios antes de ofrecer acciones sobre una cita.
type CitaRow = Tables<'citas_detalle'>
const requiredCitaFields = ['id', 'inicio', 'servicio', 'precio', 'duracion_min', 'estado'] as const
export type Cita = CitaRow & { [K in typeof requiredCitaFields[number]]: NonNullable<CitaRow[K]> }

export function esCita(row: CitaRow): row is Cita {
  return requiredCitaFields.every(key => row[key] !== null)
}
