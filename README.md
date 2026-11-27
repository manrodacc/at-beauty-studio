# AT Beauty Studio

Sitio público y paneles para clientas, colaboradoras y administración. React, Vite, TypeScript, Tailwind 4, componentes shadcn/Radix, React Router, TanStack Query, React Hook Form, Zod y Supabase. Motion, GSAP/ScrollTrigger, Lenis, Embla, Vaul, Sonner, Recharts y canvas-confetti se cargan según el flujo que los usa.

## Desarrollo local

Requisitos: Node 20.19+, 22.12+ o una versión más reciente y npm.

```powershell
npm ci
npm run dev
npm run typecheck
npm run build
```

En esta copia local, `.env.local` contiene la URL y la clave publicable del proyecto. Para otra copia, usa `.env.example` como plantilla y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. En producción, agrega también `VITE_SITE_URL` con el origen real. Vite incorpora las variables `VITE_*` al frontend. Guarda las claves privadas solo en las Edge Functions.

## Supabase y la base existente

Las cuatro guías `at-beauty-*.md` contienen el esquema y las reglas del negocio. El proyecto usa el esquema ya instalado. Los archivos originales `schema.sql`, `seed.sql` y `crear-colaboradora.ts` no estaban en la carpeta inicial. Para una instalación nueva, recupera el SQL original y ejecútalo en orden, primero el esquema y luego el seed si corresponde. En la base en uso, publica servicios desde el panel de administración y asigna servicios y horarios a las colaboradoras para habilitar reservas.

Los tipos oficiales están en `src/types/database.generated.ts`. Para regenerarlos, inicia sesión con `npx supabase login` y ejecuta `npx supabase gen types typescript --remote=<ref> --schema public,reporting > src/types/database.generated.ts`. Los alias de la aplicación se derivan de esos tipos en `src/types/database.ts` para conservarlos al regenerar.

El catálogo público consulta `categorias_servicio` con sus servicios activos, en orden, y omite categorías vacías. En `/admin/categorias` se pueden crear, editar, ordenar, activar y desactivar categorías; los servicios se asignan mediante `id_categoria`. Las lecturas de `citas_detalle` y `reporting` conservan la columna `categoria`.

El carrusel de la landing presenta imágenes contenidas y la descripción guardada en cada categoría. «Reservar» abre los servicios de esa categoría en la misma página. Al elegir un servicio, las visitantes pasan al registro; la selección se conserva al recargar, cambiar a inicio de sesión o continuar con Google, y vuelve al agendamiento después de autenticarse.

El directorio de clientes del admin incluye fichas sin cuenta y cuentas cuyo rol actual es `cliente`; cambiar de rol conserva la ficha histórica, pero la oculta del directorio. En la atención sin cita, admin y colaboradoras pueden buscar por nombre o contacto, registrar una clienta nueva y dejarla seleccionada sin perder los datos de la atención. El alta utiliza el permiso existente `clientes_alta`; no crea cuentas de acceso.

El inventario usa `categorias_producto`, un catálogo independiente de `categorias_servicio`. Admin puede gestionar sus categorías desde «Categorías de producto» en Inventario y asignarlas a productos mediante `id_categoria`. Las categorías inactivas siguen disponibles para consultar el inventario. La colaboradora puede consultar y filtrar productos; las clientas y visitantes no solicitan estos catálogos. El error de restricción `23503` se traduce según el contexto de productos o servicios, conservando los mensajes de ambos módulos.

Las pruebas de navegador usan Supabase simulado y no escriben en la base real. Ejecuta `npx playwright install chromium` una vez y luego `npm run test:e2e`. Verifican agrupación y visibilidad pública, agendamiento, creación/asignación/desactivación desde admin, orden, errores de restricciones y bloqueo de la ruta administrativa para clientas. La seguridad RLS real sigue siendo responsabilidad del esquema desplegado; estas pruebas no sustituyen una comprobación con credenciales reales en un entorno de pruebas.

En **Authentication → URL Configuration**, agrega `http://localhost:5173/**`, `http://127.0.0.1:5173/**` y el dominio real de producción a las redirecciones permitidas. Habilita Google como proveedor cuando tengas su Client ID y Secret. En Google Cloud configura como redirección la URL de devolución indicada por Supabase. [Configuración de Google en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google).

El registro con correo y contraseña inicia sesión al crear la cuenta. En el proyecto alojado, desactiva **Confirm email** en **Authentication → Sign In / Providers**. Para el entorno local, el ajuste correspondiente es `auth.email.enable_confirmations = false` en `supabase/config.toml`.

Para publicar fotos de servicios, el bucket `catalogo` debe permitir lectura pública de sus objetos y escritura solo a administración. Las fotos se guardan en `servicios/<id>`, sin columnas nuevas. La primera administradora se configura desde un entorno con permisos de administración sobre `public.profiles`.

## Funciones y recordatorios

Con una cuenta de Supabase con acceso al proyecto:

```powershell
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy crear-colaboradora
npx supabase functions deploy enviar-correos
```

Agrega `SITE_URL`, `RESEND_API_KEY`, `CORREO_REMITENTE` y `CORREO_CRON_SECRET` en los secretos de Edge Functions. Usa el dominio real de la aplicación y una dirección remitente verificada en Resend. Configura SMTP en Supabase Auth para los correos de confirmación, invitación y recuperación.

Desde Supabase Cron, verifica el trabajo de `app.generar_recordatorios()` cada 10 minutos. Programa una solicitud POST a `/functions/v1/enviar-correos` cada 5 minutos, con el mismo secreto de la función en el encabezado `X-Studio-Cron`. Mantén ese valor en Vault y limita el acceso a Vault y a la cola de solicitudes de `pg_net`. Realtime requiere que `public.notificaciones` esté en la publicación `supabase_realtime`. [Supabase Cron y Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).

Una invitación nueva valida la sesión y el rol activo de administración antes de llamar a Supabase Auth. Si la invitación se envía y el guardado de la ficha falla, vuelve a guardar usando el mismo correo. La edición de fichas antiguas sin cuenta vinculada requiere vincular la ficha existente antes de usar el formulario.

## Vercel y Power BI

En Vercel importa el proyecto con el preset de Vite, el comando `npm run build` y salida `dist`. Agrega las tres variables del frontend y configura las redirecciones de Auth con su dominio. `vercel.json` resuelve las rutas internas de React Router.

Los reportes web usan lecturas protegidas por RLS. Para Power BI, conecta el conector PostgreSQL al pooler de Supabase con el rol de solo lectura `powerbi_reader`. Importa las vistas del esquema `reporting` indicadas en la guía de base de datos. La conexión de Power BI queda fuera de la aplicación web.

## Estructura

- `src/app` y `src/providers` controlan rutas, sesión y restricciones por rol.
- `src/pages` reúne la portada, el acceso y los flujos de cada rol.
- `src/features` y `src/lib` comparten consultas, RPC, formato y gestión de errores.
- `supabase/functions` contiene las funciones de invitación y entrega de correos.
- `public/img` contiene imágenes ilustrativas generadas para la portada y las categorías. Se pueden reemplazar por fotos autorizadas del estudio.

### Imágenes ilustrativas

La portada usa Instrument Serif y las imágenes de `public/img/editorial`, creadas con ImageGen integrado. Las referencias de dirección visual fueron un retrato con luz lateral sobre un fondo color vino, un detalle de manicura burdeos sobre satén, una escena de cuidado facial junto a una ventana y una hoja de contactos de seis fotos de tratamientos y herramientas. Los originales se recortaron y comprimieron a WebP. Las imágenes son ilustrativas.
# at-beauty-studio
