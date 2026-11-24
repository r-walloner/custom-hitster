import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  bounds,
  desktopZoom,
  drawAll,
  IGNORED_FRAME_MS,
  nextQuality,
  smoothFrame,
  spawn,
  step,
} from './confetti.ts'
import type { Piece, Point, Preset } from './confetti.ts'
import { ConfettiContext } from './useConfetti.ts'
import type { ConfettiApi } from './useConfetti.ts'
import { measureFrame } from './useDesktop.ts'

/** Enough for a frantic drag plus a few bursts, few enough for an old phone. */
const MAX_PIECES = 700
/** Device pixels per CSS pixel at most: a 3× phone draws at 1.75×, which flat paper with no
    outline doesn't show. Fewer pixels to fill and clear every frame. */
const MAX_RATIO = 1.75
const REDUCED = '(prefers-reduced-motion: reduce)'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches)
  useEffect(() => {
    const query = window.matchMedia(REDUCED)
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * One canvas over the whole app that confetti is drawn on, outside `AppFrame`'s zoom so it can
 * reach every corner; it never catches a tap. Pieces are simulated in design pixels and drawn at
 * the frame's zoom, so they're the size of the UI on a phone; on desktop at `desktopZoom`, larger,
 * so they show on a big screen. The loop runs only while pieces are in the air.
 */
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pieces = useRef<Piece[]>([])
  const frame = useRef<number | null>(null)
  // The last frame's time, for the step between frames.
  const last = useRef(0)
  // Frame times while confetti flies, and the share of pieces new bursts get because of them.
  // Both outlive a burst: a device that was slow stays thin until it shows it can keep up.
  const frameMs = useRef(1000 / 60)
  const quality = useRef(1)
  // The loop's first frame comes part-way through a frame, so it isn't measured.
  const fresh = useRef(true)
  const reduced = useReducedMotion()
  // Canvas pixels per design pixel, and CSS pixels per design pixel; kept up to date by `fit`.
  const view = useRef({ scale: 1, zoom: 1 })
  // The part of the canvas drawn on last frame, in canvas pixels: all that needs clearing.
  const dirty = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  // Pieces in the air when reduced motion is switched on just go.
  useEffect(() => {
    if (reduced) pieces.current = []
  }, [reduced])

  // Keep the canvas the size of the viewport, at the capped pixel ratio.
  useEffect(() => {
    const fit = () => {
      const element = canvas.current
      if (!element) return
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO)
      const layout = measureFrame()
      const zoom = layout.desktop ? desktopZoom(window.innerWidth, window.innerHeight) : layout.zoom
      element.width = Math.round(window.innerWidth * ratio)
      element.height = Math.round(window.innerHeight * ratio)
      view.current = { scale: ratio * zoom, zoom }
      // Resizing the canvas cleared it.
      dirty.current = null
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const api = useMemo<ConfettiApi>(() => {
    // Colours come from the tokens, so the confetti follows tokens.css.
    const colours = new Map<string, string>()
    const resolve = (color: string) => {
      if (!color.startsWith('--')) return color
      let value = colours.get(color)
      if (value === undefined) {
        value = getComputedStyle(document.documentElement).getPropertyValue(color).trim() || '#888'
        colours.set(color, value)
      }
      return value
    }

    const tick = (time: number) => {
      const element = canvas.current
      const ctx = element?.getContext('2d')
      if (!element || !ctx) {
        frame.current = null
        return
      }
      const ms = time - last.current
      last.current = time
      if (!fresh.current && ms < IGNORED_FRAME_MS) {
        frameMs.current = smoothFrame(frameMs.current, ms)
        quality.current = nextQuality(quality.current, frameMs.current)
      }
      fresh.current = false
      const dt = Math.min(0.05, ms / 1000)
      pieces.current = step(pieces.current, dt)
      const { scale } = view.current
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const old = dirty.current
      if (old) ctx.clearRect(old.x, old.y, old.w, old.h)
      else ctx.clearRect(0, 0, element.width, element.height)
      const box = bounds(pieces.current)
      dirty.current = box && {
        x: Math.floor(box.left * scale),
        y: Math.floor(box.top * scale),
        w: Math.ceil((box.right - box.left) * scale) + 1,
        h: Math.ceil((box.bottom - box.top) * scale) + 1,
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      drawAll(ctx, pieces.current)
      frame.current = pieces.current.length > 0 ? requestAnimationFrame(tick) : null
    }

    return {
      enabled: !reduced,
      count: () => pieces.current.length,
      quality: () => quality.current,
      burst: (at: Point, preset: Preset) => {
        if (reduced) return
        const { zoom } = view.current
        const design = (point: Point) => ({ x: point.x / zoom, y: point.y / zoom })
        const made = spawn(
          {
            ...preset,
            count: Math.max(1, Math.round(preset.count * quality.current)),
            target: preset.target && design(preset.target),
          },
          design(at),
          resolve,
        )
        // Over the cap, the oldest pieces make room.
        pieces.current = [...pieces.current, ...made].slice(-MAX_PIECES)
        if (frame.current === null) {
          last.current = performance.now()
          fresh.current = true
          frame.current = requestAnimationFrame(tick)
        }
      },
    }
  }, [reduced])

  return (
    <ConfettiContext value={api}>
      {children}
      {createPortal(
        <canvas ref={canvas} className="app-confetti" aria-hidden="true" />,
        document.body,
      )}
    </ConfettiContext>
  )
}
