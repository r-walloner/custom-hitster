import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Avatar } from '../../components/Avatar.tsx'
import { Button } from '../../components/Button.tsx'
import {
  bought,
  charged,
  pop,
  right,
  steal,
  tap,
  tinted,
  trail,
} from '../../components/confetti.ts'
import type { Point } from '../../components/confetti.ts'
import type { IconName } from '../../components/Icon.tsx'
import { Logo } from '../../components/Logo.tsx'
import { Header, Screen, Spacer } from '../../components/Screen.tsx'
import { Mark, SongCard } from '../../components/SongCard.tsx'
import { Toast } from '../../components/Toast.tsx'
import type { Player } from '../../components/types.ts'
import { centreOf, rainOn, useConfetti } from '../../components/useConfetti.ts'
import './ConfettiLab.css'

type Colour = Player['color']

const NAMES = ['Mara', 'Sam', 'Lea', 'Jonas', 'Noor']
const BOARD = [
  { year: 1994, title: 'Summer Tape', artist: 'The Reels' },
  { year: 2008, title: 'Late Bus Home', artist: 'Paper Coins' },
]
const FLOATING = [
  {
    song: { year: 1979, title: 'Night Shift', artist: 'Low Fidelity' },
    left: '58%',
    top: '10%',
    rotate: -9,
  },
  {
    song: { year: 1987, title: 'Pocket Radio', artist: 'B-Side Club' },
    left: '76%',
    top: '34%',
    rotate: 12,
  },
  {
    song: { year: 2016, title: 'Rewind', artist: 'Mixtape Kids' },
    left: '62%',
    top: '58%',
    rotate: -4,
  },
]

/** A press that hasn't moved this far, in viewport pixels, is a tap or a hold, not a drag. */
const DRAG = 10
/** A press held this long, without moving, starts charging. */
const HOLD_MS = 250
/** Charging is full after this much more. */
const CHARGE_MS = 1250
/** How long the reveal's pop-up stays. */
const POPUP_MS = 1500
/** A floating card comes back after being popped. */
const BACK_MS = 2000
/** Slow phone: the main thread is kept busy this long every frame, which misses frames on a
    60 Hz screen, so the quality scaling can be watched at work. */
const SLOW_WORK_MS = 22

const next = (colour: Colour, by = 1) => (((((colour - 1 + by) % 5) + 5) % 5) + 1) as Colour
const token = (colour: Colour) => `--player-${colour}`

interface Press {
  id: number
  start: Point
  time: number
  moved: boolean
  holding: boolean
  timer: number
}

interface Popup {
  key: number
  tone: 'right' | 'wrong' | 'heads-up'
  icon: IconName
  text: string
}

/** The confetti preview: every reveal effect and the winner screen's interactions on a blank page. */
export default function ConfettiLab() {
  const confetti = useConfetti()
  const [colour, setColour] = useState<Colour>(1)
  const [stats, setStats] = useState({ count: 0, quality: 1 })
  const [slow, setSlow] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)
  const [mouseTrail, setMouseTrail] = useState(false)
  const [ring, setRing] = useState<{ x: number; y: number; key: number } | null>(null)
  const [popped, setPopped] = useState<number[]>([])
  const area = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const press = useRef<Press | null>(null)

  const you = token(colour)
  const them = token(next(colour))
  const youName = NAMES[colour - 1]
  const themName = NAMES[next(colour) - 1]

  useEffect(() => {
    const timer = window.setInterval(
      () => setStats({ count: confetti.count(), quality: confetti.quality() }),
      200,
    )
    return () => window.clearInterval(timer)
  }, [confetti])

  // Slow phone: busy work every frame while it's on.
  useEffect(() => {
    if (!slow) return
    let frame = 0
    const work = () => {
      const until = performance.now() + SLOW_WORK_MS
      while (performance.now() < until) {
        // Busy on purpose.
      }
      frame = requestAnimationFrame(work)
    }
    frame = requestAnimationFrame(work)
    return () => cancelAnimationFrame(frame)
  }, [slow])

  useEffect(() => {
    if (!popup) return
    const timer = window.setTimeout(() => setPopup(null), POPUP_MS)
    return () => window.clearTimeout(timer)
  }, [popup])

  const say = (tone: Popup['tone'], icon: IconName, text: string) =>
    setPopup({ key: Date.now(), tone, icon, text })

  // Yours is the first card on the board, theirs the second.
  const above = (index: number): Point | null => {
    const card = board.current?.querySelectorAll('.jm-card')[index]
    return card ? rainOn(card) : null
  }

  const reveal = {
    right: () => {
      const from = above(0)
      if (from) confetti.burst(from, right(tinted(you)))
      say('right', 'check', `${youName} got it right. 1994.`)
    },
    stolen: () => {
      const from = above(0)
      const to = above(1)
      if (from && to) {
        confetti.burst(from, steal(to, tinted(them)))
        // As the stream lands, the thief's card goes off.
        window.setTimeout(() => confetti.burst(to, { ...right(tinted(them)), count: 27 }), 900)
      }
      say('right', 'check', `${themName} stole the card from ${youName}.`)
    },
    bought: () => {
      const from = above(0)
      if (from) confetti.burst(from, bought())
      say('heads-up', 'check', `${youName} bought the card.`)
    },
    nobody: () => say('wrong', 'pass', 'Nobody had it. The card is out.'),
  }

  const others = () => {
    const box = area.current?.getBoundingClientRect()
    if (!box) return
    for (const by of [2, 3]) {
      const point = {
        x: box.left + box.width * (0.15 + 0.7 * Math.random()),
        y: box.top + box.height * (0.2 + 0.6 * Math.random()),
      }
      confetti.burst(point, tap(tinted(token(next(colour, by)))))
    }
  }

  // Three players tap at once: one big firework in all their colours.
  const together = () => {
    const box = area.current?.getBoundingClientRect()
    if (!box) return
    const centre = { x: box.left + box.width / 2, y: box.top + box.height * 0.6 }
    const colours = [you, them, token(next(colour, 2))]
    confetti.burst(centre, charged(1, [...colours, ...colours, '--label', '--mustard']))
  }

  // Where a viewport point is inside the play area, in its own (unzoomed) pixels.
  const local = (x: number, y: number) => {
    const element = area.current!
    const box = element.getBoundingClientRect()
    const zoom = box.width / element.offsetWidth || 1
    return { x: (x - box.left) / zoom, y: (y - box.top) / zoom }
  }

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const start = { x: event.clientX, y: event.clientY }
    const timer = window.setTimeout(() => {
      if (!press.current || press.current.moved) return
      press.current.holding = true
      setRing({ ...local(start.x, start.y), key: Date.now() })
    }, HOLD_MS)
    press.current = {
      id: event.pointerId,
      start,
      time: performance.now(),
      moved: false,
      holding: false,
      timer,
    }
  }

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY }
    const current = press.current
    if (!current) {
      if (mouseTrail && event.pointerType === 'mouse') confetti.burst(point, trail(tinted(you)))
      return
    }
    if (current.id !== event.pointerId) return
    if (current.holding) {
      // A charging press may wander: the ring follows it.
      setRing((ring) => ring && { ...ring, ...local(point.x, point.y) })
      return
    }
    if (!current.moved && Math.hypot(point.x - current.start.x, point.y - current.start.y) > DRAG) {
      current.moved = true
      window.clearTimeout(current.timer)
    }
    if (current.moved) confetti.burst(point, trail(tinted(you)))
  }

  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = press.current
    if (!current || current.id !== event.pointerId) return
    window.clearTimeout(current.timer)
    press.current = null
    const point = { x: event.clientX, y: event.clientY }
    if (current.holding) {
      const power = (performance.now() - current.time - HOLD_MS) / CHARGE_MS
      confetti.burst(point, charged(power, tinted(you)))
      setRing(null)
    } else if (!current.moved) {
      confetti.burst(point, tap(tinted(you)))
    }
  }

  const onCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setRing(null)
  }

  const popCard = (index: number, event: ReactPointerEvent<HTMLDivElement>) => {
    // The card's own tap: not a burst in the play area too.
    event.stopPropagation()
    confetti.burst(centreOf(event.currentTarget), pop(you))
    setPopped((list) => [...list, index])
    window.setTimeout(() => setPopped((list) => list.filter((i) => i !== index)), BACK_MS)
  }

  return (
    <Screen className="lab">
      <Header>
        <Logo />
        <h1 className="jm-headline">Confetti</h1>
        <Spacer />
        <span className="lab__count">
          {confetti.enabled
            ? `${stats.count} pieces, ${Math.round(stats.quality * 100)}%`
            : 'Reduced motion: no confetti'}
        </span>
        <Button pressed={mouseTrail} onClick={() => setMouseTrail(!mouseTrail)}>
          Mouse trail
        </Button>
        <Button pressed={slow} onClick={() => setSlow(!slow)}>
          Slow phone
        </Button>
      </Header>

      <div className="lab__bar">
        <div className="lab__colours" role="radiogroup" aria-label="Your colour">
          {([1, 2, 3, 4, 5] as Colour[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === colour}
              aria-label={NAMES[c - 1]}
              className={c === colour ? 'lab__colour lab__colour--on' : 'lab__colour'}
              onClick={() => setColour(c)}
            >
              <Avatar player={{ name: NAMES[c - 1], color: c }} />
            </button>
          ))}
        </div>
        <span className="lab__divider" />
        <Button onClick={reveal.right}>Right</Button>
        <Button onClick={reveal.stolen}>Stolen</Button>
        <Button onClick={reveal.bought}>Bought</Button>
        <Button onClick={reveal.nobody}>Nobody</Button>
        <span className="lab__divider" />
        <Button onClick={others}>Others tap</Button>
        <Button onClick={together}>All at once</Button>
      </div>

      <div
        ref={area}
        className="lab__area"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <p className="lab__hint">Tap, drag, or press and hold. Tap a floating card to pop it.</p>

        <div ref={board} className="lab__board">
          <SongCard
            song={BOARD[0]}
            mark={<Mark right initial={youName[0]} label={`${youName} placed it: right`} />}
          />
          <SongCard
            song={BOARD[1]}
            mark={<Mark right initial={themName[0]} label={`${themName} guessed: right`} />}
          />
        </div>

        {FLOATING.map((card, index) =>
          popped.includes(index) ? null : (
            <div
              key={index}
              className="lab__float app-fade-in"
              style={{ left: card.left, top: card.top }}
              onPointerDown={(event) => popCard(index, event)}
            >
              <div className="jm-float" style={{ animationDelay: `${-index * 1.2}s` }}>
                <SongCard song={card.song} style={{ transform: `rotate(${card.rotate}deg)` }} />
              </div>
            </div>
          ),
        )}

        {ring && (
          <span
            key={ring.key}
            className={`lab__ring jm-p${colour}`}
            style={{ left: ring.x, top: ring.y, animationDuration: `${CHARGE_MS}ms` }}
          />
        )}
      </div>

      {popup && (
        <div key={popup.key} className="lab__popup">
          <Toast tone={popup.tone} icon={popup.icon}>
            {popup.text}
          </Toast>
        </div>
      )}
    </Screen>
  )
}
