import { Button } from './Button.tsx'
import { Icon } from './Icon.tsx'
import type { FullScreenOffer } from './useFullScreen.ts'

interface FullScreenPromptProps {
  offer: FullScreenOffer
  onFullScreen: () => void
  onClose: () => void
}

/**
 * The screen that asks to play without the browser's bar: a Go full screen button where the
 * page can do it, else the steps to add Jamster to the home screen through Safari's Share menu,
 * which no page can open. It covers the screen it's over.
 */
export function FullScreenPrompt({ offer, onFullScreen, onClose }: FullScreenPromptProps) {
  return (
    <section className="app-full-screen" role="dialog" aria-modal="true" aria-label="Full screen">
      {offer === 'button' ? (
        <>
          <Button
            onClick={onClose}
            variant="bare"
            size="icon"
            aria-label="Not now"
            className="app-full-screen__close"
          >
            <Icon name="close" />
          </Button>
          <p className="jm-headline app-full-screen__text">
            Use full screen for the best experience.
          </p>
          <Button variant="primary" onClick={onFullScreen}>
            Go full screen
          </Button>
        </>
      ) : (
        <>
          <p className="jm-headline app-full-screen__text">
            Install Jamster to your home screen for the best experience. Tap Share{' '}
            <span className="app-full-screen__icon">
              <Icon name="share" size={18} />
            </span>
            , then <b>Add to Home Screen</b>.
          </p>
          <Button variant="primary" onClick={onClose}>
            Got it
          </Button>
        </>
      )}
    </section>
  )
}
