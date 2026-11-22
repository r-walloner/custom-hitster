import { Button } from './Button.tsx'

/** The primary Done that closes a sub-screen or a settings pop-up, at the right of its header. */
export function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} variant="primary" className="app-done">
      Done
    </Button>
  )
}
