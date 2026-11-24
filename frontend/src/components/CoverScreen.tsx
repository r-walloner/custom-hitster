import type { ReactNode } from 'react'
import { FADE_STAGGER_MS } from './fade.ts'
import { CoverArt } from './Hero.tsx'
import type { FloatingCard } from './Hero.tsx'
import { Logo } from './Logo.tsx'
import { Screen } from './Screen.tsx'
import type { Song } from './types.ts'
import { useDesktop } from './useDesktop.ts'

/** The songs on the cards when there are none of the player's own: three internet memes. */
const FIXED_SONGS: Song[] = [
  { year: 1987, title: 'Never Gonna Give You Up', artist: 'Rick Astley' },
  { year: 1984, title: 'Careless Whisper', artist: 'George Michael' },
  { year: 1999, title: 'Sandstorm', artist: 'Darude' },
]

/** Where the cards float: one per song, then the yellow `????` pick in front of the tape. */
const CARDS: FloatingCard[] = [
  { left: 266, top: 40, rotate: 7, scale: 0.74, delay: -1.2 },
  { left: 4, top: 262, rotate: -11, scale: 0.62, delay: -2.4 },
  { left: 150, top: 270, rotate: 9, scale: 0.55, delay: -3.1, duration: 4.4 },
  { left: 270, top: 208, rotate: -4, scale: 0.78, delay: -0.4, front: true },
]

/** The same places in the desktop's bigger box. */
const DESKTOP_CARDS: FloatingCard[] = [
  { left: 420, top: 64, rotate: 7, scale: 1.15, delay: -1.2 },
  { left: 24, top: 404, rotate: -11, scale: 0.98, delay: -2.4 },
  { left: 236, top: 430, rotate: 9, scale: 0.86, delay: -3.1, duration: 4.4 },
  { left: 420, top: 330, rotate: -4, scale: 1.22, delay: -0.4, front: true },
]

/**
 * A cover screen: the cover art on the left, one panel on the right. Home, the sign-in error and
 * a missing room use it. `songs` go on the cards in place of the fixed ones, as many as there are.
 * Given at all, the cards fade in, the `????` card first and then the songs one after another;
 * `null` means the songs aren't known yet, and no card shows until they are, so their titles
 * never switch in front of the player. Left out, the cards with the fixed songs are just there.
 */
export function CoverScreen({
  songs,
  children,
}: {
  songs?: Song[] | null
  children: ReactNode
}) {
  const desktop = useDesktop()
  const fade = songs !== undefined
  const cards =
    songs === null
      ? []
      : (desktop ? DESKTOP_CARDS : CARDS).map((card, index) => {
          const song = index < FIXED_SONGS.length
          return {
            ...card,
            song: song ? (songs?.[index] ?? FIXED_SONGS[index]) : undefined,
            fadeIn: fade ? (song ? (index + 1) * FADE_STAGGER_MS : 0) : undefined,
          }
        })
  return (
    <Screen className="app-cover">
      <CoverArt
        className="app-cover__hero"
        tape={
          desktop
            ? { left: 64, top: 206, width: 300, progress: 0.38 }
            : { left: 44, top: 142, width: 200, progress: 0.38 }
        }
        cards={cards}
      >
        <Logo size="xl" className="app-cover__logo" />
        <p className="app-cover__slogan">The music game built from your own playlists.</p>
      </CoverArt>
      {children}
    </Screen>
  )
}
