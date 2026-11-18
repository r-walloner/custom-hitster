import { Button, Status } from '../../../components/Button.tsx'
import { useRoomTools } from '../../room/context.ts'
import { guessPicks, pickingItems, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentHead, MomentPanel, PlayerCell } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'

/** 3 · Challengers guess, in the order they challenged. Guesses are visible, not secret. */
export default function Guess({ turn }: { turn: Turn }) {
  const { room, name, player, canActFor, as, send } = useRoomTools()
  const { game, cards, picker } = turn
  const who = name(game.active)
  const guesser = picker ? name(picker.player_id) : '?'
  const acting = picker !== undefined && canActFor(picker.player_id)
  const tokens = game.players.find((p) => p.id === picker?.player_id)?.tokens ?? 0

  // The placement and the locked guesses are done; the one guessing now moves.
  const picks = guessPicks(game, name)
  const items =
    acting && picker
      ? pickingItems(cards, picks, {
          name: guesser,
          slot: picker.slot,
          onPick: (slot) => send({ type: 'pick_slot', slot, ...as(picker.player_id) }),
          gapLabel: (slot) => `${guesser}'s guess: ${slotRangeShort(cards, slot)}`,
        })
      : pickingItems(
          cards,
          picker?.slot != null ? [...picks, { name: guesser, slot: picker.slot }] : picks,
        )

  return (
    <GameScreen
      turn={turn}
      className="game--guess"
      panel={
        <MomentPanel
          label="Challengers guess, in the order they challenged"
          className="game__guess"
        >
          <MomentHead label="Challengers guess" headline={`${guesser}, where does it really go?`} />
          <div className="game__guess-body">
            <div className="game__guess-order app-scroll">
              {game.challenges.map((challenge, index) => {
                const now = challenge === picker
                return (
                  <PlayerCell
                    key={challenge.player_id}
                    player={player(challenge.player_id)}
                    name={`${index + 1} · ${name(challenge.player_id)}`}
                    now={now}
                    className={challenge.locked ? 'game__done' : undefined}
                  >
                    {challenge.locked && challenge.slot !== null ? (
                      <Status quiet>{slotRangeShort(cards, challenge.slot)}</Status>
                    ) : now ? (
                      <Status>Guessing…</Status>
                    ) : (
                      <Status quiet>Next</Status>
                    )}
                  </PlayerCell>
                )
              })}
            </div>
            {acting && picker ? (
              <Button
                variant="primary"
                size="xl"
                disabled={picker.slot === null || tokens < 1}
                title={tokens < 1 ? 'A guess costs 1 token' : undefined}
                onClick={() => send({ type: 'lock_pick', ...as(picker.player_id) })}
              >
                {picker.slot === null ? 'Tap a gap first' : `Lock ${guesser}'s guess`}
              </Button>
            ) : null}
          </div>
        </MomentPanel>
      }
      board={
        <Board
          owner={who}
          count={`${cards.length} of ${room.settings.cards_to_win}`}
          items={items}
          label={`${who}'s timeline, ${guesser} is guessing`}
        />
      }
    />
  )
}
