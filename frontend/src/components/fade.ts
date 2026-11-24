import type { CSSProperties } from 'react'

// Fading things in as they appear, one after another. The `app-fade-in` rules are in app.css,
// with the default length of a fade, 400 ms.

/** How far apart things that fade in one after another start. */
export const FADE_STAGGER_MS = 75

/** The class that fades an element in when it appears. */
export const FADE_IN = 'app-fade-in'

/** The style that holds that fade back by `delay` milliseconds, and makes it `duration` long. */
export const fadeDelay = (delay: number, duration?: number): CSSProperties => ({
  animationDelay: `${delay}ms`,
  ...(duration !== undefined && { animationDuration: `${duration}ms` }),
})
