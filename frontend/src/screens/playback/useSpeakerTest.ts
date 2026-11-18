import { useState } from 'react'
import type { Send } from '../../api/messages.ts'
import type { PlaybackTest } from '../../api/useRoom.ts'

/** How long the test plays (rooms.TEST_PLAYBACK_SECONDS). */
export const TEST_SECONDS = 5

/** ready → sent → playing (the server started it) → heard, or failed at any step. */
export type SpeakerTest = 'ready' | 'sent' | 'playing' | 'heard' | 'failed'

/** The speaker test: play 5 seconds, then ask whether it came out. */
export function useSpeakerTest(playbackTest: PlaybackTest | null, send: Send) {
  const [test, setTest] = useState<SpeakerTest>('ready')
  const [failure, setFailure] = useState<string | null>(null)
  // The answer last acted on; a new one moves the test along.
  const [answered, setAnswered] = useState(playbackTest)

  if (playbackTest !== answered) {
    setAnswered(playbackTest)
    if (playbackTest && test === 'sent') {
      setTest(playbackTest.ok ? 'playing' : 'failed')
      setFailure(playbackTest.ok ? null : playbackTest.message)
    }
  }

  return {
    test,
    /** Why the server couldn't start it; null when it started, or the listener heard nothing. */
    failure,
    play: () => {
      setFailure(null)
      setTest('sent')
      send({ type: 'test_playback' })
    },
    heard: () => setTest('heard'),
    nothing: () => setTest('failed'),
    /** Back to the start, after another speaker was picked. */
    reset: () => setTest('ready'),
  }
}
