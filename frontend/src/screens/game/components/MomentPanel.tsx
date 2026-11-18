import type { ReactNode } from 'react'
import { Avatar } from '../../../components/Avatar.tsx'
import type { Player, Song } from '../../../components/types.ts'

interface MomentPanelProps {
  /** What the panel is about, for screen readers: "Your move", "Challenge". */
  label: string
  className?: string
  children: ReactNode
}

/** The centre panel of the game's top band. It holds exactly one decision at a time. */
export function MomentPanel({ label, className, children }: MomentPanelProps) {
  return (
    <section
      className={['jm-panel', 'jm-moment', className].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {children}
    </section>
  )
}

interface MomentHeadProps {
  /** The small caps line: "Challenge", "Challengers guess". */
  label: string
  /** One line with names and years: "Mara says 1994 to 2008. Is that right?" */
  headline: ReactNode
  /** The countdown ring, top right. */
  ring?: ReactNode
}

export function MomentHead({ label, headline, ring }: MomentHeadProps) {
  return (
    <div className="jm-moment__head">
      <div>
        <span className="jm-label">{label}</span>
        <h1 className="jm-moment__headline">{headline}</h1>
      </div>
      {ring}
    </div>
  )
}

interface PlayerCellProps {
  player: Player
  /** The one acting right now: mustard, like their pick on the board. */
  now?: boolean
  /** Replaces the plain name: "2 · Sam". */
  name?: ReactNode
  className?: string
  /** Their own buttons, or a status. */
  children?: ReactNode
}

/** A player's row in the panel. The host enters choices on each player's own row. */
export function PlayerCell({ player, now, name, className, children }: PlayerCellProps) {
  const classes = ['jm-player', now && 'jm-player--now', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <Avatar player={player} />
      <span className="jm-player__name">{name ?? player.name}</span>
      {children}
    </div>
  )
}

interface SongResultProps {
  song: Song
  /** Whose libraries it came from; may be empty. */
  from: Player[]
  /** Where the year came from. */
  source: string
}

/** The revealed song on the left of the result: title, artist and library credit (no year). */
export function SongResult({ song, from, source }: SongResultProps) {
  return (
    <div className="jm-song">
      <span className="jm-label">The song</span>
      <span className="jm-song__title">{song.title}</span>
      <span className="jm-song__artist">{song.artist}</span>
      <span className="jm-song__library">
        {from.slice(0, 3).map((player) => (
          <Avatar key={player.id} player={player} />
        ))}
        <span>
          {from.length > 0 && <>From {libraries(from)}</>}
          <small>{source}</small>
        </span>
      </span>
    </div>
  )
}

/** "Jonas's library", "Jonas's and Sam's libraries". */
function libraries(players: Player[]): string {
  const names = players.map((player) => `${player.name}'s`)
  if (names.length === 1) return `${names[0]} library`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} libraries`
}
