import type { ReactNode } from 'react'
import { Avatar } from '../../../components/Avatar.tsx'
import { Icon } from '../../../components/Icon.tsx'
import type { Player, Song } from '../../../components/types.ts'
import { names } from '../../../words.ts'
import './MomentPanel.css'

interface MomentPanelProps {
  /** The phase name in the top-left corner, the same place in every phase: "Guess", "Challenge". */
  phase: string
  /** What the panel is about, for screen readers, when it says more than the phase: "Your move". */
  label?: string
  /** The countdown ring, pinned to the top-right corner; the first block under the phase name
      keeps clear of it. */
  ring?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * The centre panel of the game's top band. It holds exactly one decision at a time. It draws
 * the phase name and the ring itself, so they sit in the same place whatever the phase shows.
 */
export function MomentPanel({ phase, label, ring, className, children }: MomentPanelProps) {
  const classes = ['jm-panel', 'jm-moment', 'game__moment', ring && 'game__moment--ring', className]
  return (
    <section className={classes.filter(Boolean).join(' ')} aria-label={label ?? phase}>
      <span className="jm-label game__moment-phase">{phase}</span>
      {ring && <div className="game__moment-ring">{ring}</div>}
      {children}
    </section>
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
  /** The album cover (Spotify's, about 300 px), or null for none. */
  cover: string | null
  /** Whose libraries it came from; may be empty. */
  from: Player[]
}

/** The revealed song: its cover, then title, artist and library credit (no year). */
export function SongResult({ song, cover, from }: SongResultProps) {
  // Most songs are in several libraries: up to three avatars and names, then "+2" and "and 2 more".
  const shown = from.slice(0, SHOWN)
  const more = from.length - shown.length
  return (
    <div className="jm-result">
      {cover ? (
        <img className="game__cover" src={cover} alt="" />
      ) : (
        <span className="game__cover game__cover--none">
          <Icon name="music" />
        </span>
      )}
      <div className="jm-song">
        <h1 className="jm-song__title">{song.title}</h1>
        <span className="jm-song__artist">{song.artist}</span>
        {from.length > 0 && (
          <span className="jm-song__library" aria-label={libraries(from)}>
            <span className="game__libraries" aria-hidden="true">
              {shown.map((player) => (
                <Avatar key={player.id} player={player} />
              ))}
              {more > 0 && <span className="jm-avatar game__libraries-more">+{more}</span>}
            </span>
            <span className="game__credit" aria-hidden="true">
              From {credit(shown, more)}
            </span>
            {more > 0 && (
              <span className="game__credit-more" aria-hidden="true">
                and {more} more
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

/** The most players named in the library credit; the rest are "and 2 more". */
const SHOWN = 3

/** The short credit: "Jonas's library", "Jonas and Sam", "Jonas, Sam and Lea", and with more
    to come after it, "Jonas, Sam, Lea" (then "and 2 more"). */
function credit(shown: Player[], more: number): string {
  const list = shown.map((player) => player.name)
  if (more > 0) return list.join(', ')
  if (list.length === 1) return `${list[0]}'s library`
  return names(list)
}

/** For screen readers, everyone: "From Jonas's, Sam's and Lea's libraries". */
function libraries(players: Player[]): string {
  const owned = names(players.map((player) => `${player.name}'s`))
  return `From ${owned} ${players.length === 1 ? 'library' : 'libraries'}`
}
