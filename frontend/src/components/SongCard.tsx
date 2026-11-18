import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import type { Song } from './types.ts'

interface SongCardProps {
  song: Song
  /** The card just won: tinted, with the large sticker shadow. */
  isNew?: boolean
  /** A ✓ or ✕ mark after the reveal. */
  mark?: ReactNode
  className?: string
  style?: CSSProperties
}

/** A revealed song: the year (always the largest thing), the title, the artist. */
export function SongCard({ song, isNew, mark, className, style }: SongCardProps) {
  const classes = ['jm-card', isNew && 'jm-card--new', className].filter(Boolean).join(' ')
  return (
    <div className={classes} style={style}>
      <span className="jm-card__year">{song.year}</span>
      <span className="jm-card__title">{song.title}</span>
      <span className="jm-card__artist">{song.artist}</span>
      {mark}
    </div>
  )
}

interface PickCardProps {
  /** Whose pick; left out on covers. */
  name?: string
  /** Locked in: tinted instead of mustard. */
  done?: boolean
  className?: string
  style?: CSSProperties
}

/** A pick: the yellow, tilted `????` card. Every pick looks the same, whoever made it. */
export function PickCard({ name, done, className, style }: PickCardProps) {
  const classes = ['jm-card', 'jm-card--mystery', done && 'jm-card--pick-done', className]
  return (
    <div className={classes.filter(Boolean).join(' ')} style={style}>
      <span className="jm-card__year">????</span>
      {name && <span className="jm-card__title">{name}'s pick</span>}
    </div>
  )
}

/** The dashed + between cards. Its tap area reaches past the dashes. */
export function Gap({
  label,
  onClick,
  pressed,
}: {
  label: string
  onClick?: () => void
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      className="jm-gap"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
    >
      <Icon name="plus" />
    </button>
  )
}

interface MarkProps {
  right: boolean
  /** On the card's left edge: a guess for the gap before the first card. */
  before?: boolean
  initial: string
  /** In words: "Jonas guessed between 1975 and 1994: wrong". */
  label: string
}

/** ✓ or ✕ with an initial, on a card after the reveal. Never colour alone. */
export function Mark({ right, before, initial, label }: MarkProps) {
  const classes = ['jm-mark', right ? 'jm-mark--right' : 'jm-mark--wrong', before && 'app-mark--before']
  return (
    <span
      className={classes.filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    >
      <Icon name={right ? 'check' : 'pass'} strokeWidth={3.4} />
      {initial}
    </span>
  )
}

/** The verdict pill: *Right*, *Sound works*, *No sound*, a sign-in error's tag. */
export function Verdict({ right, children }: { right: boolean; children: ReactNode }) {
  return (
    <span className={right ? 'jm-verdict' : 'jm-verdict jm-verdict--wrong'}>
      <Icon name={right ? 'check' : 'pass'} strokeWidth={3.2} />
      {children}
    </span>
  )
}
