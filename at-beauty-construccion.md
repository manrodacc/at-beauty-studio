---
name: at-beauty-construccion
description: Guía paso a paso para que una IA construya desde cero el proyecto AT Beauty Studio (React + Vite + TypeScript + Tailwind + Supabase): orden de trabajo, configuración, autenticación, rutas por rol, módulos, pruebas y despliegue. Usar cuando se pida crear, continuar o revisar el proyecto completo.
---

# AT Beauty Studio · Cómo construir el proyecto desde cero

Esta skill es el **plan de obra**. Dice en qué orden construir, cómo dejar cada pieza lista y cómo comprobar que funciona. Se apoya en otras tres skills, que hay que leer **antes de escribir código**:

1. `at-beauty-sistema`: qué hace el sistema, roles, flujos y reglas acordadas.
2. `at-beauty-base-de-datos`: tablas, funciones RPC, errores y seguridad.
3. `at-beauty-diseno`: colores, tipografía, animaciones y microinteracciones.

Si algo de esta guía contradice a esas skills, avisar al usuario antes de decidir.

## 0. Reglas que no se negocian

1. **La base de datos ya existe.** El usuario ya ejecutó `schema.sql` (y quizá `seed.sql`) en Supabase. **No recrear tablas ni inventar columnas.** Si falta algo en la base, proponer la migración SQL por separado y esperar confirmación.
2. **Lógica sensible en la base, no en React.** Agendar, cancelar, reprogramar, atender, cobrar, cerrar caja, asistencia y stock se hacen **solo con las funciones RPC** (`supabase.rpc(...)`). React no inserta directamente en `citas`, `atenciones`, `pagos`, `cierres_caja`, `asistencias` ni toca el stock.
3. **Nunca** usar la `service_role` / secret key en el frontend ni subirla a Git. Solo vive dentro de Edge Functions (Supabase la inyecta sola).
4. **Seguridad real = RLS y RPC.** Ocultar botones por rol es solo comodidad visual.
5. **Mostrar siempre `error.hint`** como mensaje al usuario; usar `error.message` (código corto, ej. `horario_no_disponible`) para decidir qué hacer.
6. **Todo en español**, moneda soles (`S/ 120.00`), zona horaria **America/Lima** en cada fecha que se muestre.
7. **No inventar datos.** Si falta una URL, clave, imagen o decisión del negocio, preguntar. No poner datos falsos que parezcan reales.
8. Una pantalla no está terminada hasta cumplir la lista de la sección 12.

## 1. Antes de empezar: qué pedirle al usuario

Pedir solo lo que falte, en un único mensaje:

- **Project URL** de Supabase (Settings → Data API, o botón *Connect*).
- **Publishable key** (`sb_publishable_...`, equivale a la anon key).
- Si ya configuró Google (Client ID/Secret en Supabase) y las **Redirect URLs**.
- Dirección de Vercel (si ya la tiene) para `VITE_SITE_URL`.
- Si hay logo (SVG/PNG) y fotos del estudio. Si no hay, usar degradados de marca y marcar los lugares de imagen.

Estas claves son públicas y van en `.env.local`. **Nunca pedir ni aceptar la secret key** para el frontend.

Si el usuario aún no dio las claves, construir igualmente todo con un `.env.example` y continuar; los datos reales solo se necesitan para probar.

## 2. Entorno y comandos

Requisitos: Node 20+ y npm. Si no hay internet para instalar paquetes, escribir todo el código y el `package.json` correctamente y decir al usuario que ejecute `npm install` en su máquina; no inventar que se compiló.

Crear el proyecto a mano (equivale a `npm create vite@latest -- --template react-ts`):

```
npm i react react-dom react-router-dom @supabase/supabase-js @tanstack/react-query \
      react-hook-form zod @hookform/resolvers motion sonner lucide-react clsx tailwind-merge
npm i -D vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite \
      @types/react @types/react-dom supabase
```

Instalar más adelante, solo cuando se usen: `gsap`, `lenis`, `canvas-confetti`, `vaul`, `embla-carousel-react`, `recharts`, `@lottiefiles/dotlottie-react`. Versiones: usar las estables actuales; no mezclar React 18 con librerías que exijan 19.

Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`.

## 3. Estructura de carpetas

```
at-beauty-studio/
├─ .claude/skills/…              # las 4 skills del proyecto
├─ supabase/
│  ├─ schema.sql  seed.sql       # copia de referencia, ya ejecutados
│  └─ functions/crear-colaboradora/index.ts
├─ public/                       # favicon, logo.svg, img/
├─ src/
│  ├─ main.tsx
│  ├─ index.css                  # Tailwind + @theme (tokens de la skill de diseño)
│  ├─ app/            router.tsx · nav.ts · guards.tsx
│  ├─ providers/      AuthProvider.tsx · QueryProvider.tsx
│  ├─ lib/            supabase.ts · motion.ts · utils.ts · errors.ts · rpc.ts · fechas.ts
│  ├─ types/          database.generated.ts · app.ts
│  ├─ hooks/          useNotificaciones.ts · useCountdown.ts
│  ├─ components/
│  │   ├─ ui/         Button · Input · Card · Badge · Skeleton · EmptyState · Modal
│  │   ├─ motion/     Reveal · PageTransition · CountUp · Countdown · Sparkles
│  │   └─ layout/     AppShell · Sidebar · TabBar · NotificationBell · Logo
│  ├─ features/
│  │   ├─ auth/ booking/ citas/ atencion/ pagos/ caja/
│  │   ├─ asistencia/ inventario/ servicios/ colaboradoras/ clientes/ reportes/
│  └─ pages/          public/ · cliente/ · colaboradora/ · admin/
├─ .env.example  .env.local (no se sube)  .gitignore  vercel.json
├─ vite.config.ts  tsconfig.json  package.json  README.md
```

Alias `@` → `src` en `vite.config.ts` y en `tsconfig.json` (`paths`).

## 4. Configuración base (Fase 1)

**Archivos obligatorios**

- `.env.example` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`. `.env.local` y `.env` en `.gitignore`.
- `vercel.json` con el *rewrite* a `index.html` (sin esto, recargar `/app/mis-citas` da 404):
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- `index.html`: `lang="es"`, `viewport-fit=cover`, fuentes de Google (Cormorant Garamond y Plus Jakarta Sans), `theme-color` rosado.
- `src/index.css`: `@import "tailwindcss";` y el bloque `@theme` con los tokens de color, tipografía, radios y sombras de la skill `at-beauty-diseno`. Fondo con degradado suave rosa → blanco → lavanda.

**Cliente de Supabase** (`src/lib/supabase.ts`): crear con la URL y la clave; si faltan las variables, **lanzar un error claro** ("Falta VITE_SUPABASE_URL en .env.local") en vez de fallar en silencio.

**Tipos:** generar con `supabase gen types typescript --project-id REF > src/types/database.generated.ts` y pasarlos a `createClient<Database>`. Si no se puede generar, escribir a mano los tipos mínimos de `profiles`, `citas_detalle`, `servicios`, `notificaciones` y los parámetros/retornos de las RPC, y avisar que conviene generarlos.

**Utilidades**

- `cn()` con `clsx` + `tailwind-merge`.
- `formatSoles(n)` con `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })` → `S/ 120.00`.
- `formatFecha`, `formatHora`, `formatFechaHora` con `timeZone: 'America/Lima'`. Nunca mostrar fechas con la zona del navegador.
- `fechaLimaISO(date)` para obtener `YYYY-MM-DD` en hora de Lima (se usa como `p_fecha`).
- `tiempoRestante(inicio)` → "2 días y 3 horas" / "5 horas y 20 min" / "45 min" (mismo formato que la base).

**Manejo de errores** (`src/lib/errors.ts`): `mensajeError(e)` devuelve `e.hint` si existe; si no, traduce los errores de Auth más comunes:

| Mensaje de Supabase | Texto al usuario |
|---|---|
| `Invalid login credentials` | Correo o contraseña incorrectos. |
| `User already registered` | Ese correo ya está registrado. |
| `Email not confirmed` | Confirma tu correo antes de entrar. |
| `Password should be at least…` | La contraseña es muy corta (mínimo 6 caracteres). |
| cualquier otro | Ocurrió un error. Inténtalo de nuevo. |

Y `codigoError(e)` devuelve `e.message` para la lógica.

**Envoltorio de RPC** (`src/lib/rpc.ts`): una función `rpc<T>(nombre, args)` que llama a `supabase.rpc`, y si hay error lanza un `AppError { codigo, mensaje }` con `mensajeError`. Todas las llamadas del proyecto pasan por aquí.

## 5. Autenticación (Fase 2)

**AuthProvider** (`src/providers/AuthProvider.tsx`) expone: `session`, `profile` (con `rol`), `loading`, `signIn`, `signUp`, `signInGoogle`, `signOut`, `resetPassword`.

Puntos críticos (errores típicos que hay que evitar):

1. **No hacer `await supabase...` dentro del callback de `onAuthStateChange`** (puede bloquear la librería). En el callback solo guardar la sesión; cargar el perfil en un `useEffect` aparte que dependa de `session.user.id`.
2. **`loading` debe incluir "ya hay sesión pero aún no cargó el perfil"**, para que las rutas protegidas no redirijan por error durante un instante. Guardar para qué usuario se cargó el perfil (`profileLoadedFor`) y calcular `loading = inicializando || (userId && profileLoadedFor !== userId)`.
3. El perfil viene de `from('profiles').select('*').eq('id', userId).single()`. Si `estado = false`, mostrar "Cuenta desactivada" y cerrar sesión.
4. Si la carga del perfil falla, no dejar cargando para siempre: marcarlo como cargado con `profile = null` y mostrar mensaje con botón "Reintentar / Salir".
5. **El rol solo se lee de `profiles.rol`.** Nunca del `user_metadata`.

**Registro:** `supabase.auth.signUp({ email, password, options: { data: { nombres, apellidos, telefono }, emailRedirectTo: <SITE_URL>/app } })`. Si no devuelve sesión (porque está activa la confirmación por correo), mostrar "Revisa tu correo para confirmar tu cuenta".

**Google:**
```ts
supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app` } })
```

**Recuperar y definir contraseña** (`/definir-contrasena`): sirve para la invitación de colaboradoras y para recuperación. Esperar hasta ~3 s a que aparezca la sesión (llega por el enlace del correo). Si no aparece, mostrar "El enlace venció o ya se usó" con botón para pedir otro. Con sesión: formulario de contraseña + confirmación → `supabase.auth.updateUser({ password })` → ir a `/app`.

**Formularios:** `react-hook-form` + `zod`. Contraseña mínimo 8 caracteres en la interfaz (la base acepta 6). Mensajes en español.

## 6. Rutas y navegación por rol (Fase 3)

Usar `createBrowserRouter` de React Router.

| Zona | Rutas | Roles |
|---|---|---|
| Pública | `/`, `/login`, `/registro`, `/definir-contrasena` | todos |
| Cliente | `/app/inicio`, `/app/agendar`, `/app/mis-citas`, `/app/historial`, `/app/perfil` | cliente |
| Colaboradora | `/app/agenda`, `/app/atencion/:cita`, `/app/pagos`, `/app/asistencia`, `/app/inventario` | colaboradora |
| Compartida | `/app/notificaciones` | cliente, colaboradora |
| Admin | `/admin/inicio`, `/admin/citas`, `/admin/clientes`, `/admin/colaboradoras`, `/admin/servicios`, `/admin/inventario`, `/admin/pagos`, `/admin/caja`, `/admin/asistencia`, `/admin/reportes`, `/admin/configuracion` | admin |

**Guard `RequireRole`** (ruta de layout con `<Outlet/>`):
- `loading` → pantalla de carga elegante (no parpadeo).
- Sin sesión → `/login` guardando la ruta de origen para volver después.
- Rol no permitido → redirigir a la página de inicio de **su** rol.
- Cuenta desactivada → mensaje y cierre de sesión.

**`homeFor(rol)`:** admin → `/admin/inicio`, colaboradora → `/app/agenda`, cliente → `/app/inicio`.
`/app` (índice) y los redirecciones tras login usan `homeFor`. Ruta `*` → página 404 con botón de volver.
Las páginas públicas de login y registro redirigen a `homeFor` si ya hay sesión.

**AppShell:**
- Móvil (cliente): **barra de pestañas inferior** (Inicio, Agendar, Mis citas, Perfil) con píldora activa deslizante (`layoutId`).
- Colaboradora y admin: **barra lateral rosada** con logo, colapsable; en móvil, menú tipo drawer.
- Cabecera: campana de notificaciones y menú de usuario (perfil, cerrar sesión).
- Los elementos del menú salen de un único `nav.ts` por rol.
- Transición de página (`PageTransition`) de ≤ 200 ms en los paneles.

## 7. Notificaciones (Fase 4)

- Hook `useNotificaciones`: consulta `notificaciones` (últimas 30, orden descendente) con TanStack Query.
- **Realtime:** suscribirse a `postgres_changes` `INSERT` sobre `notificaciones` filtrando `id_usuario=eq.<uid>`; al llegar una, invalidar la consulta y mostrar un toast (`sonner`) con título y mensaje. Cancelar la suscripción al desmontar (`supabase.removeChannel`).
- Campana con contador de no leídas (insignia con "pop"), panel desplegable, marcar como leída con `update({ leida: true })`.
- Los correos de las alertas **no los envía React**: los envía una Edge Function que lee las filas con `enviar_correo = true` y `correo_enviado_at is null` (fase 9).

## 8. Módulos por rol (Fases 5 a 8)

Construir en este orden; cada módulo se prueba antes de pasar al siguiente.

### Fase 5 · Cliente (lo más importante)

**Agendar** (`/app/agendar`), flujo en pasos con indicador de progreso:
1. **Servicio:** lista de `servicios` activos, agrupados por categoría, con precio y duración.
2. **Colaboradora:** `rpc('colaboradoras_para_servicio')` + opción "Cualquiera disponible".
3. **Fecha:** calendario; los días sin horarios aparecen atenuados.
4. **Hora:** `rpc('horarios_disponibles', { p_servicio, p_fecha, p_colaboradora })`; mostrar chips por hora. Si hay varias colaboradoras y eligió "cualquiera", agrupar horas únicas.
5. **Resumen y confirmar:** `rpc('agendar_cita', { p_servicio, p_inicio, p_colaboradora })`.
6. **Éxito:** check animado, confeti de marca, y **cuenta regresiva**.

Manejo de errores del paso 5: ante `horario_no_disponible` → toast amable, **recargar las horas** y volver al paso 4 sin perder lo elegido.

**Mis citas:** leer de la vista **`citas_detalle`** (ya filtrada por rol), nunca de la tabla. Pestañas Próximas / Historial. Cada tarjeta con servicio, colaboradora, fecha y hora (hora de Lima), estado, **cuenta regresiva** y botones:
- **Cancelar** (`rpc('cancelar_cita')`) y **Reprogramar** (`rpc('reprogramar_cita')`), habilitados solo si `puede_cancelar = true`. Si es falso, mostrar "Solo puedes cambiarla con 24 h de anticipación" y el límite (`limite_cancelacion`) en tono neutro.
- Confirmación en modal antes de cancelar.

**Cuenta regresiva** (`Countdown`): días / horas / minutos, se actualiza cada 30 s (cada 1 s si falta menos de una hora). Texto humano: "Faltan 2 días y 3 horas". Menos de 24 h → tono más cálido. Sin saltos de layout (`tabular-nums`).

**Inicio:** próxima cita destacada con cuenta regresiva, accesos rápidos y recomendación de servicios.
**Historial:** atenciones y pagos propios. **Perfil:** editar nombres, apellidos y teléfono (`profiles` y `clientes`).

### Fase 6 · Colaboradora

- **Agenda:** citas del día y de la semana (`citas_detalle`), con acciones.
- **Atención** (`/app/atencion/:cita`): duración real, productos usados (buscador + cantidad) y total editable → `rpc('registrar_atencion', { p_cita, p_duracion_real_min, p_total, p_productos })`. Ante `stock_insuficiente` mostrar el hint y no perder el formulario.
- **Pagos:** `rpc('registrar_pago', { p_atencion, p_metodo, p_monto, p_comprobante })`. Mostrar saldo pendiente; calcular el vuelto **solo en pantalla**. Ante `monto_excede_total` o `caja_cerrada`, mostrar el hint.
- **Asistencia:** botón "Registrar ingreso / salida" (`marcar_ingreso`, `marcar_salida`) con reloj en vivo; mostrar horas trabajadas y tardanza.
- **Inventario:** solo consulta, con barras de stock y marca de bajo mínimo.

### Fase 7 · Admin

- **Inicio:** resumen del día (citas, ingresos, stock bajo, tardanzas), gráficas.
- **Citas:** ver, crear (`agendar_cita` con `p_cliente`), cancelar, reprogramar, filtrar por estado y colaboradora.
- **Clientes:** lista y ficha; alta de clienta sin cuenta (insert en `clientes`).
- **Colaboradoras:** formulario de alta con nombre, apellidos, teléfono, **correo**, especialidad, servicios y **horario semanal** (varios bloques por día). Enviar a la Edge Function `crear-colaboradora` con `supabase.functions.invoke`; esa función invita por correo y llama a `admin_guardar_colaboradora`. El mismo formulario edita y desactiva. Para leer el error de una función, leer el JSON del cuerpo de la respuesta (`error.context`) y usar `hint`.
- **Servicios:** CRUD con foto (Storage, bucket `catalogo`).
- **Inventario:** CRUD de productos y **entradas** de stock (insert en `movimientos_inventario` con `tipo = 'entrada'`). Nunca editar `stock_actual` directamente.
- **Pagos:** listado con filtros por fecha, método y colaboradora.
- **Caja:** registrar egresos (`egresos`), ver el esperado y cerrar con `rpc('cerrar_caja', { p_monto_contado, p_observaciones })`.
- **Asistencia:** tabla de todas, con tardanzas y horas trabajadas.
- **Configuración:** editar `configuracion` (horas de cancelación, intervalo de agenda, tolerancia de tardanza).
- **Usuarios y roles:** `rpc('admin_cambiar_rol')`.

### Fase 8 · Reportes

Gráficas con `recharts` leyendo las vistas del esquema `reporting` **a través de consultas permitidas a la admin** (la admin puede leer todas las tablas por RLS; si se consultan las vistas `reporting` desde el cliente hay que crear antes una política o una función RPC, porque ese esquema no está expuesto a la API). Mostrar: ventas por período, métodos de pago, servicios más solicitados, horas trabajadas, stock bajo. Si algún reporte necesita una función nueva, proponer el SQL al usuario.

## 9. Edge Functions (Fase 9)

- **`crear-colaboradora`**: ya escrita (archivo `crear-colaboradora.ts`). Colocar en `supabase/functions/crear-colaboradora/index.ts`. Despliegue: `supabase link --project-ref REF`, `supabase secrets set SITE_URL=...`, `supabase functions deploy crear-colaboradora`.
- **`enviar-correos`** (a escribir): lee `notificaciones` con `enviar_correo` y `correo_enviado_at is null` y `created_at` reciente, manda el correo (Resend u otro SMTP) con plantilla en español y rosada, y marca `correo_enviado_at`. Se invoca cada 5 min con `pg_cron` + `pg_net`, o con un *database webhook*. El correo del destinatario está en `profiles.correo`.
- Las funciones validan siempre el JWT de quien llama y devuelven JSON `{ error, hint }` ante fallos.

## 10. Diseño y animación (en paralelo, según `at-beauty-diseno`)

- **Dos modos de energía:** escaparate (landing, login, agendar, mis citas) con animación rica; trabajo (paneles) con animación ≤ 200 ms.
- Landing con escenas de scroll (hero con parallax, "cómo funciona" fijado, carrusel de servicios, contadores, testimonios) usando `motion`, `gsap`+`ScrollTrigger` y `lenis` **solo en las páginas públicas**.
- Microinteracciones: botones, campos, tarjetas, selector de pasos, cuenta regresiva con giro, campana que se mueve, totales que cuentan hacia arriba, esqueletos con brillo en vez de spinners, estados vacíos con acción.
- `prefers-reduced-motion` respetado siempre. Solo animar `transform` y `opacity`.
- Imágenes: WebP/AVIF, `loading="lazy"`, proporción fija, texto alternativo; fotos reales del estudio cuando existan, y mientras tanto marcadores con degradado de marca.

## 11. Rendimiento, accesibilidad y seguridad

- **Rendimiento:** carga diferida (`React.lazy` + `Suspense`) por zona (public / app / admin) y de librerías pesadas (gsap, confeti, recharts). TanStack Query con `staleTime` razonable (30–60 s) y reintentos limitados. Evitar consultas en cascada.
- **Accesibilidad:** contraste AA, foco visible, zonas táctiles de 44 px, etiquetas en campos, `aria-live` en alertas, uso completo con teclado.
- **Seguridad:** ninguna clave secreta en el código; sin `dangerouslySetInnerHTML`; validar entradas con zod; no confiar en datos del cliente para permisos; no registrar datos personales en la consola.

## 12. Lista de verificación (definición de "terminado")

**Por pantalla**
- [ ] Se ve bien a 390 px y a 1440 px.
- [ ] Estados de carga (esqueleto), vacío y error cuidados.
- [ ] Usa solo los tokens de diseño; entrada animada suave.
- [ ] Funciona con teclado y con `prefers-reduced-motion`.
- [ ] Muestra `error.hint` ante fallos; no muestra textos técnicos.
- [ ] Fechas en hora de Lima y dinero como `S/ 0.00`.

**Del proyecto (probar con cuentas reales, una de cada rol)**
- [ ] `npm run build` pasa sin errores de TypeScript.
- [ ] Registro con correo funciona; llega la clienta con rol cliente.
- [ ] Login con Google funciona y vuelve a la app.
- [ ] Cliente: agenda una cita, ve la cuenta regresiva y la alerta dentro de la app.
- [ ] Dos clientas **no** pueden tomar la misma hora (la segunda ve el aviso y se recargan las horas).
- [ ] Cliente no puede cancelar con menos de 24 h; sí con más.
- [ ] Una clienta no ve citas ni datos de otras (probar entrando con dos cuentas).
- [ ] Colaboradora registra atención con productos; el stock baja y la admin recibe la alerta si cruza el mínimo.
- [ ] Colaboradora y admin registran pagos; no se puede pagar de más; con caja cerrada se rechaza.
- [ ] Admin cierra caja; aparece la diferencia y la alerta.
- [ ] Admin registra una colaboradora desde su panel; llega la invitación y ella define su contraseña.
- [ ] Asistencia: ingreso y salida calculan horas y tardanza.
- [ ] Una clienta que escribe `/admin/inicio` en la barra es redirigida a su zona.
- [ ] Recargar cualquier ruta interna en producción (Vercel) no da 404.
- [ ] No hay ninguna clave secreta en el repositorio (`git grep sb_secret` y `service_role` sin resultados).

## 13. Despliegue

1. Subir a GitHub (sin `.env.local`).
2. Importar en Vercel; cargar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (con la dirección real de Vercel).
3. Supabase → **Authentication → URL Configuration**: `Site URL` = dirección de Vercel; agregar `https://TU-APP.vercel.app/**` y `http://localhost:5173/**` en *Redirect URLs*.
4. Google Cloud → cliente OAuth: agregar la dirección de Vercel en *Orígenes autorizados de JavaScript* (la URI de redirección sigue siendo la de Supabase) y **publicar la aplicación**.
5. `supabase secrets set SITE_URL=https://TU-APP.vercel.app` y volver a desplegar las funciones.
6. SMTP propio (Resend) en Supabase para que lleguen los correos en producción.
7. Activar `pg_cron` y comprobar que corre `app.generar_recordatorios()` cada 10 minutos.
8. Crear la primera admin: `update public.profiles set rol = 'admin' where correo = '...';`.
9. Pasar la lista de la sección 12 en producción.

## 14. Cómo trabajar (reglas para la IA)

- **Leer primero las otras tres skills.** No empezar a codificar sin ellas.
- Trabajar por fases en el orden de este documento; al terminar una fase, **ejecutar** typecheck/build y, si hay credenciales, probar contra Supabase real. No declarar algo "funcionando" sin haberlo ejecutado; si no se pudo ejecutar, decirlo.
- Entregar al terminar cada fase un resumen corto: qué se hizo, cómo probarlo, qué falta.
- Crear un `README.md` con: requisitos, pasos de instalación, variables de entorno, cómo correr el SQL, cómo configurar Google, cómo desplegar y la estructura de carpetas.
- Preferir componentes pequeños y reutilizables; no duplicar lógica de fechas, dinero ni errores (usar `lib/`).
- Si falta información del negocio (precios, horarios, textos, imágenes), usar valores marcados claramente como **ejemplo** y avisar para que el usuario los reemplace.
- Ante una decisión que cambie las reglas de negocio acordadas, **preguntar antes**.
- Cualquier cambio en la base de datos va como migración SQL numerada (`supabase/migrations/NNN_nombre.sql`) y se actualiza la skill `at-beauty-base-de-datos`.
