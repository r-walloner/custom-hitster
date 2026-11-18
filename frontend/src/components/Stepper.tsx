import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'

interface StepperProps {
  /** The id of the setting's name. */
  labelledBy: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  /** What − and + change: "Fewer cards", "More cards". */
  lessLabel: string
  moreLabel: string
}

/** − / number / +, for a number setting. A plain number: no coin, no unit. */
export function Stepper({
  labelledBy,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  lessLabel,
  moreLabel,
}: StepperProps) {
  return (
    <div className="jm-stepper" role="group" aria-labelledby={labelledBy}>
      <Button
        size="icon"
        aria-label={lessLabel}
        disabled={value - step < min}
        onClick={() => onChange(value - step)}
      >
        <Icon name="minus" />
      </Button>
      <output className="jm-stepper__value">{value}</output>
      <Button
        size="icon"
        aria-label={moreLabel}
        disabled={value + step > max}
        onClick={() => onChange(value + step)}
      >
        <Icon name="plus" />
      </Button>
    </div>
  )
}

interface SegmentedProps<T extends string> {
  labelledBy: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}

/** One of a few fixed values as a row of toggles. Exactly one is pressed. Four at most. */
export function Segmented<T extends string>({
  labelledBy,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="jm-segmented" role="group" aria-labelledby={labelledBy}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="jm-btn jm-btn--toggle"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
