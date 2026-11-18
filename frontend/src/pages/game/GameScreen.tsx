import type { ReactNode } from 'react'
import { Button, RoomCode } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { Scoreboard } from '../../components/Scoreboard.tsx'
import { Header, HeaderMeta, Screen, Spacer } from '../../components/Screen.tsx'
import { TapePlayer } from '../../components/TapePlayer.tsx'
import { MARA, SCORES } from '../../fixtures.ts'
import type { Score } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import type { Phase } from './phases.ts'
import './Game.css'

interface GameScreenProps {
  /** Which phase this is, so the pop-ups opened from it can close back to it. */
  phase: Phase
  tape: { progress: number; time: string; year?: number }
  /** The centre panel: the one decision of the moment. */
  panel: ReactNode
  /** The board along the bottom. */
  board: ReactNode
  /** Shows *Reveal now* left of the gear (challenge and guessing). */
  revealNow?: boolean
  scores?: Score[]
  className?: string
}

/** The game screen: header, the top band (tape, moment panel, scoreboard), the board below. */
export function GameScreen({
  phase,
  tape,
  panel,
  board,
  revealNow,
  scores = SCORES,
  className,
}: GameScreenProps) {
  const paths = useRoomPaths()
  return (
    <Screen className={className}>
      <Header>
        <Logo />
        <RoomCode code={paths.code} />
        <HeaderMeta>
          <span>
            Turn <b>7</b>
          </span>
          <span>
            <b>38</b> cards left
          </span>
          <span>
            First to <b>10</b>
          </span>
        </HeaderMeta>
        <Spacer />
        {revealNow && <Button to={paths.reveal}>Reveal now</Button>}
        <Button
          to={`${paths.menu}?over=${phase}`}
          size="icon"
          aria-label="Game menu: playback device, scoreboard, end game"
        >
          <Icon name="gear" />
        </Button>
      </Header>
      <div className="jm-screen__top">
        <TapePlayer progress={tape.progress} time={tape.time} year={tape.year} />
        {panel}
        <Scoreboard scores={scores} turn={MARA.id} to={`${paths.scoreboard}?over=${phase}`} />
      </div>
      {board}
    </Screen>
  )
}
