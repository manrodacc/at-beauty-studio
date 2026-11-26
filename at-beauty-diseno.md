---
name: at-beauty-diseno
description: Sistema de diseño y movimiento de AT Beauty Studio: paleta rosada premium, tipografía, componentes, animaciones suaves, microinteracciones, escenas con scroll, uso de imágenes, accesibilidad y rendimiento. Usar al construir o modificar cualquier pantalla o componente visual.
---

# AT Beauty Studio · Diseño y movimiento

Objetivo: que la app se sienta **premium, cálida y viva**, como un salón de belleza de lujo, sin sacrificar velocidad ni claridad. Tiene que verse espectacular en el celular (la mayoría de clientas), ser rápida y seguir funcionando para quien prefiere menos movimiento. Esta skill complementa a `at-beauty-sistema` (flujos) y `at-beauty-base-de-datos` (datos). Si existe la skill general `frontend-design`, usarla como apoyo para evitar resultados genéricos.

## 1. Principios

1. **Elegancia antes que espectáculo**: movimiento suave, con propósito, nunca decorativo en exceso.
2. **Móvil primero**: se diseña a 390 px y se escala a escritorio.
3. **Dos "modos de energía"**:
   - **Escaparate** (landing, login, registro, agendar, mis citas): animación rica, escenas con scroll, imágenes grandes.
   - **Trabajo** (paneles de admin y colaboradora): animación sutil y rápida (≤ 200 ms). Aquí manda la eficiencia; nada que haga esperar.
4. **Todo movimiento comunica algo**: confirmar una acción, mostrar relación entre pantallas, dirigir la atención.
5. **Respetar `prefers-reduced-motion`** siempre (ver sección 9).
6. **Solo animar `transform` y `opacity`** (y `filter` con cuidado). Nunca `width`, `height`, `top`, `left`.

## 2. Identidad visual

Estilo: rosa vibrante + ciruela profunda + toques lavanda y champagne. Bordes muy redondeados, sombras suaves y de color, brillos y destellos (✦) como firma, logo con pestañas.

### Tokens de color (Tailwind v4, en el CSS global)

```css
@theme {
  /* Rosas */
  --color-rose-50:  #FFF1F7;
  --color-rose-100: #FDE0EE;
  --color-rose-200: #FAC4DE;
  --color-rose-300: #F59CC4;
  --color-rose-400: #EC6FA8;
  --color-rose-500: #DE4A8E;   /* acción principal */
  --color-rose-600: #C2337A;   /* hover / pressed */
  --color-rose-700: #9D2763;
  /* Ciruela (texto y títulos) */
  --color-plum-900: #3E1236;
  --color-plum-800: #521A47;
  --color-plum-700: #6B2A5C;
  --color-plum-500: #8A5A7E;   /* texto secundario */
  /* Lavanda (superficies suaves) */
  --color-lilac-100: #EEE6F9;
  --color-lilac-200: #DDD0F2;
  --color-lilac-500: #8E6BD1;
  /* Champagne (detalle premium) */
  --color-champagne-300: #EBD3B3;
  --color-champagne-500: #D2A56A;
  /* Estados */
  --color-ok:   #2F9E75;  --color-ok-soft:   #DDF3EA;
  --color-warn: #D98A1F;  --color-warn-soft: #FCEBCF;
  --color-bad:  #D2414D;  --color-bad-soft:  #FBE0E3;

  --font-display: "Cormorant Garamond", ui-serif, Georgia, serif;
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  --radius-card: 1.5rem;
  --radius-pill: 999px;
  --shadow-soft:  0 8px 30px -12px rgb(222 74 142 / .25);
  --shadow-lift:  0 18px 40px -14px rgb(222 74 142 / .40);
  --shadow-glow:  0 0 0 4px rgb(222 74 142 / .18);
}
```

- **Fondo general**: degradado muy suave `rose-50 → #FFFFFF → lilac-100` con manchas difuminadas (blobs) y destellos.
- **Tarjetas**: blancas o con efecto vidrio (`bg-white/70 backdrop-blur-xl border border-white/60`), radio 24 px, sombra `shadow-soft`.
- **Botón principal**: degradado `rose-400 → rose-600`, texto blanco, forma de píldora, `shadow-soft`.
- **Texto**: títulos en `plum-900`, cuerpo en `plum-700`, secundario `plum-500`. Contraste mínimo AA (4.5:1); no poner texto rosa claro sobre blanco.
- Modo oscuro: opcional y posterior. No bloquea la primera versión.

### Tipografía

- **Titulares de escaparate**: Cormorant Garamond (elegante, serif), 500–700, tamaños grandes con `clamp()`.
- **Interfaz y paneles**: Plus Jakarta Sans, 400/500/600/700.
- Escala: 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64. Interlineado 1.5 en cuerpo, 1.1 en titulares grandes.
- Números de dinero y cuentas regresivas con `font-variant-numeric: tabular-nums`.
- Cargar fuentes con `font-display: swap` y precargar solo las dos usadas.

### Espaciado y layout

- Base de 4 px; separaciones frecuentes 8/12/16/24/32/48.
- Contenedor máximo 1200 px en escritorio; márgenes laterales de 16 px en móvil.
- **Cliente (móvil)**: barra de pestañas inferior fija (Inicio, Agendar, Mis citas, Perfil) con píldora activa deslizante.
- **Admin y colaboradora**: barra lateral rosada con logo (como en los mockups), colapsable; en móvil, menú tipo drawer.
- Cabecera con campana de notificaciones y avatar con menú.

## 3. Librerías de animación (instalar solo lo que se use)

| Necesidad | Librería |
|---|---|
| Animación de componentes, layout, gestos, presencia | `motion` (antes Framer Motion; `import { motion } from "motion/react"`) |
| Escenas con scroll fijadas (pin/scrub) | `gsap` + `ScrollTrigger` |
| Scroll suave y cómodo | `lenis` |
| Animaciones vectoriales complejas (check, destellos) | `lottie-react` / `@lottiefiles/dotlottie-react` |
| Confeti / destellos de celebración | `canvas-confetti` |
| Toasts | `sonner` |
| Drawers y hojas inferiores en móvil | `vaul` |
| Carruseles con gesto | `embla-carousel-react` |
| Gráficas animadas | `recharts` |
| Componentes accesibles base | shadcn/ui (Radix) |

Regla: **motion** para casi todo; **GSAP** solo para las escenas fijadas del landing; no mezclar ambos sobre el mismo elemento.

## 4. Tokens de movimiento

```ts
// src/lib/motion.ts
export const dur = { instant: .12, fast: .2, base: .32, slow: .6, scene: .9 }

export const ease = {
  out:    [0.22, 1, 0.36, 1],     // entrada suave (por defecto)
  inOut:  [0.65, 0, 0.35, 1],
  spring: { type: "spring", stiffness: 320, damping: 28, mass: 0.8 },
  soft:   { type: "spring", stiffness: 180, damping: 24 },
  pop:    { type: "spring", stiffness: 500, damping: 20 },
} as const

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } },
}
export const stagger = (s = 0.06) => ({ show: { transition: { staggerChildren: s } } })
export const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } },
  exit:    { opacity: 0, y: -8, transition: { duration: dur.fast } },
}
```

Reglas: stagger entre elementos ≤ 60–80 ms; duración de entrada 300–600 ms; salidas más rápidas que entradas; en paneles de trabajo, 120–200 ms.

### Componente de revelado al hacer scroll

```tsx
import { motion, useReducedMotion } from "motion/react"
import { fadeUp } from "@/lib/motion"

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : fadeUp}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  )
}
```

### Scroll suave (Lenis) sincronizado con GSAP

```tsx
// src/providers/SmoothScroll.tsx
import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
gsap.registerPlugin(ScrollTrigger)

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenis.on("scroll", ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  }, [])
  return <>{children}</>
}
```

Usar Lenis **solo en las páginas públicas** (landing, servicios). En paneles, scroll nativo.

## 5. Escenas con scroll (landing pública)

La landing cuenta una historia mientras se baja. En móvil se simplifican (sin fijado largo, solo revelados y parallax leve).

1. **Hero inmersivo**: titular grande en serif ("Realza tu mirada, cuida tu belleza"), botón "Reservar ahora" y foto principal enmarcada en un arco. Capas con parallax a distinta velocidad: fondo con blobs rosados, foto, destellos ✦ flotantes y pétalos/partículas sutiles. Al hacer scroll la foto escala suavemente y el titular se desvanece hacia arriba.
2. **"Cómo funciona" fijado (pin + scrub)**: tres pasos —*Elige tu servicio → Escoge tu hora → Disfruta*—. La sección queda fija mientras el scroll avanza: cada paso entra con su ilustración y una línea de progreso se dibuja entre ellos. Con GSAP `ScrollTrigger` (`pin: true`, `scrub: 0.6`). En móvil se convierte en tres tarjetas con revelado.
3. **Servicios en carrusel horizontal guiado por scroll**: al bajar, las tarjetas de servicio se desplazan en horizontal (por categoría: Pestañas, Uñas, Cejas, Facial, Depilación). Cada tarjeta con imagen, precio y duración; hover/tilt en escritorio, gesto de arrastre en móvil.
4. **Antes y después**: deslizador comparativo con arrastre y suave inercia.
5. **Contadores**: "+2000 clientas felices", "+15 servicios", "5★" que cuentan hacia arriba al entrar en pantalla.
6. **Testimonios**: cinta en bucle (marquee) lenta que se pausa al tocar o pasar el cursor.
7. **Llamado final**: fondo degradado con destellos que reaccionan levemente al cursor; botón magnético que sigue ligeramente el puntero (solo escritorio).
8. **Barra de progreso de scroll** fina en rosa en la parte superior, y **botón "Reservar" fijo** en móvil que aparece tras pasar el hero.

Ejemplo de parallax con `motion`:

```tsx
import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"

export function HeroParallax() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const yPhoto = useTransform(scrollYProgress, [0, 1], ["0%", "18%"])
  const yBlob  = useTransform(scrollYProgress, [0, 1], ["0%", "40%"])
  const scale  = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const fade   = useTransform(scrollYProgress, [0, .6], [1, 0])
  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden">
      <motion.div style={{ y: yBlob }} className="absolute -top-20 -right-20 size-[420px] rounded-full bg-rose-200/60 blur-3xl" />
      <motion.h1 style={{ opacity: fade }} className="font-display text-[clamp(2.5rem,8vw,6rem)] text-plum-900">…</motion.h1>
      <motion.img style={{ y: yPhoto, scale }} src="/img/hero.webp" alt="Mirada con extensiones de pestañas" />
    </section>
  )
}
```

## 6. Catálogo de microinteracciones

**Botones**
- Presión: `whileTap={{ scale: .97 }}`; hover: elevación + brillo que cruza el botón (shine sweep) en el principal.
- Estado de carga: el texto se reemplaza por un spinner; al terminar, se transforma en un ✓ con trazo animado y vuelve a su estado (~900 ms).
- Botones deshabilitados con opacidad baja y sin sombra; nunca solo cambiar el color.

**Campos de formulario**
- Etiqueta flotante, anillo de foco `shadow-glow`, ícono que cambia de color al enfocar.
- Error: pequeña sacudida horizontal (shake 250 ms) + mensaje que se desliza con `error.hint`.
- Contraseña: ojo que alterna con transición; indicador de fuerza que se llena.
- Éxito: check discreto que aparece al validar.

**Tarjetas**
- Hover (solo dispositivos con puntero): se elevan 4 px, sombra `shadow-lift`, imagen con zoom 1.05; en escritorio, inclinación 3D leve (tilt) en tarjetas de servicio.
- Entrada de listas con stagger; al eliminar/agregar, `AnimatePresence` + `layout` para que las demás se reacomoden suavemente.

**Navegación**
- Píldora activa que **se desliza** entre pestañas con `layoutId`.
- Transición de página: fundido + desplazamiento de 12 px (`pageVariants`); en pasos del agendamiento, deslizamiento lateral según avance o retroceso.
- Menú móvil y filtros en hoja inferior (`vaul`) con arrastre y rebote.
- Cabecera que se encoge y gana desenfoque al bajar; se oculta al bajar rápido y reaparece al subir.

**Agendamiento (la pantalla estrella)**
- Indicador de pasos con barra de progreso rosada que se llena.
- **Servicios**: tarjetas con imagen; al elegir, la tarjeta se marca con borde rosa, ✓ que "salta" (`ease.pop`) y las demás se atenúan.
- **Colaboradora**: avatares circulares con anillo de selección animado; opción "Cualquiera disponible" con destello.
- **Calendario**: días con horarios libres con un punto; día seleccionado como círculo que se desliza al nuevo día; días sin horarios, atenuados.
- **Horas**: chips que aparecen en cascada; al elegir, "pop" con rebote; horas ocupadas deshabilitadas con tachado suave; si otra persona toma la hora (`horario_no_disponible`), el chip tiembla, se apaga y se recarga la lista con aviso amable.
- **Resumen y confirmar**: tarjeta tipo ticket que se ensambla pieza por pieza.
- **Éxito**: check dibujado (trazo SVG), lluvia breve de destellos rosados y champagne (`canvas-confetti` con colores de marca), vibración corta en móvil (`navigator.vibrate(30)`), y debajo la **cuenta regresiva**.

**Cuenta regresiva de la cita**
- Tarjeta con días / horas / minutos; cada dígito tiene giro vertical (flip) al cambiar; segundos con latido muy sutil (solo si faltan menos de 2 h).
- Texto humano: "Faltan 2 días y 3 horas". Si faltan menos de 24 h, la tarjeta cambia a tono más cálido y muestra el botón de indicaciones; con `puede_cancelar = false`, mostrar el límite pasado con tono neutro.

**Notificaciones**
- Campana: **se mueve** (balanceo) cuando llega una alerta nueva por Realtime; la insignia aparece con "pop" y el contador cambia con transición vertical.
- Panel desplegable con elementos que entran en cascada; marcar como leída desvanece el punto rosa.
- Toasts (`sonner`) con ícono animado por tipo; errores con tono rosado-rojizo, nunca agresivo.

**Pagos, caja e inventario (modo trabajo)**
- Totales con **conteo ascendente** al cargar o cambiar (`S/ 1,240.00`), solo 400–600 ms.
- Selector de método de pago con píldora que se desliza.
- Barras de stock que se llenan al aparecer; cuando está bajo el mínimo, la barra pasa a ámbar y pulsa una vez.
- Tablas: filas con stagger corto la primera vez; resalte rosado suave al pasar el cursor; fila nueva entra con destello que se apaga.
- Cierre de caja: al cerrar con diferencia 0, sello ✓ animado; con diferencia, aviso ámbar.

**Reportes**
- Gráficas que se **dibujan** al entrar (líneas con trazo, barras que crecen, donas que giran hasta su valor); tooltips con fundido; selector de período con transición de datos sin parpadeo.

**Asistencia**
- Botón grande "Registrar ingreso" con reloj en vivo; al pulsar, anillo que se completa y estado "A tiempo / Tarde" que entra con color.

**Estados**
- **Esqueletos con brillo** (shimmer rosado) en lugar de spinners para listas y tarjetas.
- **Vacíos** con ilustración suave y botón de acción ("Aún no tienes citas · Reservar mi primera cita").
- **Errores** con mensaje humano, ícono y botón "Reintentar".
- Transiciones entre cargando → contenido con fundido, sin saltos de layout.

## 7. Imágenes

La belleza se vende con imágenes; usarlas con intención y cuidado.

**Qué se necesita**
- Hero (foto de mirada con pestañas o manos con manicure), fotos de cada categoría de servicio, fotos del local, equipo (avatares de colaboradoras), antes/después, galería de trabajos, fondo del login.
- Logo del estudio en **SVG** (pestañas + "AT BEAUTY STUDIO · Pestañas & Belleza").

**Origen de las imágenes**
- Prioridad: **fotos reales del estudio y de sus trabajos** (pedirlas a la dueña, con permiso de las clientas que aparezcan).
- Mientras tanto: bancos con licencia libre (Unsplash, Pexels) respetando su licencia, o ilustraciones propias; usar degradados de marca como marcador de posición.
- No usar imágenes de marcas, de otras personas sin permiso ni material con copyright.
- Las fotos de personas tienen que verse naturales y diversas; evitar retoque exagerado.

**Técnica**
- Formato **WebP/AVIF**, generar tamaños (`srcset` y `sizes`): 480, 800, 1200, 1600 px.
- `loading="lazy"` salvo la imagen principal (`fetchpriority="high"`).
- **Marcador borroso (blur-up)** mientras carga y proporción fija (`aspect-ratio`) para evitar saltos.
- Peso objetivo: hero < 200 KB, resto < 100 KB.
- Texto alternativo descriptivo ("Extensiones clásicas de pestañas"); decorativas con `alt=""`.
- Bordes y recortes con la identidad: arcos, óvalos y esquinas muy redondeadas; ligero velo rosado en degradado para legibilidad del texto superpuesto.
- Almacenamiento de imágenes de servicios y colaboradoras: Supabase Storage (bucket público para catálogo), con URL en la tabla correspondiente.

## 8. Accesibilidad y rendimiento (obligatorio)

**Accesibilidad**
- Respeto de `prefers-reduced-motion`: sin parallax, sin pin, sin confeti, sin flip; solo fundidos cortos.
- Contraste AA; foco siempre visible (`shadow-glow`); tamaño táctil mínimo 44×44 px.
- Etiquetas en campos, `aria-live="polite"` para alertas y toasts, navegación por teclado completa, `aria-label` en botones de solo ícono.
- No transmitir información solo por color (usar también ícono o texto).
- Nada parpadea más de 3 veces por segundo.

```tsx
// Hook útil
import { useReducedMotion } from "motion/react"
export const useCalm = () => !!useReducedMotion()
```

**Rendimiento**
- Presupuesto: LCP < 2.5 s en 4G, CLS < 0.1, 60 fps al hacer scroll.
- Carga diferida (`lazy` + `Suspense`) de GSAP, Lottie y confeti: solo en las pantallas que los usan.
- Animar únicamente `transform`/`opacity`; usar `will-change` solo durante la animación.
- En móviles de gama baja (`navigator.hardwareConcurrency <= 4`) reducir partículas y desactivar el desenfoque (`backdrop-blur`) pesado.
- Pausar animaciones infinitas fuera de pantalla (`IntersectionObserver`) y con la pestaña oculta.
- Lottie: archivos < 50 KB; preferir SVG animado simple cuando alcance.

## 9. Responsive

- Puntos de quiebre: 390 (base), 640, 768, 1024, 1280.
- Móvil: una columna, barra inferior, hojas inferiores para filtros y confirmaciones, botones anchos.
- Tablet/escritorio: barra lateral, rejillas de 2–4 columnas, hover y tilt activados solo con `@media (hover: hover)`.
- Tablas del panel: en móvil se vuelven tarjetas apiladas con la información clave arriba.
- Probar siempre en 390×844 y en 1440×900, y con teclado.

## 10. Tono y textos de interfaz

- Cálido, cercano y en español peruano neutro ("Reserva tu cita", "Tu cita está confirmada ✨").
- Mensajes de error con solución ("Esa hora ya se ocupó. Te mostramos otras disponibles.").
- Usar el texto `error.hint` de la base como mensaje principal.
- Emojis y destellos con moderación (✨ en éxitos, nada en errores graves).
- Formatos: `S/ 120.00`, fechas "mar 25 nov · 9:00 a. m.", duración "1 h 30 min".

## 11. Estructura de código sugerida

```
src/
  components/
    ui/            # shadcn + variantes de marca (Button, Input, Card, Badge…)
    motion/        # Reveal, PageTransition, CountUp, Countdown, Sparkles, MagneticButton
    layout/        # SidebarAdmin, TabBarCliente, Header, NotificationBell
    booking/       # StepIndicator, ServiceCard, StaffPicker, DayPicker, TimeChips, TicketSummary
  lib/motion.ts    # tokens de movimiento
  styles/globals.css  # @theme con tokens de color y tipografía
  pages/{public,cliente,colaboradora,admin}/
```

## 12. Lista de verificación antes de dar una pantalla por terminada

- [ ] Se ve bien en 390 px y en 1440 px.
- [ ] Usa solo tokens de color, tipografía y radios definidos aquí.
- [ ] Entrada animada suave, y estados de carga, vacío y error cuidados.
- [ ] Cada acción importante tiene respuesta visual inmediata (presión, éxito o error).
- [ ] Funciona con `prefers-reduced-motion` y con teclado.
- [ ] Sin saltos de layout; imágenes con proporción y blur-up.
- [ ] Panel de trabajo: animaciones ≤ 200 ms y sin retrasar tareas.
- [ ] Probado el rendimiento en un celular de gama media.
