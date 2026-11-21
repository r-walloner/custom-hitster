import type { ReactNode } from 'react'
import { CoverArt } from './Hero.tsx'
import type { FloatingCard } from './Hero.tsx'
import { Logo } from './Logo.tsx'
import { Screen } from './Screen.tsx'

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
  {
    song: { year: 1983, title: 'Sweet Dreams', artist: 'Eurythmics' },
    left: 150,
    top: 270,
    rotate: 9,
    scale: 0.55,
    delay: -3.1,
    duration: 4.4,
  },
  { left: 270, top: 208, rotate: -4, scale: 0.78, delay: -0.4, front: true },
]

/**
 * A cover screen: the cover art on the left, one panel on the right. Home, the sign-in error and
 * a missing room use it.
 */
export function CoverScreen({ children }: { children: ReactNode }) {
  return (
    <Screen className="app-cover">
      <CoverArt
        className="app-cover__hero"
        tape={{ left: 44, top: 142, width: 200, progress: 0.38 }}
        cards={CARDS}
      >
        <Logo size="xl" className="app-cover__logo" />
        <p className="app-cover__slogan">The music game built from your own playlists.</p>
      </CoverArt>
      {children}
    </Screen>
  )
}
