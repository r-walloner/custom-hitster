import { Button, Status } from '../../../components/Button.tsx'
import { Countdown } from '../../../components/Countdown.tsx'
import { Icon } from '../../../components/Icon.tsx'
import { useRoomTools } from '../../room/context.ts'
import { pickingItems, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentHead, MomentPanel, PlayerCell } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'

/** 2 · Challenge: everyone else gets a few seconds to say the player on turn is wrong. */
export default function Challenge({ turn }: { turn: Turn }) {
  const { room, name, player, canActFor, as, send } = useRoomTools()
  const { game, cards } = turn
  const who = name(game.active)
  const slot = game.slot ?? 0
  const items = pickingItems(cards, [{ name: who, slot }])

  const cell = (id: string, tokens: number) => {
    if (game.challenges.some((challenge) => challenge.player_id === id)) {
      return (
        <PlayerCell key={id} player={player(id)}>
          <Status>Challenged</Status>
        </PlayerCell>
      )
    }
    if (game.passed.includes(id)) {
      return (
        <PlayerCell key={id} player={player(id)}>
          <Status quiet>Passed</Status>
        </PlayerCell>
      )
    }
    if (!canActFor(id)) {
      return (
        <PlayerCell key={id} player={player(id)}>
          <Status quiet>Deciding…</Status>
        </PlayerCell>
      )
    }
    return (
      <PlayerCell key={id} player={player(id)}>
        <Button
          variant="primary"
          disabled={tokens < 1}
          title={tokens < 1 ? 'A challenge costs 1 token' : undefined}
          onClick={() => send({ type: 'buzz', ...as(id) })}
        >
          Challenge
        </Button>
        <Button
          size="icon"
          aria-label={`Pass for ${name(id)}`}
          onClick={() => send({ type: 'pass', ...as(id) })}
        >
          <Icon name="pass" />
        </Button>
      </PlayerCell>
    )
  }

  return (
    <GameScreen
      turn={turn}
      panel={
        <MomentPanel label="Challenge">
          <MomentHead
            label="Challenge"
            headline={`${who} says ${slotRangeShort(cards, slot)}. Is that right?`}
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
          />
          <div className="jm-players app-scroll">
            {game.players
              .filter((p) => p.id !== game.active)
              .map((p) => cell(p.id, p.tokens))}
          </div>
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
