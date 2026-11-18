// Everything that crosses the WebSocket. Mirrors backend/src/jamster/messages.py by hand:
// change both together.

export interface RoomSettings {
  mode: 'local' | 'remote'
  cards_to_win: number
  starting_tokens: number
  deck_size: number
  strategy: string
  challenge_seconds: number
  next_turn_seconds: number // 0: no automatic next turn
}

export interface Library {
  status: 'none' | 'running' | 'done' | 'error'
  detail: string
  tracks: number
}

export interface PlayerView {
  id: string
  name: string
  is_host: boolean
  connected: boolean // false for local players and for players who are away
  local: boolean // a hot-seat player, whom the host plays for
  spotify: boolean
  library: Library | null
  device: string | null
}

export interface DeckView {
  status: 'none' | 'dealing' | 'error'
  done: number
  total: number
  error: string | null
  order: string[] // while dealing: the player ids in turn order, shuffled up front
  dealt: CardView[] // the starting cards so far, one per player in `order`
}

export interface PlaybackView {
  status: 'idle' | 'starting' | 'playing' | 'failed'
  failures: { player_id: string; message: string }[]
  elapsed_ms: number | null // once playing or failed: how far the song is
  duration_ms: number | null // the length of the song in play
}

export interface CardView {
  id: string
  name: string
  artists: string[]
  year: number
  image_url: string | null
}

export interface RevealedCard extends CardView {
  year_source: string
  known_by: string[]
}

export interface GamePlayerView {
  id: string
  tokens: number
  timeline: CardView[]
}

export interface GameView {
  phase: 'placing' | 'challenging' | 'picking' | 'revealed' | 'finished'
  turn_number: number
  active: string
  deck_remaining: number
  players: GamePlayerView[]
  slot: number | null
  challenges: { player_id: string; slot: number | null; locked: boolean }[]
  passed: string[]
  card: RevealedCard | null
  // bought: the player on turn bought the card instead of guessing
  outcome: { correct: boolean; card_to: string | null; bought: boolean } | null
  named: boolean | null
  winners: string[]
  drawing: boolean // the next card's year is being looked up; draws wait until it is done
  window_left_ms: number | null // while challenging: time left until the window closes
  advance_left_ms: number | null // once revealed: time left until the next turn starts by itself
}

export interface RoomView {
  code: string
  settings: RoomSettings
  strategies: string[]
  players: PlayerView[]
  deck: DeckView
  playback: PlaybackView
  game: GameView | null
}

export interface StateMessage {
  type: 'state'
  you: { player_id: string | null; is_host: boolean; spotify: boolean }
  room: RoomView
}

export interface Device {
  id: string
  name: string
  kind: string
  is_active: boolean
}

export type ServerMessage =
  | StateMessage
  | { type: 'error'; message: string }
  | { type: 'devices'; devices: Device[] }
  | { type: 'playback_test'; ok: boolean; message: string }

// The host plays for a local (hot-seat) player by naming them in as_player.
interface Acting {
  as_player?: string
}

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'add_player'; name: string }
  /** Yourself; the host may also rename a hot-seat player. Lobby only. */
  | { type: 'rename'; player_id: string; name: string }
  | { type: 'remove_player'; player_id: string }
  | { type: 'leave_room' | 'close_room' }
  | { type: 'set_settings'; settings: RoomSettings }
  | { type: 'start_game' | 'end_game' }
  | { type: 'get_devices' | 'test_playback' | 'retry_playback' | 'restart_playback' | 'hold_turn' }
  /** Stop the speaker test before its time is up: the player tapped Stop. */
  | { type: 'stop_test' }
  | { type: 'set_device'; device_id: string | null; name: string | null }
  | ({ type: 'place' | 'pick_slot'; slot: number } & Acting)
  | ({ type: 'lock' | 'lock_pick' | 'skip' | 'buzz' | 'pass' | 'buy' } & Acting)
  | { type: 'reveal' | 'next_turn' | 'skip_turn' }
  | { type: 'set_named'; value: boolean }

export type Send = (message: ClientMessage) => void
