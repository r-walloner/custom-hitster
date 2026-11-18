import { Button, Status, Token } from '../../../components/Button.tsx'
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
  const { game, active, cards, referee, loading } = turn
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
          className="game__result"
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
          <div className="game__outcome-actions">
            {/* Only the host judges, so the player on turn can't award themselves the token. */}
            {you.is_host ? (
              <Button
                pressed={game.named === true}
                aria-label={`${who} named title and artist: 1 token`}
                onClick={() => send({ type: 'set_named', value: game.named !== true })}
              >
                Named the song <Token>+1</Token>
              </Button>
            ) : (
              game.named && (
                // Looks like the host's pressed toggle, without being a button.
                <span className="game__named">
                  <span className="app-toggle__check">
                    <Icon name="check" />
                  </span>
                  {who} named the song <Token>+1</Token>
                </span>
              )
            )}
            {referee ? (
              <>
                {advance !== null && (
                  <Button onClick={() => send({ type: 'hold_turn' })}>Keep listening</Button>
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
              </>
            ) : (
              <Status quiet>
                {loading ? 'Loading the next song…' : `${who} starts the next song.`}
              </Status>
            )}
          </div>
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
