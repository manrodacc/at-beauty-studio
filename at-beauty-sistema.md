---
name: at-beauty-sistema
description: Funcionamiento general del sistema AT Beauty Studio: roles, módulos, pantallas, flujos de negocio, reglas acordadas, stack y estilo visual. Usar al construir, modificar o explicar cualquier parte de la aplicación.
---

# AT Beauty Studio · Funcionamiento del sistema

Aplicación web de gestión integral para un centro de belleza con varios rubros (pestañas, uñas, cejas, cuidado facial, depilación). Proyecto universitario (curso Tecnología de procesos de información, UPAO) que se construye con ayuda de IA. Para el detalle de tablas, funciones y errores usar también la skill **at-beauty-base-de-datos**.

## Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, react-hook-form + zod.
- **Backend**: Supabase (Auth, PostgreSQL, RLS, funciones RPC, Edge Functions, pg_cron, Realtime).
- **Reportes**: Power BI conectado al schema `reporting` con un rol de solo lectura.
- **Despliegue**: Vercel o Netlify para el frontend.
- Idioma: español. Moneda: soles (S/). Zona horaria: America/Lima.
- Antes usaban Google Sheets/AppSheet; ya no. No reintroducirlos.

## Roles y permisos

| Módulo | Admin | Colaboradora | Cliente |
|---|---|---|---|
| Inicio | Resumen del negocio | Su agenda del día | Sus próximas citas con cuenta regresiva |
| Citas | Ver/crear/editar/cancelar todas | Ver y gestionar las suyas | Agendar, reprogramar y cancelar las suyas |
| Atención (servicio + productos usados) | Sí | Sí, las suyas | No |
| Pagos | Registra y consulta | Registra pagos | Ve su historial |
| Cierre de caja | Sí (solo ella) | No | No |
| Asistencia | Ve todas | Marca su ingreso/salida | No |
| Inventario | Control total | Solo consulta | No |
| Reportes | Sí | No | No |
| Servicios, colaboradoras, usuarios | Administra | No | Solo ve servicios |

La interfaz oculta lo que no corresponde, pero la seguridad real la imponen la base de datos (RLS y RPC); nunca depender solo de ocultar botones.

## Flujos principales

### Registro e ingreso
La clienta se registra sola con **correo y contraseña o con Google**. Toda cuenta nueva es cliente. Las colaboradoras no se registran solas.

### Agendar (cliente)
Servicio → colaboradora (o "cualquiera disponible") → fecha → hora libre (`horarios_disponibles`) → confirmar (`agendar_cita`). Solo se muestran horas libres. La cita **se confirma sola** si el horario está libre; si alguien lo tomó antes, se avisa y se ofrecen otros. Tras agendar se muestra la **cuenta regresiva** ("Faltan 2 días y 3 horas para tu cita"), que en pantalla corre en vivo.

### Alertas de cita
Alerta al agendar, recordatorio 24 h antes y 2 h antes, y avisos de cancelación o reprogramación. Llegan **dentro de la app y por correo** (el correo lo envía una Edge Function que lee las notificaciones pendientes). La colaboradora recibe aviso de cita nueva o cancelada.

### Cancelar y reprogramar
La clienta puede hacerlo hasta **24 h antes** (valor editable en `configuracion`). Pasado ese plazo debe comunicarse con el estudio; admin y colaboradora pueden hacerlo sin ese límite. Mostrar `limite_cancelacion` y deshabilitar el botón si `puede_cancelar` es falso.

### Atención y productos
La colaboradora abre la cita del día, registra duración real, productos usados y total (`registrar_atencion`). Eso descuenta stock y marca la cita como realizada. También se puede registrar una atención sin cita (walk-in) indicando la clienta.

### Pago
La admin o la colaboradora registran el pago (`registrar_pago`) con método (efectivo, tarjeta, transferencia, Yape/Plin) y comprobante. No hay pasarela real: todo es registro manual. El vuelto se calcula en pantalla, en la base solo se guarda el monto aplicado. Se permiten pagos parciales sin exceder el total.

### Cierre de caja
Solo la admin. Consolida ingresos y egresos del día, compara con el monto contado y guarda la diferencia; si hay diferencia se alerta a la admin. Con la caja cerrada ya no se aceptan pagos de ese día.

### Asistencia
La colaboradora marca ingreso y salida. El sistema calcula turno, horas trabajadas y tardanza (con 5 min de tolerancia). La admin recibe alerta por tardanza.

### Inventario
Productos con stock y stock mínimo. Las entradas las registra la admin; las salidas ocurren al consumir en una atención. Al bajar del mínimo se alerta a la admin.

### Registro de colaboradoras (desde el panel de la admin)
Formulario con nombre, apellidos, teléfono, correo, especialidad, servicios que realiza y horario semanal. La Edge Function `crear-colaboradora` verifica que quien llama sea admin, invita por correo (ella define su contraseña), y guarda ficha, servicios y horarios con `admin_guardar_colaboradora`. El mismo formulario edita o desactiva. Si el correo ya tenía cuenta, la promueve.

### Reportes
Panel de la admin (ventas por período, servicios más solicitados, horas trabajadas, stock) y las mismas métricas para Power BI desde el schema `reporting`.

## Pantallas por rol (rutas sugeridas)

- **Públicas**: `/` (servicios), `/login`, `/registro`, `/definir-contrasena`.
- **Cliente**: `/app/inicio`, `/app/agendar`, `/app/mis-citas`, `/app/historial`, `/app/perfil`, `/app/notificaciones`.
- **Colaboradora**: `/app/agenda`, `/app/atencion/:cita`, `/app/pagos`, `/app/asistencia`, `/app/inventario` (consulta), `/app/notificaciones`.
- **Admin**: `/admin/inicio`, `/admin/citas`, `/admin/clientes`, `/admin/colaboradoras`, `/admin/servicios`, `/admin/inventario`, `/admin/pagos`, `/admin/caja`, `/admin/asistencia`, `/admin/reportes`, `/admin/configuracion`.

Cada ruta se protege según `profiles.rol` y el menú muestra solo los módulos del rol.

## Diseño y experiencia

- **Responsive con enfoque móvil primero** (la mayoría de clientas usará el celular); tablas que se convierten en tarjetas en pantallas pequeñas.
- Identidad **rosada, elegante y de belleza**: rosa fuerte para acciones principales, rosa claro y lila suave de fondo, morado oscuro para texto y títulos, bordes muy redondeados, logo con pestañas y destellos. Los mockups originales de los estudiantes son la referencia visual.
- Alertas visibles y claras: toasts para confirmaciones y errores, campana con contador de no leídas (Realtime), avisos de stock bajo, tardanza y diferencia de caja para la admin.
- Mostrar siempre `error.hint` de la base como mensaje al usuario; estados de carga y vacíos cuidados; accesibilidad básica (contraste, foco, etiquetas).
- Formato: fechas DD/MM/YYYY, horas en 24 h o a. m./p. m. consistentes, importes como `S/ 120.00`.

## Decisiones ya tomadas

- Tres roles: admin, colaboradora y cliente.
- Confirmación automática de citas si el horario está libre.
- Cancelación o reprogramación de la clienta: hasta 24 h antes.
- Colaboradora puede registrar pagos; cierre de caja solo admin.
- Alertas por app y por correo; sin WhatsApp.
- Varios rubros de servicios; soles; español.

## Pendientes conocidos

- Edge Function de envío de correos (cola en `notificaciones`) y proveedor de correo para producción.
- Activar pg_cron para los recordatorios.
- Definir con los estudiantes si el monto esperado del cierre debe contar solo efectivo.
- Pantalla `/definir-contrasena` para las invitaciones.

## Cómo trabajar en este proyecto

- Lógica de negocio sensible (citas, dinero, stock) siempre en la base mediante RPC; el frontend solo la llama y muestra el resultado.
- No usar la clave `service_role` en el frontend; solo dentro de Edge Functions.
- Mantener el código por módulos y roles; componentes reutilizables para tablas, formularios y tarjetas.
- Si algo contradice estas reglas o el esquema, avisar antes de cambiarlo.
