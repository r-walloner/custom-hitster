import { Ring } from '../../components/Avatar.tsx'
import { Board } from '../../components/Board.tsx'
import type { BoardItem } from '../../components/boardItems.ts'
import { Button, Status } from '../../components/Button.tsx'
import { Icon } from '../../components/Icon.tsx'
import { MomentHead, MomentPanel, PlayerCell } from '../../components/MomentPanel.tsx'
import { JONAS, LEA, MARA, MARA_CARDS, SAM, TOBI } from '../../fixtures.ts'
import type { Player } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import { GameScreen } from './GameScreen.tsx'

/** 2 · Challenge: everyone else gets a few seconds to say Mara is wrong. */
export default function Challenge() {
  const paths = useRoomPaths()
  const items: BoardItem[] = [
    { kind: 'card', song: MARA_CARDS[0] },
    { kind: 'card', song: MARA_CARDS[1] },
    { kind: 'pick', name: MARA.name },
    { kind: 'card', song: MARA_CARDS[2] },
    { kind: 'card', song: MARA_CARDS[3] },
  ]

  const deciding = (player: Player) => (
    <PlayerCell player={player}>
      <Button to={paths.guess} variant="primary">
        Challenge
      </Button>
      <Button size="icon" aria-label={`Pass for ${player.name}`}>
        <Icon name="pass" />
      </Button>
    </PlayerCell>
  )

  return (
    <GameScreen
      phase="challenge"
      revealNow
      tape={{ progress: 0.47, time: '0:14 / 0:30' }}
      panel={
        <MomentPanel label="Challenge">
          <MomentHead
            label="Challenge"
            headline="Mara says 1994 to 2008. Is that right?"
            ring={<Ring percent={60} seconds={6} label="6 seconds left" />}
          />
          <div className="jm-players">
            <PlayerCell player={JONAS}>
              <Status>Challenged</Status>
            </PlayerCell>
            {deciding(LEA)}
            <PlayerCell player={TOBI}>
              <Status quiet>Passed</Status>
            </PlayerCell>
            {deciding(SAM)}
          </div>
        </MomentPanel>
      }
      board={<Board owner={MARA.name} count="4 of 10" items={items} spaced />}
    />
  )
}
