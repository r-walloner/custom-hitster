import { Button, Status, Token } from '../../../components/Button.tsx'
import { Countdown } from '../../../components/Countdown.tsx'
import { Icon } from '../../../components/Icon.tsx'
import { Mark, Verdict } from '../../../components/SongCard.tsx'
import type { Player } from '../../../components/types.ts'
import { useRoomTools } from '../../room/context.ts'
import { revealItems, slotRangeShort } from '../board.ts'
import { Board } from '../components/Board.tsx'
import { GameScreen } from '../components/GameScreen.tsx'
import { MomentPanel, SongResult } from '../components/MomentPanel.tsx'
import type { Turn } from '../turn.ts'
import { revealOutcome } from './reveal.ts'

// Where the year came from (years.py, the `source` column), in words.
const YEAR_SOURCES: Record<string, string> = {
  musicbrainz: 'Year: original release, MusicBrainz',
  spotify: "Year: Spotify's release date",
  manual: 'Year: corrected by hand',
}

/** 4 · Reveal and result: the song, who was right, and the next song on its way. */
export default function Reveal({ turn }: { turn: Turn }) {
  const { room, name, player, send } = useRoomTools()
  const { game, active, cards, referee, loading } = turn
  const result = revealOutcome(game, cards, name)
  if (!game.card || !result) return null
  const card = game.card
  const { revealed, kept, winner, before, guesses, at, verdict, headline, sub } = result

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
        <MomentPanel label="Round result" className="game__result">
          <div className="jm-result">
            <SongResult
              song={revealed}
              from={from}
              source={YEAR_SOURCES[card.year_source] ?? `Year: ${card.year_source}`}
            />
            <div className="game__outcome">
              <div className="game__outcome-row">
                <Verdict right={kept}>{verdict}</Verdict>
                <h1 className="jm-moment__headline">{headline}</h1>
                {game.advance_left_ms !== null && !loading && (
                  <Countdown
                    small
                    key={game.advance_left_ms}
                    ms={game.advance_left_ms}
                    total={room.settings.next_turn_seconds * 1000}
                    label={(seconds) => `Next song in ${seconds} seconds`}
                  />
                )}
              </div>
              <div className="game__outcome-row">
                <span className="jm-moment__sub">{sub}</span>
                {referee ? (
                  <Button
                    pressed={game.named === true}
                    aria-label={`${who} named title and artist: 1 token`}
                    onClick={() => send({ type: 'set_named', value: game.named !== true })}
                  >
                    Named it <Token>+1</Token>
                  </Button>
                ) : (
                  game.named && <Status>Named it</Status>
                )}
              </div>
              <div className="game__outcome-actions">
                {referee ? (
                  <>
                    {game.advance_left_ms !== null && !loading && (
                      <Button size="lg" onClick={() => send({ type: 'hold_turn' })}>
                        Keep listening
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="next"
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
            </div>
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
