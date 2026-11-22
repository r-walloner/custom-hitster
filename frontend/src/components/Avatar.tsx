import { useState, type CSSProperties } from 'react'
import type { Player } from './types.ts'

const SIZES = { sm: 'jm-avatar--sm', md: '', lg: 'app-avatar--lg', xl: 'app-avatar--xl' }

interface AvatarProps {
  player: Pick<Player, 'name' | 'color' | 'image'>
  /** sm 22px, md 24px (the default), lg 28px, xl 44px. In player cells and rows the class sizes it. */
  size?: keyof typeof SIZES
  /** Reconnecting: a dashed outline, never a colour change. */
  away?: boolean
}

/**
 * A player's Spotify picture, or else their colour with their initial. Player colours never
 * appear without a name or initial.
 */
export function Avatar({ player, size = 'md', away }: AvatarProps) {
  // A picture that failed to load (expired, removed) falls back to the initial.
  const [broken, setBroken] = useState<string | null>(null)
  const photo = player.image && player.image !== broken ? player.image : null
  const classes = [
    'jm-avatar',
    photo ? 'app-avatar--photo' : `jm-p${player.color}`,
    SIZES[size],
    away && 'app-avatar--away',
  ]
  return (
    <span className={classes.filter(Boolean).join(' ')} aria-hidden="true">
      {photo ? (
        <img
          className="app-avatar__photo"
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(photo)}
        />
      ) : (
        player.name.charAt(0).toUpperCase()
      )}
    </span>
  )
}

interface RingProps {
  /** How much of the time is gone, 0–100. */
  percent: number
  seconds: number
  label: string
  small?: boolean
}

/** The one countdown style: a filling ring with the seconds left in the middle. */
export function Ring({ percent, seconds, label, small }: RingProps) {
  return (
    <div
      className={small ? 'jm-ring app-ring--sm' : 'jm-ring'}
      style={{ '--p': percent } as CSSProperties}
      role="timer"
      aria-label={label}
    >
      <span>{seconds}</span>
    </div>
  )
}
