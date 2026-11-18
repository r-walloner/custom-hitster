import { Button, Token } from '../../../components/Button.tsx'
import { Countdown } from '../../../components/Countdown.tsx'
import { useRoomTools } from '../../room/context.ts'
import { pickingItems, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentPanel, PlayerCell } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'

/**
 * 2 · Challenge: the other players get a few seconds to say the player on turn is wrong. The
 * first to challenge is the only challenger; not challenging before the countdown ends is
 * passing. Each device shows only the players it plays for: one Challenge button for a single
 * player, a row each when the host decides for several.
 */
export default function Challenge({ turn }: { turn: Turn }) {
  const { room, you, name, player, canActFor, as, send } = useRoomTools()
  const { game, cards } = turn
  const who = name(game.active)
  const slot = game.slot ?? 0
  const items = pickingItems(cards, [{ name: who, slot }])
  const mine = game.players.filter((p) => p.id !== game.active && canActFor(p.id))

  const challenge = (id: string, tokens: number, size?: 'xl') => (
    <Button
      variant="primary"
      size={size}
      disabled={tokens < 1}
      title={tokens < 1 ? 'A challenge costs 1 token' : undefined}
      aria-label={
        id === you.player_id ? 'Challenge for 1 token' : `Challenge for ${name(id)}, 1 token`
      }
      onClick={() => send({ type: 'buzz', ...as(id) })}
    >
      Challenge <Token>1</Token>
    </Button>
  )

  const cell = (id: string, tokens: number) => (
    <PlayerCell key={id} player={player(id)}>
      {challenge(id, tokens)}
    </PlayerCell>
  )

  // One player to decide for gets one decision; only a device with several gets their rows.
  const single = mine.length === 1 ? mine[0] : null
  const yours = single?.id === you.player_id
  const decision = single ? (
    <>
      {!yours && <p className="jm-moment__sub">Deciding for {name(single.id)}.</p>}
      <div className="game__decide game__decide--one">
        {challenge(single.id, single.tokens, 'xl')}
      </div>
    </>
  ) : mine.length > 0 ? (
    <div className="jm-players app-scroll">{mine.map((p) => cell(p.id, p.tokens))}</div>
  ) : (
    <p className="jm-moment__sub">
      {game.active === you.player_id ? 'The others' : `Everyone but ${who}`} can challenge until
      the time runs out.
    </p>
  )

  return (
    <GameScreen
      turn={turn}
      panel={
        <MomentPanel
          phase="Challenge"
          className="game__challenge"
          ring={
            game.window_left_ms !== null && (
              <Countdown
                key={game.window_left_ms}
                ms={game.window_left_ms}
                total={room.settings.challenge_seconds * 1000}
                label={(seconds) => `${seconds} seconds left to challenge`}
              />
            )
          }
        >
          <h1 className="jm-moment__headline">
            {who} says {slotRangeShort(cards, slot)}. Is that right?
          </h1>
          {decision}
        </MomentPanel>
      }
      board={
        <Board
          owner={who}
          count={`${cards.length} of ${room.settings.cards_to_win}`}
          items={items}
          spaced
        />
      }
    />
  )
}
