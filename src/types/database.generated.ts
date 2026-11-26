export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }
export type Role = 'admin' | 'colaboradora' | 'cliente'
export type EstadoCita = 'pendiente' | 'confirmada' | 'realizada' | 'cancelada'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'yape_plin'
type Table<T, RequiredKeys extends keyof T = never> = {
  Row: T
  Insert: Partial<T> & Pick<T, RequiredKeys>
  Update: Partial<T>
  Relationships: []
}
type Contacto = { nombres: string; apellidos: string | null; telefono: string | null }
export type Profile = Contacto & { id: string; correo: string | null; rol: Role; estado: boolean }
export type Cliente = Contacto & { id: number; id_usuario: string | null; correo: string | null; fecha_registro: string }
export type Colaboradora = Contacto & { id: number; id_usuario: string | null; especialidad: string | null; estado: boolean }
export type Servicio = { id: number; nombre: string; categoria: string; descripcion: string | null; precio: number; duracion_min: number; estado: boolean }
export type Cita = { id: number; cliente: string; servicio: string; categoria: string; precio: number; duracion_min: number; colaboradora: string; inicio: string; fin: string; fecha: string; hora_inicio: string; estado: EstadoCita; observaciones: string | null; limite_cancelacion: string; puede_cancelar: boolean }
export type Notificacion = { id: number; id_usuario: string; tipo: string; titulo: string; mensaje: string; id_cita: number | null; leida: boolean; enviar_correo: boolean; correo_enviado_at: string | null; clave: string | null; created_at: string }
export type Producto = { id: number; nombre: string; categoria: string; unidad: string; stock_actual: number; stock_minimo: number; costo_unitario: number; estado: boolean }
export type Atencion = { id: number; id_cita: number | null; id_cliente: number; id_servicio: number; id_colaboradora: number; fecha_hora: string; fecha: string; duracion_real_min: number; total: number; observaciones: string | null; registrada_por: string }
export type Pago = { id: number; id_atencion: number; id_cierre: number | null; metodo_pago: MetodoPago; monto: number; comprobante: string | null; fecha_hora: string; fecha: string; registrado_por: string }
export type Asistencia = { id: number; id_colaboradora: number; fecha: string; hora_ingreso: string; hora_salida: string | null; horas_trabajadas: number | null; tardanza_min: number; turno: string | null }
export type Cierre = { id: number; id_usuario: string; fecha: string; total_ingresos: number; total_egresos: number; monto_esperado: number; monto_contado: number; diferencia: number; observaciones: string | null }
type Horario = { id: number; id_colaboradora: number; dia_semana: number; hora_inicio: string; hora_fin: string }
export type BloqueHorario = Omit<Horario, 'id' | 'id_colaboradora'>
export type HoraLibre = { id_colaboradora: number; colaboradora: string; inicio: string; fin: string }
type Fn<T, R = Json> = { Args: T; Returns: R }
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      clientes: Table<Cliente, 'nombres'>
      colaboradoras: Table<Colaboradora>
      colaboradora_servicio: Table<{ id_colaboradora: number; id_servicio: number }>
      horario_colaboradora: Table<Horario>
      servicios: Table<Servicio, 'nombre' | 'categoria' | 'precio' | 'duracion_min'>
      citas: Table<{ id: number; id_servicio: number; id_cliente: number; id_colaboradora: number }>
      atenciones: Table<Atencion>
      pagos: Table<Pago>
      productos: Table<Producto, 'nombre' | 'categoria' | 'unidad'>
      movimientos_inventario: Table<{ id: number; id_producto: number; tipo: 'entrada' | 'salida'; cantidad: number; fecha_hora: string; motivo: string | null; id_usuario: string | null }, 'id_producto' | 'tipo' | 'cantidad'>
      egresos: Table<{ id: number; id_cierre: number | null; fecha: string; concepto: string; monto: number; registrado_por: string }, 'fecha' | 'concepto' | 'monto'>
      cierres_caja: Table<Cierre>
      asistencias: Table<Asistencia>
      notificaciones: Table<Notificacion>
      configuracion: Table<{ clave: string; valor: string | number; descripcion: string | null }>
    }
    Views: { citas_detalle: { Row: Cita; Relationships: [] } }
    Functions: {
      horarios_disponibles: Fn<{ p_servicio: number; p_fecha: string; p_colaboradora?: number; p_excluir_cita?: number }, HoraLibre[]>
      colaboradoras_para_servicio: Fn<{ p_servicio: number }, { id: number; nombre: string; especialidad: string | null }[]>
      agendar_cita: Fn<{ p_servicio: number; p_inicio: string; p_colaboradora?: number; p_cliente?: number; p_observaciones?: string }>
      cancelar_cita: Fn<{ p_cita: number; p_motivo?: string }>
      reprogramar_cita: Fn<{ p_cita: number; p_nuevo_inicio: string; p_colaboradora?: number }>
      registrar_atencion: Fn<{ p_cita?: number; p_cliente?: number; p_servicio?: number; p_colaboradora?: number; p_duracion_real_min?: number; p_total?: number; p_productos: Json; p_observaciones?: string }>
      registrar_pago: Fn<{ p_atencion: number; p_metodo: MetodoPago; p_monto: number; p_comprobante?: string }>
      cerrar_caja: Fn<{ p_monto_contado: number; p_observaciones?: string; p_fecha?: string }>
      marcar_ingreso: Fn<{ p_colaboradora?: number }>
      marcar_salida: Fn<{ p_colaboradora?: number }>
      admin_cambiar_rol: Fn<{ p_usuario: string; p_rol: Role }>
      admin_guardar_colaboradora: Fn<{ p_usuario: string; p_nombres: string; p_apellidos?: string; p_telefono?: string; p_especialidad?: string; p_servicios: number[]; p_horarios: Json; p_estado?: boolean }>
    }
    Enums: { rol_usuario: Role; estado_cita: EstadoCita; metodo_pago: MetodoPago; tipo_movimiento: 'entrada' | 'salida' }
    CompositeTypes: Record<never, never>
  }
}
