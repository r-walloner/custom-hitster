import { useSyncExternalStore } from 'react'

/**
 * How Jamster gets rid of the browser's bar here: a button that makes the page full screen
 * (Android), or, where no page can (the iPhone), the steps to add it to the home screen.
 */
export type FullScreenOffer = 'button' | 'install'

const installed =
  window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
const ios =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
// Phones and tablets only: a computer has room to spare.
const touch = window.matchMedia('(pointer: coarse)').matches
const canFullScreen = document.fullscreenEnabled === true

// "Not now" lasts until the app next leaves full screen, or the page loads again.
let dismissed = false
const listeners = new Set<() => void>()

function current(): FullScreenOffer | null {
  if (installed || !touch || dismissed || document.fullscreenElement) return null
  if (canFullScreen) return 'button'
  return ios ? 'install' : null
}

let offer = current()

function update() {
  offer = current()
  listeners.forEach((listener) => listener())
}

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) dismissed = false
  update()
})

function dismiss() {
  dismissed = true
  update()
}

async function enter() {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    // Turns the game sideways even on a phone held upright; not every browser can.
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (to: 'landscape') => Promise<void>
    }
    await orientation.lock?.('landscape')
  } catch {
    // Refused: the pop-up stays up, and the browser's bar too.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * The offer to play without the browser's bar. `offer` is null when Jamster is already full screen
 * or installed, on a computer, put off with "Not now", or the browser can do neither.
 */
export function useFullScreen(): {
  offer: FullScreenOffer | null
  enter: () => void
  dismiss: () => void
} {
  const value = useSyncExternalStore(subscribe, () => offer)
  return { offer: value, enter: () => void enter(), dismiss }
}
