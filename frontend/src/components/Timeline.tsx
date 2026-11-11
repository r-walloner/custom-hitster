import { Fragment } from 'react'
import type { CardView } from '../messages.ts'

interface Props {
  cards: CardView[]
  /** Slot holding the face-down card in play. Slot i is the gap before card i. */
  pending?: number | null
  /** Slot -> names of the challengers who marked it. */
  marks?: Map<number, string[]>
  pickable?: (slot: number) => boolean
  onPick?: (slot: number) => void
  /** Id of a card to highlight, e.g. the one just won. */
  highlight?: string
  /** A revealed card shown where it belongs without being part of this timeline. */
  ghost?: { slot: number; card: CardView }
}

export function Timeline({ cards, pending, marks, pickable, onPick, highlight, ghost }: Props) {
  const slot = (index: number) => (
    <div className="slot">
      {pending === index && (
        <div className="card mystery" aria-label="The card in play">
          ?
        </div>
      )}
      {ghost?.slot === index && (
        <div className="card ghost" aria-label="Where the card belongs">
          <strong className="year">{ghost.card.year}</strong>
          <span className="muted">belongs here</span>
        </div>
      )}
      {marks?.get(index)?.map((name) => (
        <span key={name} className="chip mark">
          {name}
        </span>
      ))}
      {pickable?.(index) && (
        <button className="pick" onClick={() => onPick?.(index)} aria-label={`Place at ${index}`}>
          +
        </button>
      )}
    </div>
  )

  return (
    <div className="timeline">
      {cards.map((card, index) => (
        <Fragment key={card.id}>
          {slot(index)}
          <div className={`card${card.id === highlight ? ' new' : ''}`}>
            {card.image_url && <img src={card.image_url} alt="" loading="lazy" />}
            <strong className="year">{card.year}</strong>
            <span className="title">{card.name}</span>
            <span className="muted">{card.artists.join(', ')}</span>
          </div>
        </Fragment>
      ))}
      {slot(cards.length)}
    </div>
  )
}
