import { useState } from 'react'
import { Button, ButtonPair, Status, Token } from '../../../components/Button.tsx'
import { useRoomTools } from '../../room/context.ts'
import { pickingItems, slotRange, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { BuyButton } from '../components/BuyButton.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentPanel } from '../components/MomentPanel.tsx'
import { canBuy } from '../rules.ts'
import type { Turn } from '../turn.ts'

/** 1 · Placing: the player on turn taps a gap or a card half, then locks it in. */
export default function Placing({ turn }: { turn: Turn }) {
  const { room, you, name, canActFor, isAway, as, send } = useRoomTools()
  const { game, active, cards, loading } = turn
  const who = name(game.active)
  const acting = canActFor(game.active)
  const away = isAway(game.active)
  // Skipping an away player's turn throws the card away, so it takes a second tap.
  // The tap is remembered per turn, so the next away player's turn starts with one tap again.
  const [skipTapped, setSkipTapped] = useState<number | null>(null)
  const skipping = skipTapped === game.turn_number
  const count = `${cards.length} of ${room.settings.cards_to_win}`
  // On a shared device the host may buy for themselves while someone else places.
  const buyer =
    you.player_id && you.player_id !== game.active && canBuy(game, you.player_id, loading)
      ? you.player_id
      : null

  const items = acting
    ? pickingItems(cards, [], {
        name: who,
        slot: game.slot,
        onPick: (slot) => send({ type: 'place', slot, ...as(game.active) }),
        gapLabel: (slot) => `Put it here: ${slotRange(cards, slot)}`,
      })
    : pickingItems(cards, game.slot === null ? [] : [{ name: who, slot: game.slot }])

  const skip = (
    <Button
      disabled={active.tokens < 1 || game.deck_remaining === 0 || loading}
      aria-label="Skip song for 1 token"
      onClick={() => turn.draw({ type: 'skip', ...as(game.active) })}
    >
      {loading ? (
        'Loading…'
      ) : (
        <>
          Skip song <Token>1</Token>
        </>
      )}
    </Button>
  )

  const panel = acting ? (
    <MomentPanel label="Your move" className="game__placing">
      <span className="jm-label">Guess</span>
      <h1 className="jm-moment__headline">
        {game.slot === null ? 'Where does it go?' : `${slotRange(cards, game.slot)}?`}
      </h1>
      <Button
        variant="primary"
        size="xl"
        disabled={game.slot === null}
        onClick={() => send({ type: 'lock', ...as(game.active) })}
      >
        {game.slot === null ? 'Tap a gap first' : 'Lock it in'}
      </Button>
      {/* The player on turn may buy only after the reveal; on a shared device, the host may. */}
      {buyer ? (
        <ButtonPair>
          {skip}
          <BuyButton turn={turn} id={buyer} label={`Buy for ${name(buyer)}`} />
        </ButtonPair>
      ) : (
        skip
      )}
    </MomentPanel>
  ) : away ? (
    <MomentPanel label={`${who} is away`} className="game__placing">
      <span className="jm-label">Guess</span>
      <h1 className="jm-moment__headline">{who} is away.</h1>
      <Status quiet>Waiting for {who} to come back.</Status>
      {you.is_host && (
        <Button
          disabled={loading}
          onClick={() => (skipping ? turn.draw({ type: 'skip_turn' }) : setSkipTapped(game.turn_number))}
        >
          {loading
            ? 'Loading…'
            : skipping
              ? 'Tap again to throw the card away'
              : `Skip ${who}'s turn`}
        </Button>
      )}
      {you.player_id && <BuyButton turn={turn} id={you.player_id} />}
    </MomentPanel>
  ) : (
    <MomentPanel label={`${who}'s move`} className="game__placing">
      <span className="jm-label">Guess</span>
      <h1 className="jm-moment__headline">
        {game.slot === null
          ? `${who} is placing the card.`
          : `${who} is thinking ${slotRangeShort(cards, game.slot)}.`}
      </h1>
      <Status quiet>Listen along. You can challenge once it's locked in.</Status>
      {you.player_id && <BuyButton turn={turn} id={you.player_id} />}
    </MomentPanel>
  )

  return (
    <GameScreen
      turn={turn}
      panel={panel}
      board={<Board owner={who} count={count} items={items} />}
    />
  )
}
