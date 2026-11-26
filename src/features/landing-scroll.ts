import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

export function mountLandingScroll(root: HTMLElement) {
  const scene = root.querySelector<HTMLElement>('[data-editorial-scene]')
  if (!scene) return () => undefined

  gsap.registerPlugin(ScrollTrigger)
  const ctx = gsap.context(() => {}, root)
  const media = gsap.matchMedia(root)

  /* ── Scene image crossfade + parallax ── */
  media.add('all', () => {
    const layers  = [...scene.querySelectorAll<HTMLElement>('.ed-scene-layer')]
    const photos  = layers.map(l => l.querySelector('img'))
    const chapters = scene.querySelector('.ed-chapters')
    if (!chapters || layers.length !== 3 || photos.some(p => !p)) return

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: chapters, start: 'top center', end: 'bottom center', scrub: 0.3 },
    })
    tl.fromTo(photos[0], { scale: 1.04, yPercent: -2 }, { scale: 1.22, yPercent: 7,  duration: 1.2 }, 0)
    tl.fromTo(layers[1], { autoAlpha: 0, xPercent: 18 }, { autoAlpha: 1, xPercent: 0, duration: 0.42 }, 0.78)
    tl.fromTo(photos[1], { scale: 1.24, yPercent:  5 }, { scale: 1.05, yPercent: -2, duration: 1.4 }, 0.78)
    tl.fromTo(layers[2], { autoAlpha: 0, xPercent:-18 }, { autoAlpha: 1, xPercent: 0, duration: 0.42 }, 1.78)
    tl.fromTo(photos[2], { scale: 1.1,  yPercent: -2 }, { scale: 1.22, yPercent: 6,  duration: 1.24 }, 1.78)
  })

  /* ── Hero parallax depth layers ── */
  media.add('(min-width: 1001px)', () => {
    const heroStage = root.querySelector<HTMLElement>('.ed-hero-stage')
    if (!heroStage) return

    // Parallax depth on hero background overlay
    const overlay = heroStage.querySelector<HTMLElement>('.ed-hero-bg-overlay')
    if (overlay) {
      ScrollTrigger.create({
        trigger: heroStage,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate: self => {
          gsap.set(overlay, { y: self.progress * -60 })
        },
      })
    }
  })

  /* ── Bento cells stagger reveal ── */
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const cells = [...root.querySelectorAll<HTMLElement>('.ed-bento-cell')]
    if (!cells.length) return
    // Let motion/react handle the whileInView, but add a subtle float on hover
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        gsap.to(cell, { y: -5, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
      })
      cell.addEventListener('mouseleave', () => {
        gsap.to(cell, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)', overwrite: 'auto' })
      })
    })
  })

  /* ── Smooth scroll (Lenis) for desktop pointer devices ── */
  media.add('(min-width: 1024px) and (pointer: fine)', () => {
    const lenis = new Lenis({
      duration: 0.95,
      anchors: false,
      prevent: node => node instanceof HTMLElement && node.closest('[role="dialog"]') !== null,
    })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  })

  return () => { ctx.revert(); media.revert() }
}
