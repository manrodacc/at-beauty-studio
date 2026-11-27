export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      asistencias: {
        Row: {
          fecha: string
          hora_ingreso: string | null
          hora_salida: string | null
          horas_trabajadas: number | null
          id: number
          id_colaboradora: number
          tardanza_min: number
          turno: string | null
        }
        Insert: {
          fecha?: string
          hora_ingreso?: string | null
          hora_salida?: string | null
          horas_trabajadas?: number | null
          id?: never
          id_colaboradora: number
          tardanza_min?: number
          turno?: string | null
        }
        Update: {
          fecha?: string
          hora_ingreso?: string | null
          hora_salida?: string | null
          horas_trabajadas?: number | null
          id?: never
          id_colaboradora?: number
          tardanza_min?: number
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asistencias_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
        ]
      }
      atenciones: {
        Row: {
          duracion_real_min: number | null
          fecha: string | null
          fecha_hora: string
          id: number
          id_cita: number | null
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          observaciones: string | null
          registrada_por: string | null
          total: number
        }
        Insert: {
          duracion_real_min?: number | null
          fecha?: string | null
          fecha_hora?: string
          id?: never
          id_cita?: number | null
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          observaciones?: string | null
          registrada_por?: string | null
          total: number
        }
        Update: {
          duracion_real_min?: number | null
          fecha?: string | null
          fecha_hora?: string
          id?: never
          id_cita?: number | null
          id_cliente?: number
          id_colaboradora?: number
          id_servicio?: number
          observaciones?: string | null
          registrada_por?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "atenciones_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: true
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atenciones_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: true
            referencedRelation: "citas_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atenciones_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atenciones_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atenciones_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_producto: {
        Row: {
          descripcion: string | null
          estado: boolean
          id: number
          nombre: string
          orden: number
        }
        Insert: {
          descripcion?: string | null
          estado?: boolean
          id?: never
          nombre: string
          orden?: number
        }
        Update: {
          descripcion?: string | null
          estado?: boolean
          id?: never
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      categorias_servicio: {
        Row: {
          descripcion: string | null
          estado: boolean
          id: number
          imagen_url: string | null
          nombre: string
          orden: number
        }
        Insert: {
          descripcion?: string | null
          estado?: boolean
          id?: never
          imagen_url?: string | null
          nombre: string
          orden?: number
        }
        Update: {
          descripcion?: string | null
          estado?: boolean
          id?: never
          imagen_url?: string | null
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      cierres_caja: {
        Row: {
          created_at: string
          diferencia: number | null
          fecha: string
          id: number
          id_usuario: string
          monto_contado: number
          monto_esperado: number | null
          observaciones: string | null
          total_egresos: number
          total_ingresos: number
        }
        Insert: {
          created_at?: string
          diferencia?: number | null
          fecha: string
          id?: never
          id_usuario?: string
          monto_contado: number
          monto_esperado?: number | null
          observaciones?: string | null
          total_egresos?: number
          total_ingresos?: number
        }
        Update: {
          created_at?: string
          diferencia?: number | null
          fecha?: string
          id?: never
          id_usuario?: string
          monto_contado?: number
          monto_esperado?: number | null
          observaciones?: string | null
          total_egresos?: number
          total_ingresos?: number
        }
        Relationships: [
          {
            foreignKeyName: "cierres_caja_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      citas: {
        Row: {
          cancelada_at: string | null
          creada_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cita"]
          fecha: string | null
          fin: string
          hora_inicio: string | null
          id: number
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          inicio: string
          motivo_cancelacion: string | null
          observaciones: string | null
        }
        Insert: {
          cancelada_at?: string | null
          creada_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          fecha?: string | null
          fin: string
          hora_inicio?: string | null
          id?: never
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          inicio: string
          motivo_cancelacion?: string | null
          observaciones?: string | null
        }
        Update: {
          cancelada_at?: string | null
          creada_por?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_cita"]
          fecha?: string | null
          fin?: string
          hora_inicio?: string | null
          id?: never
          id_cliente?: number
          id_colaboradora?: number
          id_servicio?: number
          inicio?: string
          motivo_cancelacion?: string | null
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          apellidos: string
          correo: string | null
          fecha_registro: string
          id: number
          id_usuario: string | null
          nombres: string
          telefono: string | null
        }
        Insert: {
          apellidos?: string
          correo?: string | null
          fecha_registro?: string
          id?: never
          id_usuario?: string | null
          nombres: string
          telefono?: string | null
        }
        Update: {
          apellidos?: string
          correo?: string | null
          fecha_registro?: string
          id?: never
          id_usuario?: string | null
          nombres?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradora_servicio: {
        Row: {
          id_colaboradora: number
          id_servicio: number
        }
        Insert: {
          id_colaboradora: number
          id_servicio: number
        }
        Update: {
          id_colaboradora?: number
          id_servicio?: number
        }
        Relationships: [
          {
            foreignKeyName: "colaboradora_servicio_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradora_servicio_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradoras: {
        Row: {
          apellidos: string
          especialidad: string | null
          estado: boolean
          id: number
          id_usuario: string | null
          nombres: string
          telefono: string | null
        }
        Insert: {
          apellidos?: string
          especialidad?: string | null
          estado?: boolean
          id?: never
          id_usuario?: string | null
          nombres: string
          telefono?: string | null
        }
        Update: {
          apellidos?: string
          especialidad?: string | null
          estado?: boolean
          id?: never
          id_usuario?: string | null
          nombres?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradoras_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          descripcion: string | null
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          valor?: string
        }
        Relationships: []
      }
      consumo_producto: {
        Row: {
          cantidad: number
          id: number
          id_atencion: number
          id_producto: number
        }
        Insert: {
          cantidad: number
          id?: never
          id_atencion: number
          id_producto: number
        }
        Update: {
          cantidad?: number
          id?: never
          id_atencion?: number
          id_producto?: number
        }
        Relationships: [
          {
            foreignKeyName: "consumo_producto_id_atencion_fkey"
            columns: ["id_atencion"]
            isOneToOne: false
            referencedRelation: "atenciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumo_producto_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      egresos: {
        Row: {
          concepto: string
          fecha: string
          id: number
          id_cierre: number | null
          monto: number
          registrado_por: string | null
        }
        Insert: {
          concepto: string
          fecha?: string
          id?: never
          id_cierre?: number | null
          monto: number
          registrado_por?: string | null
        }
        Update: {
          concepto?: string
          fecha?: string
          id?: never
          id_cierre?: number | null
          monto?: number
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egresos_id_cierre_fkey"
            columns: ["id_cierre"]
            isOneToOne: false
            referencedRelation: "cierres_caja"
            referencedColumns: ["id"]
          },
        ]
      }
      horario_colaboradora: {
        Row: {
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: number
          id_colaboradora: number
        }
        Insert: {
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: never
          id_colaboradora: number
        }
        Update: {
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: never
          id_colaboradora?: number
        }
        Relationships: [
          {
            foreignKeyName: "horario_colaboradora_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          fecha_hora: string
          id: number
          id_producto: number
          id_usuario: string | null
          motivo: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Insert: {
          cantidad: number
          fecha_hora?: string
          id?: never
          id_producto: number
          id_usuario?: string | null
          motivo?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Update: {
          cantidad?: number
          fecha_hora?: string
          id?: never
          id_producto?: number
          id_usuario?: string | null
          motivo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          clave: string | null
          correo_enviado_at: string | null
          created_at: string
          enviar_correo: boolean
          id: number
          id_cita: number | null
          id_usuario: string
          leida: boolean
          mensaje: string
          tipo: string
          titulo: string
        }
        Insert: {
          clave?: string | null
          correo_enviado_at?: string | null
          created_at?: string
          enviar_correo?: boolean
          id?: never
          id_cita?: number | null
          id_usuario: string
          leida?: boolean
          mensaje: string
          tipo: string
          titulo: string
        }
        Update: {
          clave?: string | null
          correo_enviado_at?: string | null
          created_at?: string
          enviar_correo?: boolean
          id?: never
          id_cita?: number | null
          id_usuario?: string
          leida?: boolean
          mensaje?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_id_cita_fkey"
            columns: ["id_cita"]
            isOneToOne: false
            referencedRelation: "citas_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          comprobante: string | null
          fecha: string | null
          fecha_hora: string
          id: number
          id_atencion: number
          id_cierre: number | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          registrado_por: string | null
        }
        Insert: {
          comprobante?: string | null
          fecha?: string | null
          fecha_hora?: string
          id?: never
          id_atencion: number
          id_cierre?: number | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          registrado_por?: string | null
        }
        Update: {
          comprobante?: string | null
          fecha?: string | null
          fecha_hora?: string
          id?: never
          id_atencion?: number
          id_cierre?: number | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_id_atencion_fkey"
            columns: ["id_atencion"]
            isOneToOne: false
            referencedRelation: "atenciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_id_cierre_fkey"
            columns: ["id_cierre"]
            isOneToOne: false
            referencedRelation: "cierres_caja"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          costo_unitario: number
          estado: boolean
          id: number
          id_categoria: number
          nombre: string
          stock_actual: number
          stock_minimo: number
          unidad: string
        }
        Insert: {
          costo_unitario?: number
          estado?: boolean
          id?: never
          id_categoria: number
          nombre: string
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Update: {
          costo_unitario?: number
          estado?: boolean
          id?: never
          id_categoria?: number
          nombre?: string
          stock_actual?: number
          stock_minimo?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellidos: string
          correo: string | null
          created_at: string
          estado: boolean
          id: string
          nombres: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string | null
        }
        Insert: {
          apellidos?: string
          correo?: string | null
          created_at?: string
          estado?: boolean
          id: string
          nombres?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Update: {
          apellidos?: string
          correo?: string | null
          created_at?: string
          estado?: boolean
          id?: string
          nombres?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          telefono?: string | null
        }
        Relationships: []
      }
      servicios: {
        Row: {
          descripcion: string | null
          duracion_min: number
          estado: boolean
          id: number
          id_categoria: number
          nombre: string
          precio: number
        }
        Insert: {
          descripcion?: string | null
          duracion_min: number
          estado?: boolean
          id?: never
          id_categoria: number
          nombre: string
          precio: number
        }
        Update: {
          descripcion?: string | null
          duracion_min?: number
          estado?: boolean
          id?: never
          id_categoria?: number
          nombre?: string
          precio?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicios_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "categorias_servicio"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      citas_detalle: {
        Row: {
          categoria: string | null
          cliente: string | null
          colaboradora: string | null
          duracion_min: number | null
          estado: Database["public"]["Enums"]["estado_cita"] | null
          fecha: string | null
          fin: string | null
          hora_inicio: string | null
          id: number | null
          id_cliente: number | null
          id_colaboradora: number | null
          id_servicio: number | null
          inicio: string | null
          limite_cancelacion: string | null
          observaciones: string | null
          precio: number | null
          puede_cancelar: boolean | null
          servicio: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_colaboradora_fkey"
            columns: ["id_colaboradora"]
            isOneToOne: false
            referencedRelation: "colaboradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citas_id_servicio_fkey"
            columns: ["id_servicio"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_cambiar_rol: {
        Args: {
          p_rol: Database["public"]["Enums"]["rol_usuario"]
          p_usuario: string
        }
        Returns: undefined
      }
      admin_guardar_colaboradora: {
        Args: {
          p_apellidos?: string
          p_especialidad?: string
          p_estado?: boolean
          p_horarios?: Json
          p_nombres: string
          p_servicios?: number[]
          p_telefono?: string
          p_usuario: string
        }
        Returns: {
          apellidos: string
          especialidad: string | null
          estado: boolean
          id: number
          id_usuario: string | null
          nombres: string
          telefono: string | null
        }
        SetofOptions: {
          from: "*"
          to: "colaboradoras"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      agendar_cita: {
        Args: {
          p_cliente?: number
          p_colaboradora?: number
          p_inicio: string
          p_observaciones?: string
          p_servicio: number
        }
        Returns: {
          cancelada_at: string | null
          creada_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cita"]
          fecha: string | null
          fin: string
          hora_inicio: string | null
          id: number
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          inicio: string
          motivo_cancelacion: string | null
          observaciones: string | null
        }
        SetofOptions: {
          from: "*"
          to: "citas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancelar_cita: {
        Args: { p_cita: number; p_motivo?: string }
        Returns: {
          cancelada_at: string | null
          creada_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cita"]
          fecha: string | null
          fin: string
          hora_inicio: string | null
          id: number
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          inicio: string
          motivo_cancelacion: string | null
          observaciones: string | null
        }
        SetofOptions: {
          from: "*"
          to: "citas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cerrar_caja: {
        Args: {
          p_fecha?: string
          p_monto_contado: number
          p_observaciones?: string
        }
        Returns: {
          created_at: string
          diferencia: number | null
          fecha: string
          id: number
          id_usuario: string
          monto_contado: number
          monto_esperado: number | null
          observaciones: string | null
          total_egresos: number
          total_ingresos: number
        }
        SetofOptions: {
          from: "*"
          to: "cierres_caja"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      colaboradoras_para_servicio: {
        Args: { p_servicio: number }
        Returns: {
          especialidad: string
          id: number
          nombre: string
        }[]
      }
      horarios_disponibles: {
        Args: {
          p_colaboradora?: number
          p_excluir_cita?: number
          p_fecha: string
          p_servicio: number
        }
        Returns: {
          colaboradora: string
          fin: string
          id_colaboradora: number
          inicio: string
        }[]
      }
      marcar_ingreso: {
        Args: { p_colaboradora?: number }
        Returns: {
          fecha: string
          hora_ingreso: string | null
          hora_salida: string | null
          horas_trabajadas: number | null
          id: number
          id_colaboradora: number
          tardanza_min: number
          turno: string | null
        }
        SetofOptions: {
          from: "*"
          to: "asistencias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcar_salida: {
        Args: { p_colaboradora?: number }
        Returns: {
          fecha: string
          hora_ingreso: string | null
          hora_salida: string | null
          horas_trabajadas: number | null
          id: number
          id_colaboradora: number
          tardanza_min: number
          turno: string | null
        }
        SetofOptions: {
          from: "*"
          to: "asistencias"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_atencion: {
        Args: {
          p_cita?: number
          p_cliente?: number
          p_colaboradora?: number
          p_duracion_real_min?: number
          p_observaciones?: string
          p_productos?: Json
          p_servicio?: number
          p_total?: number
        }
        Returns: {
          duracion_real_min: number | null
          fecha: string | null
          fecha_hora: string
          id: number
          id_cita: number | null
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          observaciones: string | null
          registrada_por: string | null
          total: number
        }
        SetofOptions: {
          from: "*"
          to: "atenciones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_pago: {
        Args: {
          p_atencion: number
          p_comprobante?: string
          p_metodo: Database["public"]["Enums"]["metodo_pago"]
          p_monto: number
        }
        Returns: {
          comprobante: string | null
          fecha: string | null
          fecha_hora: string
          id: number
          id_atencion: number
          id_cierre: number | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          registrado_por: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pagos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reprogramar_cita: {
        Args: {
          p_cita: number
          p_colaboradora?: number
          p_nuevo_inicio: string
        }
        Returns: {
          cancelada_at: string | null
          creada_por: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_cita"]
          fecha: string | null
          fin: string
          hora_inicio: string | null
          id: number
          id_cliente: number
          id_colaboradora: number
          id_servicio: number
          inicio: string
          motivo_cancelacion: string | null
          observaciones: string | null
        }
        SetofOptions: {
          from: "*"
          to: "citas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      estado_cita: "pendiente" | "confirmada" | "realizada" | "cancelada"
      metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "yape_plin"
      rol_usuario: "admin" | "colaboradora" | "cliente"
      tipo_movimiento: "entrada" | "salida"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  reporting: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      cierres_caja: {
        Row: {
          diferencia: number | null
          fecha: string | null
          monto_contado: number | null
          monto_esperado: number | null
          observaciones: string | null
          total_egresos: number | null
          total_ingresos: number | null
        }
        Insert: {
          diferencia?: number | null
          fecha?: string | null
          monto_contado?: number | null
          monto_esperado?: number | null
          observaciones?: string | null
          total_egresos?: number | null
          total_ingresos?: number | null
        }
        Update: {
          diferencia?: number | null
          fecha?: string | null
          monto_contado?: number | null
          monto_esperado?: number | null
          observaciones?: string | null
          total_egresos?: number | null
          total_ingresos?: number | null
        }
        Relationships: []
      }
      citas_detalle: {
        Row: {
          categoria: string | null
          cliente: string | null
          colaboradora: string | null
          estado: string | null
          fecha: string | null
          hora_inicio: string | null
          id_cita: number | null
          precio: number | null
          servicio: string | null
        }
        Relationships: []
      }
      horas_trabajadas: {
        Row: {
          colaboradora: string | null
          fecha: string | null
          hora_ingreso: string | null
          hora_salida: string | null
          horas_trabajadas: number | null
          tardanza_min: number | null
          turno: string | null
        }
        Relationships: []
      }
      pagos_detalle: {
        Row: {
          categoria: string | null
          cliente: string | null
          colaboradora: string | null
          fecha: string | null
          fecha_hora: string | null
          id_atencion: number | null
          id_pago: number | null
          metodo_pago: string | null
          monto: number | null
          servicio: string | null
        }
        Relationships: []
      }
      servicios_mas_solicitados: {
        Row: {
          categoria: string | null
          ingresos: number | null
          n_atenciones: number | null
          servicio: string | null
        }
        Relationships: []
      }
      stock_productos: {
        Row: {
          categoria: string | null
          id_producto: number | null
          nombre: string | null
          stock_actual: number | null
          stock_bajo: boolean | null
          stock_minimo: number | null
          unidad: string | null
        }
        Relationships: []
      }
      ventas_diarias: {
        Row: {
          fecha: string | null
          metodo_pago: string | null
          monto: number | null
          n_pagos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_cita: ["pendiente", "confirmada", "realizada", "cancelada"],
      metodo_pago: ["efectivo", "tarjeta", "transferencia", "yape_plin"],
      rol_usuario: ["admin", "colaboradora", "cliente"],
      tipo_movimiento: ["entrada", "salida"],
    },
  },
  reporting: {
    Enums: {},
  },
} as const
