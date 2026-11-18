import { useState } from 'react'
import { Ring } from '../../components/Avatar.tsx'
import { Board } from '../../components/Board.tsx'
import type { BoardItem } from '../../components/boardItems.ts'
import { Button, Token } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { MomentPanel, SongResult } from '../../components/MomentPanel.tsx'
import { Mark, Verdict } from '../../components/SongCard.tsx'
import { JONAS, LEA, MARA, MARA_CARDS, REVEALED, SAM, TOBI } from '../../fixtures.ts'
import type { Score } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import { GameScreen } from './GameScreen.tsx'

/** 4 · Reveal and result: the song, who was right, and the next song on its way. */
export default function Reveal() {
  const paths = useRoomPaths()
  const [named, setNamed] = useState(false)
  const scores: Score[] = [
    { player: MARA, cards: 5, tokens: 3 + (named ? 1 : 0) },
    { player: JONAS, cards: 6, tokens: 0 },
    { player: LEA, cards: 5, tokens: 2 },
    { player: TOBI, cards: 3, tokens: 2 },
    { player: SAM, cards: 2, tokens: 4 },
  ]
  const items: BoardItem[] = [
    {
      kind: 'card',
      song: MARA_CARDS[0],
      mark: <Mark right={false} initial="J" label="Jonas guessed between 1975 and 1994: wrong" />,
    },
    { kind: 'card', song: MARA_CARDS[1] },
    {
      kind: 'card',
      song: REVEALED,
      isNew: true,
      mark: <Mark right initial="M" label="Mara placed it here: right" />,
    },
    {
      kind: 'card',
      song: MARA_CARDS[2],
      mark: <Mark right={false} initial="S" label="Sam guessed between 2008 and 2016: wrong" />,
    },
    { kind: 'card', song: MARA_CARDS[3] },
  ]

  return (
    <GameScreen
      phase="reveal"
      tape={{ progress: 0.7, time: '0:21 / 0:30', year: REVEALED.year }}
      scores={scores}
      panel={
        <MomentPanel label="Round result" className="game__result">
          <div className="jm-result">
            <SongResult song={REVEALED} from={JONAS} source="Year: original release, MusicBrainz" />
            <div className="game__outcome">
              <div className="game__outcome-row">
                <Verdict right>Right</Verdict>
                <h1 className="jm-moment__headline">Mara nailed it.</h1>
                <Ring small percent={40} seconds={6} label="Next song in 6 seconds" />
              </div>
              <div className="game__outcome-row">
                <span className="jm-moment__sub">Card is hers. Jonas and Sam missed.</span>
                <Button pressed={named} onClick={() => setNamed(!named)}>
                  Named it <Token>+1</Token>
                </Button>
              </div>
              <div className="game__outcome-actions">
                <Button size="lg">Keep listening</Button>
                <Button
                  to={paths.placing}
                  variant="primary"
                  size="next"
                  aria-label="Next song, starts by itself in 6 seconds"
                >
                  <Icon name="skip" />
                  Next song
                </Button>
              </div>
            </div>
          </div>
        </MomentPanel>
      }
      board={
        <Board
          owner={MARA.name}
          count="5 of 10"
          items={items}
          spaced
          label="Mara's timeline, with everyone's guesses"
        />
      }
    />
  )
}
