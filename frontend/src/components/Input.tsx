import { useMemo } from 'react'
import type { InputHTMLAttributes } from 'react'
import qrcode from 'qrcode-generator'
import { Icon } from './Icon.tsx'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** The four-letter room code: DM Mono, wide spacing, uppercase. Pair it with a Join of the same height. */
export function CodeInput({ className, ...rest }: InputProps) {
  return (
    <input
      type="text"
      className={['jm-input', 'jm-input--code', className].filter(Boolean).join(' ')}
      maxLength={4}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      {...rest}
    />
  )
}

/** A name: Bricolage 800 at 20px. Give it a real label (a jm-label or the screen's headline). */
export function TextInput({ className, ...rest }: InputProps) {
  return (
    <input type="text" className={['jm-input', className].filter(Boolean).join(' ')} {...rest} />
  )
}

/** Search in a list: a pill with a magnifier. */
export function SearchInput({ className, ...rest }: InputProps) {
  return (
    <div className={['jm-search', className].filter(Boolean).join(' ')}>
      <Icon name="search" />
      <input type="search" {...rest} />
    </div>
  )
}

/** `value` as a QR code: one square per dark module, as a single SVG path. */
function qrPath(value: string): { size: number; path: string } {
  const code = qrcode(0, 'M')
  code.addData(value)
  code.make()
  const size = code.getModuleCount()
  let path = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
    }
  }
  return { size, path }
}

/** The room's invite link as a QR code, on a label tile. */
export function QrTile({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => qrPath(value), [value])
  return (
    <div className="jm-qr">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        fill="currentColor"
        role="img"
        aria-label={label}
      >
        <path d={path} />
      </svg>
    </div>
  )
}
