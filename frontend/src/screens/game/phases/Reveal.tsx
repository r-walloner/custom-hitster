import { Button, Token } from '../../../components/Button.tsx'
import { Countdown } from '../../../components/Countdown.tsx'
import { Icon } from '../../../components/Icon.tsx'
import { Mark } from '../../../components/SongCard.tsx'
import type { Player } from '../../../components/types.ts'
import { useRoomTools } from '../../room/context.ts'
import { revealItems, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentPanel, SongResult } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'
import { revealOutcome } from './reveal.ts'

/** 4 · Reveal and result: the song and its cover, and the next song on its way. The board's
    marks say who was right. */
export default function Reveal({ turn }: { turn: Turn }) {
  const { room, you, name, player, send } = useRoomTools()
  const { game, active, cards, loading } = turn
  const result = revealOutcome(game, cards, name)
  if (!game.card || !result) return null
  const card = game.card
  const { revealed, kept, winner, before, guesses, at } = result
  // Time left before the automatic next song; null when it isn't counting down.
  const advance = loading ? null : game.advance_left_ms

  const who = name(game.active)
  const items = revealItems(before, revealed, guesses, winner, kept, at, (right, guess, edge) => (
    <Mark
      key={guess.id}
      right={right}
      before={edge}
      initial={guess.name.charAt(0).toUpperCase()}
      label={`${guess.name} ${guess.id === game.active ? 'placed it' : 'guessed'} ${slotRangeShort(before, guess.slot)}: ${right ? 'right' : 'wrong'}`}
    />
  ))

  // known_by holds display names; match them to the seats for the avatars.
  const from: Player[] = card.known_by.map((known) => {
    const seat = room.players.find((p) => p.name === known)
    return seat ? player(seat.id) : { id: known, name: known, color: 1 }
  })

  return (
    <GameScreen
      turn={turn}
      panel={
        <MomentPanel
          phase="Reveal"
          className={you.is_host ? 'game__result' : 'game__result game__result--watch'}
          ring={
            advance !== null && (
              <Countdown
                key={advance}
                ms={advance}
                total={room.settings.next_turn_seconds * 1000}
                label={(seconds) => `Next song in ${seconds} seconds`}
              />
            )
          }
        >
          <SongResult song={revealed} cover={card.image_url} from={from} />
          {/* Only the host judges and moves on, so the player on turn can neither award
              themselves the token nor cut the others' listening short. */}
          {you.is_host ? (
            <div className="game__outcome-actions">
              <Button
                pressed={game.named === true}
                aria-label={`${who} named title and artist: 1 token`}
                onClick={() => send({ type: 'set_named', value: game.named !== true })}
              >
                Named the song <Token>+1</Token>
              </Button>
              {/* Greyed out once the countdown is stopped, rather than gone, so the row
                  doesn't jump. Not there at all when there's no automatic next song. */}
              {room.settings.next_turn_seconds > 0 && (
                <Button
                  className="game__keep"
                  disabled={advance === null}
                  onClick={() => send({ type: 'hold_turn' })}
                >
                  Keep listening
                </Button>
              )}
              <Button
                variant="primary"
                className="game__next"
                disabled={loading}
                aria-busy={loading}
                onClick={() => turn.draw({ type: 'next_turn' })}
              >
                <Icon name="skip" />
                {loading ? 'Loading…' : 'Next song'}
              </Button>
            </div>
          ) : (
            // Everyone else sees it when the host gives the token, as text. Until then it is
            // hidden but keeps its space, so nothing moves when it appears.
            <div className="game__outcome-actions">
              <span className={game.named ? 'game__named' : 'game__named game__named--off'}>
                {who} named the song <Token>+1</Token>
              </span>
            </div>
          )}
        </MomentPanel>
      }
      board={
        <Board
          owner={who}
          count={`${active.timeline.length} of ${room.settings.cards_to_win}`}
          items={items}
          spaced
          label={`${who}'s timeline, with everyone's guesses`}
        />
      }
    />
  )
}
