import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Ring } from '../../components/Avatar.tsx'
import { Board } from '../../components/Board.tsx'
import { pickingItems, slotRangeShort } from '../../components/boardItems.ts'
import { Button, Status } from '../../components/Button.tsx'
import { MomentHead, MomentPanel, PlayerCell } from '../../components/MomentPanel.tsx'
import { JONAS, MARA, MARA_CARDS, SAM } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import { GameScreen } from './GameScreen.tsx'

/** 3 · Challengers guess, in the order they challenged. Guesses are visible, not secret. */
export default function Guess() {
  const paths = useRoomPaths()
  const navigate = useNavigate()
  const [slot, setSlot] = useState(3)
  const items = pickingItems(
    MARA_CARDS,
    [
      { name: JONAS.name, slot: 1, done: true },
      { name: MARA.name, slot: 2, done: true },
    ],
    {
      name: SAM.name,
      slot,
      onPick: setSlot,
      gapLabel: (i) => `Sam's guess: ${slotRangeShort(MARA_CARDS, i)}`,
    },
  )

  return (
    <GameScreen
      phase="guess"
      revealNow
      className="game--guess"
      tape={{ progress: 0.63, time: '0:19 / 0:30' }}
      panel={
        <MomentPanel
          label="Challengers guess, in the order they challenged"
          className="game__guess"
        >
          <MomentHead
            label="Challengers guess"
            headline="Sam, where does it really go?"
            ring={<Ring percent={45} seconds={9} label="9 seconds left to guess" />}
          />
          <div className="game__guess-body">
            <div className="game__guess-order">
              <PlayerCell player={JONAS} name="1 · Jonas" className="game__done">
                <Status quiet>{slotRangeShort(MARA_CARDS, 1)}</Status>
              </PlayerCell>
              <PlayerCell player={SAM} name="2 · Sam" now>
                <Status>Guessing…</Status>
              </PlayerCell>
            </div>
            <Button variant="primary" size="xl" onClick={() => navigate(paths.reveal)}>
              Lock Sam's guess
            </Button>
          </div>
        </MomentPanel>
      }
      board={
        <Board
          owner={MARA.name}
          count="4 of 10"
          items={items}
          label="Mara's timeline, Sam is guessing"
        />
      }
    />
  )
}
