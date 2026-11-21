import type { ReactNode } from 'react'
import { Button, RoomCode } from '../../../components/Button.tsx'
import { Icon } from '../../../components/Icon.tsx'
import { Logo } from '../../../components/Logo.tsx'
import { Header, HeaderMeta, Screen, Spacer } from '../../../components/Screen.tsx'
import { useRoomTools } from '../../room/context.ts'
import { MAX_TOKENS } from '../rules.ts'
import { scoreStatus } from '../scores.ts'
import type { Turn } from '../turn.ts'
import { LiveTape } from './LiveTape.tsx'
import { MiniScoreboard } from './MiniScoreboard.tsx'
import './GameScreen.css'

interface GameScreenProps {
  turn: Turn
  /** The centre panel: the one decision of the moment. */
  panel: ReactNode
  /** The board along the bottom. */
  board: ReactNode
  className?: string
}

/** The game screen: header, the top band (tape, moment panel, scoreboard), the board below. */
export function GameScreen({ turn, panel, board, className }: GameScreenProps) {
  const { room, you, send, open, player, songStart, isAway } = useRoomTools()
  const { game } = turn
  // Only the host: the player on turn could otherwise cut a challenge short.
  const revealNow = you.is_host && (game.phase === 'challenging' || game.phase === 'picking')
  // Named the song pays out when the next turn starts; show the token already.
  const bonus = (id: string) => (game.phase === 'revealed' && game.named && id === game.active ? 1 : 0)
  const facts = {
    game,
    isAway,
  }
  const scores = game.players.map((p) => ({
    player: player(p.id),
    cards: p.timeline.length,
    tokens: Math.min(MAX_TOKENS, p.tokens + bonus(p.id)),
    status: scoreStatus({ id: p.id, cards: p.timeline.length }, facts),
    away: isAway(p.id),
  }))

  return (
    <Screen className={className}>
      <Header>
        <Logo />
        <RoomCode code={room.code} />
        <HeaderMeta>
          <span>
            Turn <b>{game.turn_number}</b>
          </span>
          <span>
            <b>{game.deck_remaining}</b> cards left
          </span>
          <span>
            First to <b>{room.settings.cards_to_win}</b>
          </span>
        </HeaderMeta>
        <Spacer />
        {revealNow && <Button onClick={() => send({ type: 'reveal' })}>Reveal now</Button>}
        <Button
          onClick={() => open('menu')}
          size="icon"
          aria-label="Game menu: playback device, scoreboard, end game"
        >
          <Icon name="gear" />
        </Button>
      </Header>
      <div className="jm-screen__top">
        <LiveTape
          start={songStart}
          year={game.card?.year}
          onRestart={turn.referee ? () => send({ type: 'restart_playback' }) : undefined}
        />
        {panel}
        <MiniScoreboard scores={scores} turn={game.active} onOpen={() => open('scoreboard')} />
      </div>
      {board}
    </Screen>
  )
}
