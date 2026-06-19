'use client'

import { useEffect, useRef } from 'react'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

interface SpaceFlightProps {
  /** Кол-во звёзд (по умолчанию подбирается от площади экрана) */
  starCount?: number
  /** Скорость полёта */
  speed?: number
  /** Длина следов (warp). 0 — точки, 1 — длинные хвосты */
  warp?: number
}

interface Star {
  x: number
  y: number
  z: number
  pz: number
  color: string
}

const readPalette = (): string[] => {
  const styles = getComputedStyle(document.documentElement)
  const get = (v: string, fallback: string) =>
    styles.getPropertyValue(v).trim() || fallback
  return [
    get('--color-glow-primary', '#3B82F6'),
    get('--color-glow-secondary', '#44A5DF'),
    get('--color-glow-tertiary', '#06B6D4'),
    '#ffffff',
  ]
}

export const SpaceFlight = ({
  starCount,
  speed = 0.6,
  warp = 0.75,
}: SpaceFlightProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useUIStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const isDark = theme === 'dark'
    const palette = readPalette()

    let width = 0
    let height = 0
    let cx = 0
    let cy = 0
    let dpr = 1
    let stars: Star[] = []
    let raf = 0

    const FOCAL = 320 // фокусное расстояние проекции

    const makeStar = (initial = false): Star => {
      const z = initial ? Math.random() * width : width
      return {
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z,
        pz: z,
        color: palette[(Math.random() * palette.length) | 0],
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      cx = width / 2
      cy = height / 2
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count =
        starCount ?? Math.min(900, Math.round((width * height) / 1600))
      stars = Array.from({ length: count }, () => makeStar(true))
    }

    const step = () => {
      // Шлейф: полупрозрачная заливка фоном вместо clear → следы звёзд
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = isDark
        ? `rgba(9, 9, 11, ${0.25 + (1 - warp) * 0.5})`
        : `rgba(248, 250, 252, ${0.3 + (1 - warp) * 0.5})`
      ctx.fillRect(0, 0, width, height)

      ctx.globalCompositeOperation = isDark ? 'lighter' : 'source-over'

      for (const s of stars) {
        s.pz = s.z
        s.z -= speed * 6

        if (s.z <= 1) {
          Object.assign(s, makeStar(false))
          s.pz = s.z
          continue
        }

        const sx = cx + (s.x / s.z) * FOCAL
        const sy = cy + (s.y / s.z) * FOCAL
        const px = cx + (s.x / s.pz) * FOCAL
        const py = cy + (s.y / s.pz) * FOCAL

        if (sx < 0 || sx > width || sy < 0 || sy > height) continue

        // Чем ближе звезда (меньше z) — тем больше и ярче
        const depth = 1 - s.z / width
        const size = depth * 2.4 + 0.3
        const alpha = Math.min(1, depth * 1.4)

        ctx.strokeStyle = s.color
        ctx.globalAlpha = alpha
        ctx.lineWidth = size
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(sx, sy)
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(step)
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReduced) {
      // Статичный кадр без анимации
      ctx.fillStyle = isDark ? '#09090b' : '#f8fafc'
      ctx.fillRect(0, 0, width, height)
    } else {
      raf = requestAnimationFrame(step)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [theme, starCount, speed, warp])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  )
}
