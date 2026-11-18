import type { ReactNode } from 'react'
import { CoverArt } from './Hero.tsx'
import type { FloatingCard } from './Hero.tsx'
import { Logo } from './Logo.tsx'
import { Screen } from './Screen.tsx'
import './HomeCover.css'

const CARDS: FloatingCard[] = [
  {
    song: { year: 1994, title: 'Zombie', artist: 'The Cranberries' },
    left: 266,
    top: 40,
    rotate: 7,
    scale: 0.74,
    delay: -1.2,
  },
  {
    song: { year: 2010, title: 'Dancing On My Own', artist: 'Robyn' },
    left: 4,
    top: 262,
    rotate: -11,
    scale: 0.62,
    delay: -2.4,
  },
  { left: 270, top: 208, rotate: -4, scale: 0.78, delay: -0.4, front: true },
]

/** Home and the sign-in error: the cover art on the left, one panel on the right. */
export function HomeCover({ children }: { children: ReactNode }) {
  return (
    <Screen className="home">
      <CoverArt
        className="home__hero"
        tape={{ left: 44, top: 142, width: 200, progress: 0.38 }}
        cards={CARDS}
      >
        <Logo size="xl" className="home__logo" />
        <p className="home__slogan">The music game built from your own playlists.</p>
      </CoverArt>
      {children}
    </Screen>
  )
}
