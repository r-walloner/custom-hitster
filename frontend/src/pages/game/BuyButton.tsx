import { Button, Token } from '../../components/Button.tsx'
import { useRoomTools } from '../../room.ts'
import { BUY_COST, canBuy } from './turn.ts'
import type { Turn } from './turn.ts'

/** Trade 3 tokens for the next card, for `id`. Shown only while they may. */
export function BuyButton({ turn, id, label }: { turn: Turn; id: string; label?: string }) {
  const { as, canActFor } = useRoomTools()
  if (!canActFor(id) || !canBuy(turn, id)) return null
  return (
    <Button
      aria-label={`${label ?? 'Buy a card'} for ${BUY_COST} tokens`}
      onClick={() => turn.draw({ type: 'buy', ...as(id) })}
    >
      {label ?? 'Buy a card'} <Token>{BUY_COST}</Token>
    </Button>
  )
}
