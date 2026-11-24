// The confetti engine's logic: presets as data, the physics as pure functions, and the drawing.
// `Confetti.tsx` owns the canvas and the loop. Everything is in design pixels (the 844 × 390 frame
// before `AppFrame`'s zoom) and seconds.
//
// The look is flat paper confetti: strips, squares and dots that turn over as they fall, showing
// a darker back, and curly streamers. It's drawn for speed: every piece is placed by hand into
// one path per colour, so a frame costs a handful of fills and strokes however many pieces fly.

export type Shape = 'strip' | 'square' | 'dot' | 'streamer'

export interface Point {
  x: number
  y: number
}

export interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  /** Radians, and radians per second. */
  angle: number
  spin: number
  size: number
  shape: Shape
  /** A resolved CSS colour. */
  color: string
  /** The colour of the paper's back, worked out once. */
  back: string
  age: number
  life: number
  gravity: number
  drag: number
  /** Flutter: the phase that turns the paper over and sways it sideways. */
  phase: number
  /** Where the piece flies to (a steal); it is gone once it gets there. */
  target?: Point
}

export interface Preset {
  count: number
  /** Design px per second, from–to. */
  speed: [number, number]
  /** The direction of the burst, in degrees: −90 is straight up. */
  angle: number
  /** How far either side of `angle` pieces may go, in degrees: 180 is all round. */
  spread: number
  gravity: number
  /** How quickly the air slows a piece, per second. */
  drag: number
  /** The largest spin, in turns per second. */
  spin: number
  /** Seconds, from–to. */
  life: [number, number]
  /** Design px, from–to. */
  size: [number, number]
  /** Picked at random; list a shape twice to make it more common. */
  shapes: Shape[]
  /** Token names (`--coral`) or CSS colours; picked at random. */
  colors: string[]
  /** Pieces start this far from the point at most, so a burst isn't one dot at first. */
  jitter?: number
  /** Fly to this point and vanish there (a steal). */
  target?: Point
}

/** The mixed palette, for a burst that belongs to no one. */
export const PARTY = ['--coral', '--mustard', '--right', '--player-4', '--player-5', '--label']

/** A player's burst: mostly their colour, with paper white and the odd gold. */
export function tinted(color: string): string[] {
  return [color, color, color, color, '--label', '--mustard']
}

const PAPER: Shape[] = ['strip', 'strip', 'strip', 'dot', 'dot']
const PARTY_SHAPES: Shape[] = [...PAPER, 'dot', 'streamer']

/** The reveal: the player on turn (or a challenger) got it right. A lively burst upward. */
export function right(colors: string[] = PARTY): Preset {
  return {
    count: 56,
    speed: [260, 560],
    angle: -90,
    spread: 55,
    gravity: 900,
    drag: 1.4,
    spin: 1.6,
    life: [1.4, 2.2],
    size: [11, 16],
    shapes: PARTY_SHAPES,
    colors,
    jitter: 6,
  }
}

/** A steal: pieces rise off the player on turn's card and fly over to the challenger's. */
export function steal(to: Point, colors: string[] = PARTY): Preset {
  return {
    count: 37,
    speed: [180, 380],
    angle: -90,
    spread: 50,
    gravity: 0,
    drag: 0.4,
    spin: 1.4,
    life: [2.4, 3],
    size: [10, 14],
    shapes: PARTY_SHAPES,
    colors,
    jitter: 6,
    target: to,
  }
}

/** A bought card: no one guessed, so a small, slow shower of gold. */
export function bought(): Preset {
  return {
    count: 18,
    speed: [120, 260],
    angle: -90,
    spread: 45,
    gravity: 650,
    drag: 1.2,
    spin: 1,
    life: [1.1, 1.6],
    size: [11, 14],
    shapes: ['dot'],
    colors: ['--mustard', '--mustard', '--mustard', '--label'],
    jitter: 4,
  }
}

/** The winner screen: a tap. A ring of pieces round the finger. */
export function tap(colors: string[]): Preset {
  return {
    count: 27,
    speed: [160, 400],
    angle: -90,
    spread: 180,
    gravity: 800,
    drag: 1.6,
    spin: 1.6,
    life: [1, 1.6],
    size: [10, 14],
    shapes: [...PAPER, 'streamer'],
    colors,
  }
}

/** The winner screen: the sparkler behind a dragging finger or a moving cursor. */
export function trail(colors: string[]): Preset {
  return {
    count: 2,
    speed: [20, 90],
    angle: -90,
    spread: 180,
    gravity: 420,
    drag: 2,
    spin: 2,
    life: [0.5, 0.9],
    size: [7, 10],
    shapes: PAPER,
    colors,
    jitter: 3,
  }
}

/** The winner screen: let go after a hold. `power` 0 to 1 grows with the hold. */
export function charged(power: number, colors: string[]): Preset {
  const p = Math.max(0, Math.min(1, power))
  return {
    count: Math.round(29 + 120 * p),
    speed: [220 + 260 * p, 440 + 620 * p],
    angle: -90,
    spread: 70 + 110 * (1 - p),
    gravity: 850,
    drag: 1.3,
    spin: 1.6,
    life: [1.3 + 0.6 * p, 2 + 1 * p],
    size: [11 + 3 * p, 15 + 6 * p],
    shapes: p > 0.5 ? [...PARTY_SHAPES, 'square'] : PARTY_SHAPES,
    colors,
    jitter: 4 + 8 * p,
  }
}

/** The winner screen: a floating card popped into pieces, with some in the popper's colour. */
export function pop(color = '--coral'): Preset {
  return {
    count: 35,
    speed: [220, 480],
    angle: -90,
    spread: 180,
    gravity: 750,
    drag: 1.5,
    spin: 1.8,
    life: [1.1, 1.7],
    size: [11, 15],
    shapes: ['strip', 'strip', 'streamer', 'square', 'dot'],
    colors: ['--label', '--label', '--mustard', color, color],
    jitter: 14,
  }
}

const between = ([from, to]: [number, number], random: () => number) =>
  from + (to - from) * random()

/** The pieces of one burst at (x, y). `resolve` turns a token name into a colour. */
export function spawn(
  preset: Preset,
  at: Point,
  resolve: (color: string) => string,
  random: () => number = Math.random,
): Piece[] {
  const pieces: Piece[] = []
  for (let i = 0; i < preset.count; i++) {
    const direction = ((preset.angle + (random() * 2 - 1) * preset.spread) * Math.PI) / 180
    const speed = between(preset.speed, random)
    const color = resolve(preset.colors[Math.floor(random() * preset.colors.length)])
    const jitter = (preset.jitter ?? 0) * random()
    const offset = random() * Math.PI * 2
    pieces.push({
      x: at.x + Math.cos(offset) * jitter,
      y: at.y + Math.sin(offset) * jitter,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      angle: random() * Math.PI * 2,
      spin: (random() * 2 - 1) * preset.spin * Math.PI * 2,
      size: between(preset.size, random),
      shape: preset.shapes[Math.floor(random() * preset.shapes.length)],
      color,
      back: darken(color),
      age: 0,
      life: between(preset.life, random),
      gravity: preset.gravity,
      drag: preset.drag,
      phase: random() * Math.PI * 2,
      target: preset.target,
    })
  }
  return pieces
}

/** Close enough to a steal's target to count as there. */
const ARRIVED = 10
/** A steal's pieces rise freely this long, in seconds, so it starts on the card like any burst; */
const RISE = 0.3
/** then the pull towards the target grows to full over this long. */
const STEER = 0.6

/** Moves every piece on by `dt` seconds and drops the ones whose time is up. */
export function step(pieces: Piece[], dt: number): Piece[] {
  // In place: the live pieces move to the front and the array is cut after them.
  let kept = 0
  for (const piece of pieces) {
    piece.age += dt
    if (piece.age >= piece.life) continue
    if (piece.target) {
      // Steer: first a free rise, straight up from where the burst was, then a pull towards the
      // target that grows, and a brake on the rest of the speed, so the rise curves over and lands.
      const dx = piece.target.x - piece.x
      const dy = piece.target.y - piece.y
      if (Math.hypot(dx, dy) < ARRIVED) continue
      const steer = Math.min(1, Math.max(0, piece.age - RISE) / STEER)
      const pull = 40 * steer
      const brake = 0.5 + 5 * steer
      piece.vx += (dx * pull - piece.vx * brake) * dt
      piece.vy += (dy * pull - piece.vy * brake) * dt
    } else {
      piece.vy += piece.gravity * dt
      // Paper sways as it falls.
      piece.vx += Math.sin(piece.age * 7 + piece.phase) * 60 * dt
    }
    const slow = Math.exp(-piece.drag * dt)
    piece.vx *= slow
    piece.vy *= slow
    piece.x += piece.vx * dt
    piece.y += piece.vy * dt
    piece.angle += piece.spin * dt
    pieces[kept++] = piece
  }
  pieces.length = kept
  return pieces
}

/** Pieces pop in, then shrink away over the end of their life (and as a steal's land): a
    shrink needs no transparency, so every piece of a colour still shares one fill. */
function scaleOf(piece: Piece): number {
  const left = piece.life - piece.age
  const grow = Math.min(1, piece.age / 0.08)
  let shrink = Math.min(1, left / 0.35)
  if (piece.target) {
    const distance = Math.hypot(piece.target.x - piece.x, piece.target.y - piece.y)
    shrink = Math.min(shrink, distance / 40)
  }
  return Math.max(0, Math.min(grow, shrink))
}

/** A `#rgb` or `#rrggbb` colour a little darker; any other colour as it is. */
export function darken(color: string, by = 0.82): string {
  let hex = color.trim()
  if (/^#[0-9a-f]{3}$/i.test(hex)) hex = '#' + [...hex.slice(1)].map((c) => c + c).join('')
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return color
  const channel = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * by)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(1)}${channel(3)}${channel(5)}`
}

// Drawing. Every shape is turned, squashed and placed by hand and added to its colour's path, so
// the canvas needs no save, restore or transform per piece.

/** How far each axis has turned: a paper's width and height swing with these. */
const across = (piece: Piece) => Math.cos(piece.age * 8 + piece.phase)
const down = (piece: Piece) => Math.cos(piece.age * 11 + piece.phase * 1.7)

/** Whether the paper's back shows: a dot turns on one axis, a rectangle on two. */
function turnedOver(piece: Piece): boolean {
  return piece.shape === 'dot' ? across(piece) < 0 : across(piece) * down(piece) < 0
}

/** Adds a polygon given as points round (0, 0) in the piece's own frame, scaled by (w, h) and
    turned by its angle. */
function addPolygon(path: Path2D, piece: Piece, points: readonly number[], w: number, h: number) {
  const cos = Math.cos(piece.angle)
  const sin = Math.sin(piece.angle)
  for (let i = 0; i < points.length; i += 2) {
    const px = points[i] * w
    const py = points[i + 1] * h
    const x = piece.x + px * cos - py * sin
    const y = piece.y + px * sin + py * cos
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()
}

const RECTANGLE = [1, 1, -1, 1, -1, -1, 1, -1] as const
/** A dot is an octagon: at confetti size nobody can tell it from a circle, and it needs no arc. */
const OCTAGON = Array.from({ length: 8 }, (_, i) => [
  Math.cos((i * Math.PI) / 4),
  Math.sin((i * Math.PI) / 4),
]).flat()

function addPaper(path: Path2D, piece: Piece) {
  const s = piece.size * scaleOf(piece)
  if (s <= 0) return
  if (piece.shape === 'dot') {
    const r = s * 0.34
    addPolygon(path, piece, OCTAGON, r * across(piece), r)
    return
  }
  const square = piece.shape === 'square'
  const w = (square ? 0.36 : 0.5) * s * across(piece)
  const h = (square ? 0.36 : 0.2) * s * down(piece)
  addPolygon(path, piece, RECTANGLE, w, h)
}

/** The streamers' line width, the same for all so they share one stroke per colour. */
const STREAMER_WIDTH = 2.6

/** A streamer as two quadratic curves: one wave that keeps wriggling, five points in all. */
function addStreamer(path: Path2D, piece: Piece) {
  const s = piece.size * scaleOf(piece)
  if (s <= 0) return
  const half = s * 1.1
  const bend = s * 0.55 * Math.sin(piece.age * 10 + piece.phase)
  const cos = Math.cos(piece.angle)
  const sin = Math.sin(piece.angle)
  const at = (px: number, py: number): [number, number] => [
    piece.x + px * cos - py * sin,
    piece.y + px * sin + py * cos,
  ]
  path.moveTo(...at(-half, 0))
  path.quadraticCurveTo(...at(-half / 2, bend), ...at(0, 0))
  path.quadraticCurveTo(...at(half / 2, -bend), ...at(half, 0))
}

/** Draws every piece: one path per colour, filled (paper) or stroked (streamers) once each, so a
    hundred pieces cost a handful of calls. */
export function drawAll(ctx: CanvasRenderingContext2D, pieces: Piece[]) {
  const fills = new Map<string, Path2D>()
  const strokes = new Map<string, Path2D>()
  const pathFor = (paths: Map<string, Path2D>, colour: string) => {
    let path = paths.get(colour)
    if (!path) {
      path = new Path2D()
      paths.set(colour, path)
    }
    return path
  }
  for (const piece of pieces) {
    if (piece.shape === 'streamer') addStreamer(pathFor(strokes, piece.color), piece)
    else addPaper(pathFor(fills, turnedOver(piece) ? piece.back : piece.color), piece)
  }
  for (const [colour, path] of fills) {
    ctx.fillStyle = colour
    ctx.fill(path)
  }
  if (strokes.size > 0) {
    ctx.lineWidth = STREAMER_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const [colour, path] of strokes) {
      ctx.strokeStyle = colour
      ctx.stroke(path)
    }
  }
}

/** How far past its centre any piece may draw, streamers included, in design px. */
const REACH = 30

/** The box every piece is inside, in design px; null when there are none. */
export function bounds(
  pieces: Piece[],
): { left: number; top: number; right: number; bottom: number } | null {
  if (pieces.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const piece of pieces) {
    if (piece.x < left) left = piece.x
    if (piece.x > right) right = piece.x
    if (piece.y < top) top = piece.y
    if (piece.y > bottom) bottom = piece.y
  }
  return { left: left - REACH, top: top - REACH, right: right + REACH, bottom: bottom + REACH }
}

// Size on desktop. A phone zooms the 844 × 390 design to fill the screen, and the confetti with
// it. The desktop layouts aren't zoomed, so at design size the confetti would look tiny on a big
// screen; it gets its own zoom instead.

/** The share of the phone's fill-the-screen zoom that desktop confetti gets: a little less, as the
    desktop layouts set more on the screen than the phone's. */
const DESKTOP_SHARE = 0.75
/** The desktop zoom stays between these, from a small window to a very large screen. */
const DESKTOP_MIN = 1.25
const DESKTOP_MAX = 2

/** How much larger confetti is drawn on desktop, for a window of this size in CSS pixels: pieces,
    speeds and distances all grow with it, so a burst covers as much of the screen. */
export function desktopZoom(width: number, height: number): number {
  const fill = Math.min(width / 844, height / 390)
  return Math.max(DESKTOP_MIN, Math.min(DESKTOP_MAX, fill * DESKTOP_SHARE))
}

// Quality: on a device that can't keep up, new bursts get fewer pieces.

/** A frame slower than this, on average, means confetti is too much for the device. */
export const SLOW_FRAME_MS = 20
/** At or under this, frames are back to usual and quality creeps back up. */
const USUAL_FRAME_MS = 18
/** Bursts never get thinner than this share of their pieces. */
export const MIN_QUALITY = 0.2
/** A gap longer than this is a hidden tab or a stall, not a slow frame. */
export const IGNORED_FRAME_MS = 250

/** The running average of frame times, so one slow frame alone (a garbage collection) cuts
    nothing. */
export function smoothFrame(average: number, ms: number): number {
  return average * 0.8 + ms * 0.2
}

/** The share of a burst's pieces to make, after a frame with this running average: down 5% a
    slow frame, back up 1% a usual one, so it drops fast and recovers gently. */
export function nextQuality(quality: number, average: number): number {
  if (average > SLOW_FRAME_MS) return Math.max(MIN_QUALITY, quality * 0.95)
  if (average <= USUAL_FRAME_MS) return Math.min(1, quality + 0.01)
  return quality
}
