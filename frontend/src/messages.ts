// Everything that crosses the WebSocket. Mirrors backend/src/jamster/messages.py by hand:
// change both together.

export interface RoomSettings {
  mode: 'local' | 'remote'
  cards_to_win: number
  starting_tokens: number
  deck_size: number
  strategy: string
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
  connected: boolean
  spotify: boolean
  library: Library | null
  device: string | null
}

export interface DeckView {
  status: 'none' | 'dealing' | 'error'
  done: number
  total: number
  error: string | null
}

export interface PlaybackView {
  status: 'idle' | 'starting' | 'playing' | 'failed'
  failures: { player_id: string; message: string }[]
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
  phase: 'placing' | 'challenging' | 'revealed' | 'finished'
  turn_number: number
  active: string
  deck_remaining: number
  players: GamePlayerView[]
  slot: number | null
  challenges: { player_id: string; slot: number | null }[]
  passed: string[]
  card: RevealedCard | null
  outcome: { correct: boolean; card_to: string | null } | null
  named: boolean | null
  winners: string[]
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

// The host may act for any player (hot seat) by naming them in as_player.
interface Acting {
  as_player?: string
}

export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'add_player'; name: string }
  | { type: 'remove_player'; player_id: string }
  | { type: 'set_settings'; settings: RoomSettings }
  | { type: 'start_game' | 'end_game' }
  | { type: 'get_devices' | 'test_playback' | 'retry_playback' }
  | { type: 'set_device'; device_id: string | null; name: string | null }
  | ({ type: 'place' | 'pick_slot'; slot: number } & Acting)
  | ({ type: 'lock' | 'skip' | 'buzz' | 'pass' | 'buy' } & Acting)
  | { type: 'reveal' | 'next_turn' }
  | { type: 'set_named'; value: boolean }

export type Send = (message: ClientMessage) => void
