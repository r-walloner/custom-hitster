import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Board } from '../../components/Board.tsx'
import { pickingItems, slotRange } from '../../components/boardItems.ts'
import { Button, ButtonPair, Token } from '../../components/Button.tsx'
import { MomentPanel } from '../../components/MomentPanel.tsx'
import { MARA, MARA_CARDS } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import { GameScreen } from './GameScreen.tsx'

/** 1 · Placing: the player on turn taps a gap or a card half, then locks it in. */
export default function Placing() {
  const paths = useRoomPaths()
  const navigate = useNavigate()
  const [slot, setSlot] = useState(2)
  const items = pickingItems(MARA_CARDS, [], {
    name: MARA.name,
    slot,
    onPick: setSlot,
    gapLabel: (i) => `Put it here: ${slotRange(MARA_CARDS, i)}`,
  })

  return (
    <GameScreen
      phase="placing"
      tape={{ progress: 0.3, time: '0:09 / 0:30' }}
      panel={
        <MomentPanel label="Your move" className="game__placing">
          <span className="jm-label">{MARA.name}'s turn</span>
          <h1 className="jm-moment__headline">{slotRange(MARA_CARDS, slot)}?</h1>
          <Button variant="primary" size="xl" onClick={() => navigate(paths.challenge)}>
            Lock it in
          </Button>
          <ButtonPair>
            <Button>
              Skip song <Token>1</Token>
            </Button>
            <Button aria-label="Buy a card for 3 tokens">
              Buy a card <Token>3</Token>
            </Button>
          </ButtonPair>
        </MomentPanel>
      }
      board={<Board owner={MARA.name} count="4 of 10" items={items} />}
    />
  )
}
