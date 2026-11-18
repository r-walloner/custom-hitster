import { useEffect, useState } from 'react'
import { Ring } from './Avatar.tsx'

interface CountdownProps {
  /** Time left as the server last said. Remount (change the key) whenever it sends a new value. */
  ms: number
  /** The whole span, for how far the ring has filled. */
  total: number
  /** Says the time left in words, for screen readers. */
  label: (seconds: number) => string
  small?: boolean
}

/** The filling ring, counting down by itself between the server's updates. */
export function Countdown({ ms, total, label, small }: CountdownProps) {
  const [deadline] = useState(() => Date.now() + ms)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [])
  const left = Math.max(0, deadline - now)
  const seconds = Math.ceil(left / 1000)
  const percent = total > 0 ? Math.min(100, Math.max(0, 100 * (1 - left / total))) : 100
  return <Ring percent={percent} seconds={seconds} small={small} label={label(seconds)} />
}
