import { Button } from '../../../components/Button.tsx'
import { useRoomTools } from '../../room/context.ts'
import { guessPicks, pickingItems, slotRange, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentPanel } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'

/** 3 · Challenger's guess: the challenger taps where the card really goes and locks it in. */
export default function Guess({ turn }: { turn: Turn }) {
  const { room, name, canActFor, as, send } = useRoomTools()
  const { game, cards, picker } = turn
  const who = name(game.active)
  const guesser = picker ? name(picker.player_id) : '?'
  const acting = picker !== undefined && canActFor(picker.player_id)
  const tokens = game.players.find((p) => p.id === picker?.player_id)?.tokens ?? 0

  // The placement and any locked guesses are done; the one guessing now moves.
  const picks = guessPicks(game, name)
  const items =
    acting && picker
      ? pickingItems(cards, picks, {
          name: guesser,
          slot: picker.slot,
          onPick: (slot) => send({ type: 'pick_slot', slot, ...as(picker.player_id) }),
          gapLabel: (slot) => `${guesser}'s guess: ${slotRange(cards, slot)}`,
        })
      : pickingItems(
          cards,
          picker?.slot != null ? [...picks, { name: guesser, slot: picker.slot }] : picks,
        )

  const panel =
    acting && picker ? (
      <MomentPanel label={`${guesser}'s guess`} className="game__guess">
        <span className="jm-label">Challenger's guess</span>
        <h1 className="jm-moment__headline">
          {picker.slot === null
            ? `${guesser}, where does it really go?`
            : `${slotRange(cards, picker.slot)}?`}
        </h1>
        <p className="jm-moment__sub">Can you steal the card?</p>
        <Button
          variant="primary"
          size="xl"
          disabled={picker.slot === null || tokens < 1}
          title={tokens < 1 ? 'A guess costs 1 token' : undefined}
          onClick={() => send({ type: 'lock_pick', ...as(picker.player_id) })}
        >
          {picker.slot === null ? 'Tap a gap first' : 'Lock it in'}
        </Button>
      </MomentPanel>
    ) : (
      <MomentPanel label={`${guesser}'s guess`} className="game__guess">
        <span className="jm-label">Challenger's guess</span>
        <h1 className="jm-moment__headline">
          {picker?.slot == null
            ? `${guesser} challenged!`
            : `${guesser} thinks ${slotRangeShort(cards, picker.slot)}.`}
        </h1>
        <p className="jm-moment__sub">Can they steal the card?</p>
      </MomentPanel>
    )

  return (
    <GameScreen
      turn={turn}
      panel={panel}
      board={
        <Board
          owner={who}
          count={`${cards.length} of ${room.settings.cards_to_win}`}
          items={items}
          label={`${who}'s timeline, ${guesser} is placing the card`}
        />
      }
    />
  )
}
