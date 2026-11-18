import type { ReactNode } from 'react'
import type { Song } from '../types.ts'
import { PickCard, SongCard } from './SongCard.tsx'
import { Tape } from './TapePlayer.tsx'

export interface FloatingCard {
  /** A real song; left out for the yellow `????` pick. */
  song?: Song
  /** The card that won it (winner screen). */
  isNew?: boolean
  left: number
  top: number
  /** Degrees. Covers are the one place tilt is free: −15° to +17°. */
  rotate: number
  scale: number
  /** Seconds; negative starts the drift part-way, so the cards never move together. */
  delay: number
  duration?: number
  /** In front of the tape. */
  front?: boolean
}

interface CoverArtProps {
  tape: { left: number; top: number; width: number; progress: number; year?: number }
  cards: FloatingCard[]
  className?: string
  /** Text placed in the art box (the Home logo and slogan). */
  children?: ReactNode
}

/** The cover art on Home, the sign-in error and the winner: a slow-bobbing tape with drifting cards. */
export function CoverArt({ tape, cards, className, children }: CoverArtProps) {
  return (
    <div className={['jm-hero', className].filter(Boolean).join(' ')}>
      {children}
      {cards.map((card, index) => (
        <div
          key={index}
          className="jm-float app-hero__float"
          aria-hidden="true"
          style={{
            left: card.left,
            top: card.top,
            zIndex: card.front ? 3 : undefined,
            animationDelay: `${card.delay}s`,
            animationDuration: card.duration ? `${card.duration}s` : undefined,
          }}
        >
          {card.song ? (
            <SongCard
              song={card.song}
              isNew={card.isNew}
              style={{ transform: `rotate(${card.rotate}deg) scale(${card.scale})` }}
            />
          ) : (
            <PickCard style={{ transform: `rotate(${card.rotate}deg) scale(${card.scale})` }} />
          )}
        </div>
      ))}
      <Tape
        decorative
        slow
        progress={tape.progress}
        year={tape.year}
        width={tape.width}
        className="app-hero__tape"
        style={{ left: tape.left, top: tape.top }}
      />
    </div>
  )
}
