import { Button, Token } from '../../../components/Button.tsx'
import { useRoomTools } from '../../room/context.ts'
import { BUY_COST, canBuy } from '../rules.ts'
import type { Turn } from '../turn.ts'

interface BuyButtonProps {
  /** The game, whether a song is on its way, and how to send the draw. */
  turn: Pick<Turn, 'game' | 'loading' | 'draw'>
  /** Who buys. */
  id: string
  label?: string
}

/** Trade 3 tokens for the next card, for `id`. Shown only while they may. */
export function BuyButton({ turn, id, label }: BuyButtonProps) {
  const { as, canActFor } = useRoomTools()
  if (!canActFor(id) || !canBuy(turn.game, id, turn.loading)) return null
  return (
    <Button
      aria-label={`${label ?? 'Buy a card'} for ${BUY_COST} tokens`}
      onClick={() => turn.draw({ type: 'buy', ...as(id) })}
    >
      {label ?? 'Buy a card'} <Token>{BUY_COST}</Token>
    </Button>
  )
}
