import { useEffect, useState } from 'react'
import type { Send } from '../../api/messages.ts'
import type { PlaybackTest } from '../../api/useRoom.ts'

/** How long the test plays (rooms.TEST_PLAYBACK_SECONDS). */
export const TEST_SECONDS = 10

/** idle → starting (sent) → playing (the server started it) → idle, when stopped or done. */
export type SpeakerTest = 'idle' | 'starting' | 'playing'

/** The speaker test: tap to play a song for a while, tap again to stop it. */
export function useSpeakerTest(playbackTest: PlaybackTest | null, send: Send) {
  const [test, setTest] = useState<SpeakerTest>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  // The answer last acted on; a new one moves the test along.
  const [answered, setAnswered] = useState(playbackTest)

  if (playbackTest !== answered) {
    setAnswered(playbackTest)
    if (playbackTest && test === 'starting') {
      setTest(playbackTest.ok ? 'playing' : 'idle')
      setFailure(playbackTest.ok ? null : playbackTest.message)
    }
  }

  // The server stops the song after TEST_SECONDS; the button follows.
  useEffect(() => {
    if (test !== 'playing') return
    const timer = setTimeout(() => setTest('idle'), TEST_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [test])

  // The socket handles messages in order, so a stop sent while the test starts arrives once the
  // song plays, and stops it.
  const stop = () => {
    if (test !== 'idle') send({ type: 'stop_test' })
    setTest('idle')
  }

  return {
    test,
    /** Why the server couldn't start the last test; null when it started. */
    failure,
    /** Start the test, or stop it. */
    toggle: () => {
      if (test !== 'idle') return stop()
      setFailure(null)
      setTest('starting')
      send({ type: 'test_playback' })
    },
    /** Stop the test and forget its failure, after another speaker was picked. */
    reset: () => {
      stop()
      setFailure(null)
    },
  }
}
