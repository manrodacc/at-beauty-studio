import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronDown, Menu, Sparkles, X } from 'lucide-react'
import {
  motion, MotionConfig,
  useMotionValue, useMotionValueEvent,
  useReducedMotion, useScroll, useSpring, useTransform,
} from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Failure, Skeleton } from '@/components/ui'
import { servicePhoto, useCatalogo } from '@/features/catalogo'
import { duracion, formatSoles } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import './landing.css'

const IMG = '/img/editorial/'
const RESERVATION = '/app/agendar'

const CATEGORIES = [
  { name: 'Pestañas',      photo: 'pestanas',   alt: 'Detalle de pestañas rizadas con el ojo cerrado',          heading: 'Una mirada\nmás definida.' },
  { name: 'Uñas',          photo: 'unas',        alt: 'Manicura color cereza oscuro sobre tela color vino',      heading: 'Color hasta\nlas puntas.'   },
  { name: 'Cejas',         photo: 'cejas',       alt: 'Detalle de una ceja perfilada',                           heading: 'La forma de\ntu mirada.'    },
  { name: 'Cuidado facial',photo: 'facial',      alt: 'Aplicación de una mascarilla facial',                     heading: 'Un respiro\npara tu piel.'  },
  { name: 'Depilación',    photo: 'depilacion',  alt: 'Cera color miel en un cuenco con una espátula de madera', heading: 'Cuidado para\ncada zona.'   },
] as const

const CHAPTERS = [
  { title: 'Elige tu servicio',      description: 'Compara precios y duración para encontrar el que mejor se adapta a tu día.' },
  { title: 'Encuentra tu horario',   description: 'Revisa horas disponibles y elige una especialista, o deja que el estudio te asigne.' },
  { title: 'Tu cita queda lista',    description: 'Recibe confirmación al instante y consulta los detalles desde tu cuenta.' },
]

const MARQUEE_ITEMS = [
  'Pestañas', 'Cejas', 'Uñas', 'Cuidado facial', 'Depilación',
  'Pestañas', 'Cejas', 'Uñas', 'Cuidado facial', 'Depilación',
]

/* ── Helpers ─────────────────────────────────── */
function SectionHeading({ id, label, animated, children, light = false }:
  { id: string; label: string; animated: boolean; children: ReactNode; light?: boolean }) {
  return (
    <motion.header
      className="ed-section-heading"
      initial={animated ? { opacity: 0, y: 28 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: .18 }}
      transition={{ duration: .7, ease: [.22, .76, .22, 1] }}
    >
      <p className="ed-kicker" style={light ? { color: 'var(--gold)' } : undefined}>{label}</p>
      <h2 id={id}>{children}</h2>
    </motion.header>
  )
}

function Wordmark() {
  return (
    <Link className="ed-wordmark" to="/" aria-label="AT Beauty Studio, inicio">
      <span className="ed-monogram" aria-hidden>AT</span>
      <span className="ed-wordmark-text" aria-hidden>Beauty<br/>Studio</span>
    </Link>
  )
}

/* ── Header ──────────────────────────────────── */
function Header({ signedIn }: { signedIn: boolean }) {
  const navId = useId()
  const menuBtn = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="ed-header" data-scrolled={scrolled}
      onKeyDown={e => { if (e.key === 'Escape' && menu) { setMenu(false); menuBtn.current?.focus() } }}>
      <div className="ed-wrap ed-nav">
        <Wordmark/>
        <nav id={navId} className="ed-nav-links" aria-label="Navegación principal" data-open={menu}>
          <a href="#servicios" onClick={() => setMenu(false)}>Servicios</a>
          <a href="#tu-visita" onClick={() => setMenu(false)}>Tu visita</a>
          <Link className="ed-mobile-cta" to={RESERVATION} onClick={() => setMenu(false)}>Reservar cita</Link>
        </nav>
        <div className="ed-nav-actions">
          <Link className="ed-nav-ghost" to={signedIn ? '/app' : '/login'}>{signedIn ? 'Mi cuenta' : 'Ingresar'}</Link>
          <Link className="ed-nav-cta" to={RESERVATION}>Reservar cita</Link>
          <button ref={menuBtn} className="ed-menu" type="button"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menu} aria-controls={navId}
            onClick={() => setMenu(o => !o)}>
            {menu ? <X size={22} strokeWidth={1.6}/> : <Menu size={22} strokeWidth={1.6}/>}
          </button>
        </div>
      </div>
    </header>
  )
}

/* ── Cursor glow (desktop only) ──────────────── */
function CursorGlow() {
  const x = useMotionValue(-500)
  const y = useMotionValue(-500)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); setVisible(true) }
    const leave = () => setVisible(false)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseleave', leave)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave) }
  }, [x, y])

  return (
    <motion.div
      className="ed-cursor-glow"
      style={{ x, y, opacity: visible ? 1 : 0 }}
      aria-hidden
    />
  )
}

/* ── Portrait image ──────────────────────────── */
function Portrait() {
  return (
    <img
      src={IMG + 'retrato-800.webp'}
      srcSet={IMG + 'retrato-480.webp 480w, ' + IMG + 'retrato-800.webp 800w, ' + IMG + 'retrato-1280.webp 1280w'}
      sizes="(max-width: 720px) 92vw, (max-width: 1260px) 48vw, 580px"
      width="800" height="896"
      alt="Retrato editorial con pestañas definidas y luz cálida"
      fetchPriority="high" decoding="async"
    />
  )
}

/* ── Hero section ────────────────────────────── */
function Hero({ animated, onMotionChange }: { animated: boolean; onMotionChange: () => void }) {
  const heroRef  = useRef<HTMLElement>(null)
  const [second, setSecond] = useState(false)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const spring   = useSpring(scrollYProgress, { stiffness: 160, damping: 30, restDelta: .001 })

  /* Scroll-driven transforms */
  const photoScale  = useTransform(spring, [0, .5, 1], [1, 1.26, 1.36])
  const photoY      = useTransform(spring, [0, .6, 1], ['0%', '14%', '22%'])
  const revealX     = useTransform(spring, [.08, .28], ['104%', '0%'])
  const counterX    = useTransform(spring, [.08, .28], ['-104%', '0%'])
  const secondScale = useTransform(spring, [.08, .6], [1.07, 1.15])
  const insetX      = useTransform(spring, [0, .55], [0, -68])
  const insetY      = useTransform(spring, [0, .55], [0, -112])
  const insetRot    = useTransform(spring, [0, .55], [-9, 10])
  const glowY       = useTransform(spring, [0, .8], [0, -140])
  const copyY       = useTransform(spring, [0, 1], [0, 40])

  /* Pointer tilt */
  const pX = useMotionValue(0); const pY = useMotionValue(0)
  const tX = useSpring(pX, { stiffness: 200, damping: 22 })
  const tY = useSpring(pY, { stiffness: 200, damping: 22 })

  useMotionValueEvent(scrollYProgress, 'change', v => { if (!animated) setSecond(v >= .33) })
  useEffect(() => { if (!animated) setSecond(scrollYProgress.get() >= .33) }, [animated, scrollYProgress])

  return (
    <section className="ed-hero" aria-labelledby="ed-title" ref={heroRef}
      data-second-frame={!animated && second}>
      {/* Background glow */}
      <div className="ed-hero-bg" aria-hidden>
        <div className="ed-hero-bg-layer"/>
        <motion.div className="ed-hero-bg-overlay" style={animated ? { y: glowY } : undefined}/>
      </div>

      {/* Main content */}
      <div className="ed-hero-stage">
        <div className="ed-hero-wrap">

          {/* Copy */}
          <motion.div className="ed-hero-copy" style={animated ? { y: copyY } : undefined}>
            <div className="ed-hero-eyebrow">
              <p className="ed-kicker">Estudio de belleza</p>
            </div>

            <h1 id="ed-title">
              <span className="ed-title-line"><span>Realza tu</span></span>{' '}
              <span className="ed-title-line"><span>mirada,</span></span>{' '}
              <span className="ed-title-line"><em>cuida tu belleza.</em></span>
            </h1>

            <p className="ed-hero-desc">
              Pestañas, cejas, uñas y cuidado facial.<br/>
              Reserva tu cita en pocos pasos.
            </p>

            <div className="ed-hero-actions">
              <Link className="ed-button" to={RESERVATION}>Reservar una cita</Link>
              <a className="ed-underline" href="#servicios">Ver servicios</a>
            </div>

            <div className="ed-hero-stats">
              <div className="ed-stat">
                <strong>5<em>+</em></strong>
                <span>Especialistas</span>
              </div>
              <div className="ed-stat">
                <strong>500<em>+</em></strong>
                <span>Citas al mes</span>
              </div>
              <div className="ed-stat">
                <strong>4.9<em>★</em></strong>
                <span>Valoración media</span>
              </div>
            </div>
          </motion.div>

          {/* Visual */}
          <div className="ed-hero-visual"
            onPointerMove={e => {
              if (!animated || e.pointerType !== 'mouse') return
              const b = e.currentTarget.getBoundingClientRect()
              pX.set(((e.clientX - b.left) / b.width - .5) * 16)
              pY.set(((e.clientY - b.top) / b.height - .5) * 11)
            }}
            onPointerLeave={() => { pX.set(0); pY.set(0) }}>

            <div className="ed-portrait-wrap">
              <motion.div className="ed-portrait-mount" style={animated ? { x: tX, y: tY } : undefined}>
                <div className="ed-portrait-ring" aria-hidden/>
                <figure className="ed-portrait-frame">
                  <motion.div className="ed-portrait-img"
                    style={animated ? { y: photoY, scale: photoScale } : undefined}>
                    <Portrait/>
                  </motion.div>
                  <motion.div className="ed-portrait-second"
                    style={animated ? { opacity: 1, x: revealX } : undefined}
                    aria-hidden>
                    <motion.img
                      src={IMG + 'ritual-900.webp'} alt=""
                      width="900" height="600" decoding="async"
                      style={animated ? { x: counterX, scale: secondScale } : undefined}
                    />
                  </motion.div>
                </figure>
                <span className="ed-glint ed-glint-a" aria-hidden>✧</span>
                <span className="ed-glint ed-glint-b" aria-hidden>✦</span>
              </motion.div>

              <motion.figure
                className="ed-inset"
                style={animated ? { x: insetX, y: insetY, rotate: insetRot } : { rotate: -9 }}>
                <img src={IMG + 'manos.webp'} width="530" height="630"
                  alt="Manicura en color vino" decoding="async"/>
              </motion.figure>
            </div>
          </div>
        </div>

        {/* Footer cues */}
        <div className="ed-hero-footer">
          <a href="#tu-visita" className="ed-scroll-cue">
            <span><ChevronDown size={16}/></span>
            Sigue la escena
          </a>
          <button className="ed-motion-toggle" type="button"
            aria-pressed={animated} onClick={onMotionChange}>
            <Sparkles size={14}/>
            Animación completa
            <span className="ed-toggle-pill" aria-hidden/>
          </button>
        </div>
      </div>
    </section>
  )
}

/* ── Marquee strip ───────────────────────────── */
function Marquee() {
  return (
    <div className="ed-marquee-strip" aria-hidden>
      <div className="ed-marquee-track">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="ed-marquee-item">
            {item}<span>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Service thumbnail ───────────────────────── */
function ServiceThumb({ id }: { id: number }) {
  const [missing, setMissing] = useState(false)
  if (missing) return null
  return (
    <img className="ed-service-thumb"
      src={servicePhoto(id)} width="44" height="44"
      alt="" loading="lazy"
      onError={() => setMissing(true)}/>
  )
}

/* ── Services section ────────────────────────── */
function Services({ animated }: { animated: boolean }) {
  const { data: services = [], isPending, error, refetch } = useCatalogo()
  const [viewport, carousel] = useEmblaCarousel({ align: 'start', duration: 24, watchFocus: false })
  const [selected, setSelected] = useState(0)
  const groupId = useId()

  useEffect(() => {
    if (!carousel) return
    const update = () => setSelected(carousel.selectedScrollSnap())
    carousel.on('select', update).on('reInit', update)
    update()
    return () => { carousel.off('select', update).off('reInit', update) }
  }, [carousel])

  const selectCategory = (index: number) => {
    if (carousel) carousel.scrollTo(index, !animated)
  }

  return (
    <section className="ed-services" id="servicios" aria-labelledby="ed-services-title">
      <div className="ed-wrap">
        <SectionHeading id="ed-services-title" label="Servicios" animated={animated}>
          Elige lo que <em>quieres cuidar.</em>
        </SectionHeading>

        {/* Tabs */}
        <div className="ed-tabs" aria-label="Categorías de servicios">
          {CATEGORIES.map(({ name }, index) => (
            <button key={name} type="button" className="ed-tab"
              aria-pressed={selected === index}
              aria-controls={groupId}
              onClick={() => selectCategory(index)}>
              {selected === index && (
                <motion.span className="ed-tab-bg"
                  layoutId={animated ? 'ed-tab-active' : undefined}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  aria-hidden/>
              )}
              <span>{name}</span>
            </button>
          ))}
        </div>

        {/* Catalog */}
        <div className="ed-catalog-window" id={groupId} ref={viewport}
          role="region" aria-label="Servicios, precios y duración">
          <div className="ed-catalog-track">
            {CATEGORIES.map(({ name, photo, alt, heading }, index) => {
              const items = services.filter(s => s.categoria === name)
              return (
                <motion.article key={name} className="ed-catalog-slide"
                  aria-label={name} inert={selected !== index}
                  initial={animated ? { opacity: 0 } : false}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: .1 }}
                  transition={{ duration: .6 }}>
                  <div className="ed-catalog-photo">
                    <img src={IMG + photo + '.webp'} alt={alt}
                      width="590" height="570" loading="lazy" decoding="async"/>
                  </div>
                  <div className="ed-catalog-details">
                    <h3>{heading.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</h3>
                    {isPending ? <Skeleton/>
                      : error ? <Failure error={error} retry={() => void refetch()}/>
                      : !items.length
                        ? <p>Por ahora no hay servicios en esta categoría.</p>
                        : (
                          <ul className="ed-service-list">
                            {items.map(item => (
                              <li key={item.id} className="ed-service-item">
                                {selected === index && <ServiceThumb id={item.id}/>}
                                <div className="ed-service-info">
                                  <div className="ed-service-row">
                                    <h4>{item.nombre}</h4>
                                    <strong>{formatSoles(item.precio)}</strong>
                                  </div>
                                  {item.descripcion && <p className="ed-service-desc">{item.descripcion}</p>}
                                  <div className="ed-service-foot">
                                    <span>{duracion(item.duracion_min)}</span>
                                    <Link className="ed-underline"
                                      to={RESERVATION + '?servicio=' + item.id}
                                      aria-label={'Reservar ' + item.nombre}>
                                      Reservar
                                    </Link>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )
                    }
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Bento grid ──────────────────────────────── */
function Bento({ animated }: { animated: boolean }) {
  const cells = [
    { cls: 'ed-bento-cell-a', kicker: 'Reserva en línea', title: <>Agenda tu cita<br/><em>en segundos.</em></>, body: 'Sin llamadas, sin esperar. Elige horario, especialista y servicio desde tu móvil.', icon: '✦' },
    { cls: 'ed-bento-cell-b', kicker: 'Seguimiento',       title: <>Tu historial,<br/><em>siempre contigo.</em></>, body: 'Consulta tus citas pasadas y próximas desde tu cuenta.', icon: '◎' },
    { cls: 'ed-bento-cell-c', kicker: 'Puntualidad',       title: <>Sin<br/><em>esperas.</em></>, body: 'Confirmación inmediata.', icon: '◷' },
    { cls: 'ed-bento-cell-d', kicker: 'Equipo',            title: <>Especialistas<br/><em>certificadas.</em></>, body: 'Cada técnica, formada en su área.', icon: '♡' },
    { cls: 'ed-bento-cell-e', kicker: 'Variedad',          title: <>5 categorías,<br/><em>infinitas opciones.</em></>, body: 'Pestañas, cejas, uñas, facial y depilación. Todo en un solo estudio.', icon: '✿' },
  ]

  return (
    <section className="ed-bento" aria-label="Por qué AT Beauty Studio">
      <div className="ed-wrap">
        {cells.map(({ cls, kicker, title, body, icon }, i) => (
          <motion.div key={i} className={`ed-bento-cell ${cls}`}
            initial={animated ? { opacity: 0, y: 32 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: .15 }}
            transition={{ duration: .6, delay: i * .07, ease: [.22, .76, .22, 1] }}>
            <p className="ed-kicker">{kicker}</p>
            <h3>{title}</h3>
            {body && <p>{body}</p>}
            <span className="ed-bento-icon" aria-hidden>{icon}</span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ── Scroll-driven horizontal carousel ──────────── */
function ScrollCarousel({ animated }: { animated: boolean }) {
  const outerRef  = useRef<HTMLElement>(null)
  const trackRef  = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  /* Smooth the raw progress */
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 22, restDelta: .0005 })

  /* How many extra slides beyond first */
  const count = CATEGORIES.length          // 5
  const extra = count - 1                  // 4

  /* Translate the track in %: each slide = 100vw */
  const xPct = useTransform(smooth, [0, 1], ['0%', `-${extra * 100}%`])

  /* Active index for dots / caption */
  useMotionValueEvent(scrollYProgress, 'change', v => {
    setActive(Math.min(extra, Math.round(v * extra)))
  })

  /* Parallax depth per slide — each image slightly shifts */
  const imgParallax = useTransform(smooth, [0, 1], ['0%', `${extra * 8}%`])

  return (
    <section
      ref={outerRef}
      className="ed-scroll-carousel-outer"
      aria-label="Galería de servicios"
      /* Height = 100vh per slide so scroll drives the whole journey */
      style={{ height: `${count * 100}svh` }}
    >
      {/* ── Sticky viewport ───────────────────── */}
      <div className="ed-scroll-carousel-sticky">

        {/* Top label */}
        <div className="ed-sc-header">
          <p className="ed-kicker">Nuestros servicios</p>
          <span className="ed-sc-counter" aria-live="polite" aria-atomic>
            <em>{String(active + 1).padStart(2, '0')}</em>
            <span>/</span>
            {String(count).padStart(2, '0')}
          </span>
        </div>

        {/* ── Track ─────────────────────────── */}
        <motion.div
          ref={trackRef}
          className="ed-sc-track"
          style={animated ? { x: xPct } : undefined}
          aria-label="Diapositivas de servicios"
        >
          {CATEGORIES.map(({ name, photo, alt, heading }, i) => (
            <div
              key={name}
              className="ed-sc-slide"
              aria-label={`${i + 1} de ${count}: ${name}`}
              data-active={active === i}
            >
              {/* Full-bleed image */}
              <div className="ed-sc-img-wrap">
                <motion.img
                  src={`${IMG}${photo}.webp`}
                  alt={alt}
                  width="1280" height="853"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="ed-sc-img"
                  style={animated ? { x: imgParallax } : undefined}
                />
                <div className="ed-sc-img-overlay" aria-hidden/>
              </div>

              {/* Slide copy */}
              <div className="ed-sc-copy">
                <p className="ed-sc-index" aria-hidden>{String(i + 1).padStart(2, '0')}</p>
                <h2 className="ed-sc-heading">{heading.split('\n').join(' ')}</h2>
                <p className="ed-sc-name">{name}</p>
                <Link
                  className="ed-sc-cta"
                  to={RESERVATION}
                  tabIndex={active === i ? 0 : -1}
                >
                  Reservar
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Progress dots ─────────────────── */}
        <div className="ed-sc-dots" role="tablist" aria-label="Ir a diapositiva">
          {CATEGORIES.map(({ name }, i) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={name}
              className="ed-sc-dot"
              data-active={active === i}
            />
          ))}
        </div>

        {/* ── Scroll hint (first slide only) ── */}
        {active === 0 && (
          <motion.p
            className="ed-sc-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
          >
            Desliza para explorar
          </motion.p>
        )}
      </div>
    </section>
  )
}

/* ── Visit scene ─────────────────────────────── */
function VisitScene({ animated }: { animated: boolean }) {
  const [step, setStep] = useState(0)
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])
  const story    = useRef<HTMLOListElement>(null)
  const chapterId = useId()
  const { scrollYProgress } = useScroll({ target: story, offset: ['start center', 'end center'] })

  useMotionValueEvent(scrollYProgress, 'change', v => {
    setStep(Math.min(CHAPTERS.length - 1, Math.floor(v * CHAPTERS.length)))
  })

  return (
    <section className="ed-scene" id="tu-visita" aria-labelledby="ed-visit-title">
      <div className="ed-wrap">
        <SectionHeading id="ed-visit-title" label="Tu visita" animated={animated} light>
          Un rato <em>para ti.</em>
        </SectionHeading>

        <div className="ed-scene-grid" data-editorial-scene data-active-step={step}>
          {/* Sticky visual panel */}
          <div className="ed-sticky-panel">
            <div className="ed-scene-frame" aria-hidden>
              <div className="ed-scene-layer">
                <img src={IMG + 'ritual-900.webp'}
                  srcSet={IMG + 'ritual-480.webp 480w, ' + IMG + 'ritual-900.webp 900w, ' + IMG + 'ritual-1280.webp 1280w'}
                  sizes="(max-width: 720px) 92vw, 52vw"
                  alt="" width="900" height="600" loading="lazy" decoding="async"/>
              </div>
              <div className="ed-scene-layer">
                <img src={IMG + 'mesa.webp'} alt="" width="590" height="570" loading="lazy" decoding="async"/>
              </div>
              <div className="ed-scene-layer">
                <img src={IMG + 'manos.webp'} alt="" width="530" height="630" loading="lazy" decoding="async"/>
              </div>
            </div>

            {/* Step indicators */}
            <div className="ed-scene-nav" aria-label="Pasos de tu visita">
              {CHAPTERS.map(({ title }, i) => (
                <button key={title} type="button" className="ed-scene-nav-btn"
                  aria-current={step === i ? 'step' : undefined}
                  aria-label={title}
                  aria-controls={chapterId + '-' + i}
                  onClick={() => {
                    setStep(i)
                    stepRefs.current[i]?.scrollIntoView({ behavior: animated ? 'smooth' : 'instant', block: 'center' })
                  }}>
                  <span/>
                  <small>0{i + 1}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Chapter list */}
          <ol className="ed-chapters" aria-label="Pasos para reservar" ref={story}>
            {CHAPTERS.map(({ title, description }, i) => (
              <li key={title} id={chapterId + '-' + i} className="ed-chapter"
                ref={el => { stepRefs.current[i] = el }}
                data-current={step === i}>
                <div className="ed-chapter-inner">
                  <span className="ed-chapter-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ── CTA section ─────────────────────────────── */
function CtaSection({ animated }: { animated: boolean }) {
  return (
    <section className="ed-cta" aria-labelledby="ed-cta-title">
      <div className="ed-cta-wrap ed-wrap">
        <p className="ed-kicker" style={{ justifyContent: 'center' }}>Agenda ahora</p>
        <motion.h2 id="ed-cta-title"
          initial={animated ? { opacity: 0, y: 32 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .3 }}
          transition={{ duration: .75, ease: [.22, .76, .22, 1] }}>
          Agenda <em>tu visita.</em>
        </motion.h2>
        <motion.div
          initial={animated ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .3 }}
          transition={{ duration: .7, delay: .18, ease: [.22, .76, .22, 1] }}>
          <Link className="ed-button" to={RESERVATION}>Ver horarios disponibles</Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ── Footer ──────────────────────────────────── */
function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="ed-footer">
      <div className="ed-wrap ed-footer-inner">
        <Wordmark/>
        <nav className="ed-footer-nav" aria-label="Pie de página">
          <a className="ed-underline" href="#servicios">Servicios</a>
          <a className="ed-underline" href="#tu-visita">Tu visita</a>
          <Link className="ed-underline" to={signedIn ? '/app' : '/login'}>Mi cuenta</Link>
        </nav>
        <small>© {new Date().getFullYear()} AT Beauty Studio</small>
      </div>
    </footer>
  )
}

/* ══════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════ */
export default function Landing() {
  const root = useRef<HTMLDivElement>(null)
  const { session } = useAuth()
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()

  const [preference, setPreference] = useState<'full' | 'reduced' | null>(() => {
    if (new URLSearchParams(window.location.search).get('movimiento') === 'activo') return 'full'
    try {
      const saved = sessionStorage.getItem('at-beauty-movement')
      return saved === 'full' || saved === 'reduced' ? saved : null
    } catch { return null }
  })

  const animated = preference ? preference === 'full' : !reduced

  function toggleMotion() {
    const next = animated ? 'reduced' : 'full'
    setPreference(next)
    try { sessionStorage.setItem('at-beauty-movement', next) } catch { /* noop */ }
    if (new URLSearchParams(window.location.search).has('movimiento')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('movimiento')
      window.history.replaceState(window.history.state, '', url)
    }
  }

  /* Mount GSAP scroll effects */
  useEffect(() => {
    const el = root.current
    if (!el || !animated) return
    let alive = true
    let cleanup: (() => void) | undefined
    void import('@/features/landing-scroll')
      .then(m => { if (alive) cleanup = m.mountLandingScroll(el) })
      .catch(() => undefined)
    return () => { alive = false; cleanup?.() }
  }, [animated])

  return (
    <MotionConfig reducedMotion={animated ? 'never' : 'always'}>
      <div className="ed-landing" ref={root} data-motion={animated ? 'full' : 'reduced'}>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>

        {/* Scroll progress bar */}
        <motion.div className="ed-progress" style={{ scaleX: scrollYProgress }} aria-hidden/>

        {/* Desktop cursor glow */}
        {animated && <CursorGlow/>}

        <Header signedIn={!!session}/>

        <main id="contenido" tabIndex={-1}>
          <Hero animated={animated} onMotionChange={toggleMotion}/>
          <Marquee/>
          <ScrollCarousel animated={animated}/>
          <VisitScene animated={animated}/>
          <Bento animated={animated}/>
          <Services animated={animated}/>
          <CtaSection animated={animated}/>
        </main>

        <Footer signedIn={!!session}/>
      </div>
    </MotionConfig>
  )
}
