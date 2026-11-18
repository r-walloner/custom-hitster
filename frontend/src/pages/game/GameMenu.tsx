import { Button } from '../../components/Button.tsx'
import { Dialog, Overlay } from '../../components/Dialog.tsx'
import { Icon } from '../../components/Icon.tsx'
import { SettingRow } from '../../components/Rows.tsx'
import { SPEAKER } from '../../fixtures.ts'
import { useRoomPaths } from '../../paths.ts'
import { usePhaseBehind } from './phases.ts'
import '../Dialogs.css'

/** The gear menu: only what's needed mid-game. */
export default function GameMenu() {
  const paths = useRoomPaths()
  const { Behind, back, query } = usePhaseBehind()
  return (
    <Overlay under={<Behind />}>
      <Dialog title="Menu" closeTo={back} closeLabel="Close menu">
        <SettingRow label="Music plays on" value={SPEAKER} className="dialog__setting">
          <Button to={paths.speaker}>Change</Button>
        </SettingRow>
        <Button to={paths.scoreboard + query} className="dialog__link">
          Scoreboard
          <Icon name="forward" />
        </Button>
        <Button to={paths.winner} variant="dark" className="dialog__end">
          End game
        </Button>
      </Dialog>
    </Overlay>
  )
}
