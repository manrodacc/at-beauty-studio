---
name: at-beauty-base-de-datos
description: Esquema completo de la base de datos de AT Beauty Studio (Supabase/PostgreSQL): tablas, campos, relaciones, funciones RPC, triggers, RLS y vistas de Power BI. Usar al escribir consultas, código o cambios que toquen la BD.
---

# AT Beauty Studio · Base de datos

Base: **Supabase (PostgreSQL 16)**. Fuente de verdad: el archivo `schema.sql` (y `seed.sql` para datos de ejemplo). Si el usuario pega un esquema distinto o más nuevo, ese manda sobre este resumen.

## Reglas de oro

1. **No escribir directo** en `citas`, `atenciones`, `pagos`, `cierres_caja` ni `asistencias` desde el cliente: solo la admin puede por RLS. Todo pasa por las funciones RPC de abajo.
2. **El stock nunca se edita a mano**: solo cambia insertando en `movimientos_inventario` (un trigger ajusta `productos.stock_actual`). Un consumo en una atención genera solo su movimiento de salida.
3. **Zona horaria del negocio: `America/Lima`**. Las citas guardan `inicio`/`fin` como `timestamptz`; `fecha` y `hora_inicio` son columnas generadas en hora de Lima. En el frontend convertir siempre con esa zona.
4. El **rol** vive en `profiles.rol` (`admin | colaboradora | cliente`). Toda cuenta nueva nace `cliente`; solo `admin_cambiar_rol` o `admin_guardar_colaboradora` lo cambian. Nunca confiar en el rol que venga en metadata del usuario.
5. Contraseñas: las maneja Supabase Auth; no existe columna de contraseña.
6. Moneda: soles (`numeric(8,2)`). Idioma de la app: español.
7. La base impide dobles reservas con una restricción de exclusión (`citas_sin_cruce`): una colaboradora no puede tener dos citas activas (estado distinto de `cancelada`) cuyos rangos se crucen.

## Tipos (enum)

- `rol_usuario`: admin, colaboradora, cliente
- `estado_cita`: pendiente, confirmada, realizada, cancelada
- `metodo_pago`: efectivo, tarjeta, transferencia, yape_plin
- `tipo_movimiento`: entrada, salida

## Tablas (schema `public`)

| Tabla | Campos principales | Notas |
|---|---|---|
| `configuracion` | clave PK, valor, descripcion | `horas_min_cancelacion`=24, `intervalo_agenda_min`=30, `tolerancia_tardanza_min`=5 |
| `profiles` | id (= auth.users.id), rol, nombres, apellidos, telefono, correo, estado | Creado por trigger al registrarse |
| `clientes` | id, id_usuario (nullable, único), nombres, apellidos, telefono, correo, fecha_registro | `id_usuario` null = clienta walk-in sin cuenta; se vincula sola si luego se registra con el mismo correo |
| `colaboradoras` | id, id_usuario (nullable, único), nombres, apellidos, telefono, especialidad, estado | |
| `servicios` | id, nombre, categoria, descripcion, precio, duracion_min, estado | Categorías: Pestañas, Uñas, Cejas, Cuidado facial, Depilación |
| `colaboradora_servicio` | id_colaboradora + id_servicio (PK compuesta) | Qué servicios hace cada una |
| `horario_colaboradora` | id, id_colaboradora, dia_semana (1=lunes…7=domingo), hora_inicio, hora_fin | Varios bloques por día permitidos (refrigerio) |
| `citas` | id, id_cliente, id_servicio, id_colaboradora, inicio, fin, fecha*, hora_inicio*, estado, observaciones, motivo_cancelacion, creada_por, created_at, cancelada_at | *generadas |
| `atenciones` | id, id_cita (único, nullable), id_cliente, id_servicio, id_colaboradora, fecha_hora, fecha*, duracion_real_min, total, observaciones, registrada_por | Atención sin cita = walk-in |
| `productos` | id, nombre, categoria, unidad, stock_actual, stock_minimo, costo_unitario, estado | stock_actual >= 0 |
| `movimientos_inventario` | id, id_producto, tipo, cantidad, fecha_hora, motivo, id_usuario | Solo se inserta; no se edita ni borra |
| `consumo_producto` | id, id_atencion, id_producto, cantidad | Insertar genera salida de stock |
| `pagos` | id, id_atencion, id_cierre (null hasta cerrar caja), metodo_pago, monto, comprobante, fecha_hora, fecha*, registrado_por | Una atención puede tener varios pagos; la suma no puede exceder `atenciones.total` |
| `egresos` | id, id_cierre, fecha, concepto, monto, registrado_por | Gastos del día; alimentan el cierre |
| `cierres_caja` | id, id_usuario, fecha (único), total_ingresos, total_egresos, monto_esperado*, monto_contado, diferencia*, observaciones | esperado = ingresos − egresos; diferencia = contado − esperado |
| `asistencias` | id, id_colaboradora, fecha, hora_ingreso, hora_salida, horas_trabajadas*, tardanza_min, turno | Único por colaboradora y día; tardanza y turno los calcula un trigger |
| `notificaciones` | id, id_usuario, tipo, titulo, mensaje, id_cita, leida, enviar_correo, correo_enviado_at, clave (único) | Alertas en app + cola de correos; `clave` evita duplicar recordatorios |

## Relaciones

- cliente 1—N cita; colaboradora 1—N cita; servicio 1—N cita
- cita 1—0..1 atención; atención 1—N consumo_producto; producto 1—N consumo_producto y movimientos_inventario
- atención 1—N pago; cierre_caja 1—N pago y egresos
- colaboradora 1—N asistencia, 1—N horario_colaboradora; colaboradora N—N servicio
- profiles 1—1 cliente (opcional) y 1—1 colaboradora (opcional)

## Funciones RPC (se llaman con `supabase.rpc('nombre', { p_... })`)

| Función | Quién | Qué hace |
|---|---|---|
| `horarios_disponibles(p_servicio, p_fecha, p_colaboradora?, p_excluir_cita?)` | autenticados | Devuelve (id_colaboradora, colaboradora, inicio, fin) libres; respeta horario, servicios, citas y hora actual |
| `colaboradoras_para_servicio(p_servicio)` | autenticados | Lista (id, nombre, especialidad) |
| `agendar_cita(p_servicio, p_inicio, p_colaboradora?, p_cliente?, p_observaciones?)` | cliente (a sí misma) / personal (requiere p_cliente) | Valida el horario y crea la cita **confirmada**; si p_colaboradora es null asigna la menos cargada del día |
| `cancelar_cita(p_cita, p_motivo?)` | dueña / colaboradora asignada / admin | La clienta solo con ≥ `horas_min_cancelacion` de anticipación |
| `reprogramar_cita(p_cita, p_nuevo_inicio, p_colaboradora?)` | igual | Misma regla de anticipación para la clienta |
| `registrar_atencion(p_cita?, p_cliente?, p_servicio?, p_colaboradora?, p_duracion_real_min?, p_total?, p_productos jsonb, p_observaciones?)` | admin / colaboradora | Crea la atención, descuenta productos (`[{"id_producto":1,"cantidad":2}]`) y marca la cita como `realizada`; total por defecto = precio del servicio |
| `registrar_pago(p_atencion, p_metodo, p_monto, p_comprobante?)` | admin / colaboradora | Rechaza si excede el saldo o si la caja de hoy ya está cerrada |
| `cerrar_caja(p_monto_contado, p_observaciones?, p_fecha?)` | solo admin | Consolida pagos y egresos del día y los liga al cierre |
| `marcar_ingreso(p_colaboradora?)` / `marcar_salida(p_colaboradora?)` | personal | La colaboradora marca la suya; la admin puede indicar otra |
| `admin_cambiar_rol(p_usuario, p_rol)` | solo admin | Cambia rol; crea ficha de colaboradora si hace falta |
| `admin_guardar_colaboradora(p_usuario, p_nombres, p_apellidos?, p_telefono?, p_especialidad?, p_servicios bigint[], p_horarios jsonb, p_estado?)` | solo admin | Alta/edición de colaboradora con servicios y horarios (reemplaza los anteriores); la cuenta de acceso la crea la Edge Function `crear-colaboradora` |
| `app.generar_recordatorios()` | pg_cron cada 10 min | Notifica a 24 h y 2 h de la cita, sin duplicar |

## Vista para la app

`citas_detalle` (ya filtrada por rol): id, cliente, servicio, categoria, precio, duracion_min, colaboradora, inicio, fin, fecha, hora_inicio, estado, observaciones, **limite_cancelacion**, **puede_cancelar**. Usarla para listar citas en lugar de armar joins en el cliente.

## Códigos de error (en `error.message`; el texto para mostrar está en `error.hint`)

no_autenticado · no_autorizado · cliente_requerido · cliente_no_encontrada · servicio_no_disponible · **horario_no_disponible** · cita_no_existe · cita_no_cancelable · cita_no_reprogramable · **fuera_de_plazo** · cita_no_atendible · datos_incompletos · atencion_no_existe · **caja_cerrada** · caja_ya_cerrada · **monto_excede_total** · **stock_insuficiente** · colaboradora_requerida · ingreso_ya_registrado · sin_ingreso · auto_degradacion · usuario_no_existe · nombre_requerido.

Mostrar `error.hint` al usuario; usar `error.message` para la lógica (por ejemplo, ante `horario_no_disponible` recargar los horarios).

## Triggers y alertas automáticas

- Alta en `auth.users` → crea `profiles` (rol cliente) y `clientes`.
- Cita creada/cambiada → notificación a clienta (confirmada, reprogramada, cancelada, con cuenta regresiva) y a colaboradora.
- Stock cruza el mínimo hacia abajo → alerta a todas las admin.
- Tardanza (> tolerancia) y diferencia de caja ≠ 0 → alerta a las admin.
- Realtime: `notificaciones` está en la publicación `supabase_realtime`.

## Seguridad (RLS) en resumen

- **admin**: todo.
- **colaboradora**: lee sus citas, atenciones, asistencias y pagos de sus atenciones; lee productos y clientes; escribe solo por RPC.
- **cliente**: lee solo sus citas, atenciones, pagos y notificaciones; edita su perfil (nombres, apellidos, teléfono) y su ficha; agenda/cancela/reprograma por RPC.
- **anon**: solo lee `servicios` activos.
- Funciones internas en el schema `app` (no expuesto a la API). Nunca usar la clave `service_role` en el frontend.

## Power BI

Schema `reporting` (solo lectura, rol `powerbi_reader`): `pagos_detalle`, `ventas_diarias`, `citas_detalle`, `servicios_mas_solicitados`, `horas_trabajadas`, `stock_productos`, `cierres_caja`. Los reportes siempre salen de estas vistas, no de las tablas. Conexión con el conector PostgreSQL usando la cadena del pooler y ese rol.

## Al modificar la BD

- Cambios nuevos como migraciones SQL; no editar a mano lo que hay en producción sin respaldo.
- Toda tabla nueva: activar RLS y definir políticas por rol; revocar permisos a `anon`.
- Lógica que toque dinero, stock o citas va en funciones `security definer` con `set search_path = public, pg_temp`, nunca en el frontend.
