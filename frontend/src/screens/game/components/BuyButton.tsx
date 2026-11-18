import { Button, Token } from '../../../components/Button.tsx'
import { useRoomTools } from '../../room/context.ts'
import { BUY_COST, buyable, canBuy } from '../rules.ts'
import type { Turn } from '../turn.ts'

interface BuyButtonProps {
  /** The game, whether a song is on its way, and how to send the draw. */
  turn: Pick<Turn, 'game' | 'loading' | 'draw'>
  /** Who buys. */
  id: string
  label?: string
  size?: 'xl'
}

/** The player on turn trades 3 tokens for the card in play. Greyed out if they can't. */
export function BuyButton({ turn, id, label, size }: BuyButtonProps) {
  const { as, canActFor } = useRoomTools()
  if (!canActFor(id) || !buyable(turn.game, id)) return null
  return (
    <Button
      size={size}
      disabled={!canBuy(turn.game, id, turn.loading)}
      aria-label={`${label ?? 'Buy this card'} for ${BUY_COST} tokens`}
      onClick={() => turn.draw({ type: 'buy', ...as(id) })}
    >
      {label ?? 'Buy this card'} <Token>{BUY_COST}</Token>
    </Button>
  )
}
