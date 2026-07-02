'use client'

/**
 * Full-bleed interactive dot field for the authenticated canvas.
 * Tracks pointer via window events so white panels don't block the effect.
 */
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const SPRING_CONFIG = { stiffness: 280, damping: 32, mass: 0.5 }

type Dot = {
  id: string
  baseX: number
  baseY: number
  opacity: number
}

function generateDots(width: number, height: number, spacing: number): Dot[] {
  const dots: Dot[] = []
  const cols = Math.ceil(width / spacing)
  const rows = Math.ceil(height / spacing)
  const centerX = width / 2
  const centerY = height / 2
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const x = col * spacing
      const y = row * spacing
      const dx = x - centerX
      const dy = y - centerY
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy)
      const edgeFactor = Math.min(distanceFromCenter / (maxDistance * 0.8), 1)
      if (Math.random() > edgeFactor * 0.7) continue

      dots.push({
        id: `dot-${row}-${col}`,
        baseX: x,
        baseY: y,
        opacity: 0.22 + edgeFactor * 0.38,
      })
    }
  }

  return dots
}

function CanvasDot({
  dot,
  dotSize,
  mouseX,
  mouseY,
  repulsionRadius,
  repulsionStrength,
}: {
  dot: Dot
  dotSize: number
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
  repulsionRadius: number
  repulsionStrength: number
}) {
  const repel = (mx: number, my: number, axis: 'x' | 'y') => {
    if (!Number.isFinite(mx) || !Number.isFinite(my)) return 0
    const dx = dot.baseX - mx
    const dy = dot.baseY - my
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance >= repulsionRadius) return 0
    const force = (1 - distance / repulsionRadius) * repulsionStrength
    const angle = Math.atan2(dy, dx)
    return axis === 'x' ? Math.cos(angle) * force : Math.sin(angle) * force
  }

  const posX = useTransform([mouseX, mouseY], () => repel(mouseX.get(), mouseY.get(), 'x'))
  const posY = useTransform([mouseX, mouseY], () => repel(mouseX.get(), mouseY.get(), 'y'))
  const x = useSpring(posX, SPRING_CONFIG)
  const y = useSpring(posY, SPRING_CONFIG)

  return (
    <motion.div
      className="absolute rounded-full bg-slate-400/55 will-change-transform"
      style={{
        width: dotSize,
        height: dotSize,
        left: dot.baseX,
        top: dot.baseY,
        opacity: dot.opacity,
        x,
        y,
      }}
    />
  )
}

export default function AppCanvasMouseBackdrop() {
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY)
  const mouseY = useMotionValue(Number.POSITIVE_INFINITY)
  const [dots, setDots] = useState<Dot[]>([])

  useEffect(() => {
    if (reduceMotion) return

    const updateDots = () => {
      const el = containerRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      if (width < 1 || height < 1) return
      setDots(generateDots(width, height, 20))
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const updateDotsDebounced = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(updateDots, 200)
    }

    updateDots()
    const observer = new ResizeObserver(updateDotsDebounced)
    const el = containerRef.current
    if (el) observer.observe(el)
    window.addEventListener('resize', updateDotsDebounced)

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      observer.disconnect()
      window.removeEventListener('resize', updateDotsDebounced)
    }
  }, [reduceMotion])

  useEffect(() => {
    if (reduceMotion) return

    const handleMove = (event: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      if (!inside) {
        mouseX.set(Number.POSITIVE_INFINITY)
        mouseY.set(Number.POSITIVE_INFINITY)
        return
      }
      mouseX.set(event.clientX - rect.left)
      mouseY.set(event.clientY - rect.top)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [mouseX, mouseY, reduceMotion])

  if (reduceMotion) {
    return <div aria-hidden className="app-canvas-dots pointer-events-none absolute inset-0 z-0" />
  }

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {dots.map((dot) => (
        <CanvasDot
          key={dot.id}
          dot={dot}
          dotSize={2.25}
          mouseX={mouseX}
          mouseY={mouseY}
          repulsionRadius={110}
          repulsionStrength={20}
        />
      ))}
    </div>
  )
}
