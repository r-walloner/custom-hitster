import { useSyncExternalStore } from 'react'

// The same condition as the hover styles: a mouse or trackpad, not a touch screen.
const MOUSE_QUERY = '(hover: hover) and (pointer: fine)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOUSE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(MOUSE_QUERY).matches

/**
 * The verb for pressing something, for button text like "Tap again to …": "Click" with a mouse or
 * trackpad, "Tap" on a touch screen. Capitalised; lower-case it mid-sentence.
 */
export function useTapWord(): 'Tap' | 'Click' {
  return useSyncExternalStore(subscribe, getSnapshot) ? 'Click' : 'Tap'
}
