import type { ReactNode } from 'react'

// Each mix's picture, from docs/design/system/components/MixCard: drawn on a 120 × 72 grid, outlined
// in ink, filled from the palette through the a- classes in jamster.css.
const PICTURES: Record<string, ReactNode> = {
  // Two cassettes level on a seesaw.
  balanced: (
    <>
      <path className="a-line-subtle" d="M14 64H106" strokeWidth="1.8" />
      <path className="a-mustard" d="M60 44 49 63H71Z" strokeWidth="2.2" />
      <rect className="a-label" x="10" y="39" width="100" height="5" rx="2.5" strokeWidth="2.2" />
      <rect className="a-coral" x="15" y="16" width="36" height="23" rx="3" strokeWidth="2" />
      <rect className="a-label" x="19" y="19" width="28" height="8" rx="1.5" strokeWidth="1.4" />
      <rect className="a-window" x="24" y="30" width="18" height="6" rx="3" />
      <circle className="a-label" cx="28" cy="33" r="2" />
      <circle className="a-label" cx="38" cy="33" r="2" />
      <rect className="a-coral" x="69" y="16" width="36" height="23" rx="3" strokeWidth="2" />
      <rect className="a-label" x="73" y="19" width="28" height="8" rx="1.5" strokeWidth="1.4" />
      <rect className="a-window" x="78" y="30" width="18" height="6" rx="3" />
      <circle className="a-label" cx="82" cy="33" r="2" />
      <circle className="a-label" cx="92" cy="33" r="2" />
    </>
  ),
  // A hand holding one card up to show it.
  show_and_tell: (
    <>
      <path d="M38 12 31 8M37 22H29M82 12 89 8M83 22H91" strokeWidth="2" />
      <rect className="a-mustard" x="46" y="4" width="28" height="38" rx="4" strokeWidth="2.2" />
      <circle className="a-coral" cx="60" cy="15" r="4.5" strokeWidth="1.8" />
      <path d="M53 25H67M55 30H65" strokeWidth="1.8" />
      <path className="a-label" d="M51 48 49 72H71L69 48Z" strokeWidth="2.2" />
      <path className="a-coral" d="M49.5 62 49 72H71L70.5 62Z" strokeWidth="2.2" />
      <rect className="a-label" x="47" y="34" width="26" height="16" rx="6" strokeWidth="2.2" />
      <path d="M53.5 35V41M60 35V41M66.5 35V41" strokeWidth="1.6" />
      <path d="M47.5 44C43 43 42 38 44 34" strokeWidth="2" />
    </>
  ),
  // A joker card in front of a face-down card.
  wildcards: (
    <>
      <g transform="rotate(-12 50 38)">
        <rect className="a-coral" x="31" y="10" width="38" height="54" rx="5" strokeWidth="2.2" />
        <rect x="36" y="15" width="28" height="44" rx="3" strokeWidth="1.4" strokeDasharray="2 3" />
      </g>
      <g transform="rotate(9 66 37)">
        <rect className="a-label" x="47" y="8" width="38" height="56" rx="5" strokeWidth="2.2" />
        <path className="a-mustard" d="M54 44 56.5 23 62.5 34 66 18 69.5 34 75.5 23 78 44Z" strokeWidth="2" />
        <rect className="a-coral" x="52.5" y="43" width="27" height="6" rx="2" strokeWidth="1.8" />
        <circle className="a-coral" cx="56.5" cy="22" r="2.6" strokeWidth="1.4" />
        <circle className="a-coral" cx="66" cy="17" r="2.6" strokeWidth="1.4" />
        <circle className="a-coral" cx="75.5" cy="22" r="2.6" strokeWidth="1.4" />
        <path d="M52 56H58M74 56H80" strokeWidth="1.6" />
      </g>
      <path d="M101 9V21M95 15H107" strokeWidth="2.2" />
      <path d="M17 50V58M13 54H21" strokeWidth="2" />
    </>
  ),
  // A profile head with a question mark, and stars around it.
  deep_dive: (
    <>
      <path className="a-coral" d="M34 70C34 54 46 47 60 47 74 47 86 54 86 70Z" strokeWidth="2.2" />
      <circle className="a-mustard" cx="60" cy="27" r="15" strokeWidth="2.2" />
      <path d="M54.5 22.5A5.5 5.5 0 1 1 62.5 27.5C60.5 28.5 60 30 60 32" strokeWidth="2.8" />
      <circle className="a-ink" cx="60" cy="37" r="1.8" />
      <path className="a-mustard" d="M22 11 24.1 15.9 29 18 24.1 20.1 22 25 19.9 20.1 15 18 19.9 15.9Z" strokeWidth="1.6" />
      <path className="a-label" d="M98 8 99.8 12.2 104 14 99.8 15.8 98 20 96.2 15.8 92 14 96.2 12.2Z" strokeWidth="1.6" />
      <path className="a-mustard" d="M104 35.5 105.35 38.65 108.5 40 105.35 41.35 104 44.5 102.65 41.35 99.5 40 102.65 38.65Z" strokeWidth="1.4" />
      <path className="a-label" d="M16 39.5 17.35 42.65 20.5 44 17.35 45.35 16 48.5 14.65 45.35 11.5 44 14.65 42.65Z" strokeWidth="1.4" />
    </>
  ),
  // A dusty cassette from 2009, a cobweb in its corner.
  nostalgia: (
    <>
      <rect className="a-coral" x="20" y="12" width="80" height="52" rx="6" strokeWidth="2.4" />
      <rect className="a-sand" x="28" y="18" width="64" height="21" rx="3" strokeWidth="1.6" />
      <path className="a-line-subtle" d="M34 25Q38 22 42 25T50 25 58 25" strokeWidth="1.6" />
      <text className="a-muted" x="54" y="35" fontSize="8">2009</text>
      <rect className="a-window" x="40" y="44" width="40" height="12" rx="6" />
      <circle className="a-label" cx="50" cy="50" r="4" strokeWidth="1.4" />
      <circle className="a-label" cx="70" cy="50" r="4" strokeWidth="1.4" />
      <path d="M99 13L73 13M99 13L75.4 24M99 13L82.3 32.9M99 13L92.3 38.1M99 13L99 39M91 13Q92.6 14.4 91.7 16.4Q93.8 17 93.9 19.1Q96 18.8 96.9 20.7Q98.1 19.5 99 21M84 13Q87 15.7 85.4 19.3Q89.2 20.5 89.4 24.5Q93.3 23.9 95.1 27.5Q97.4 25.2 99 28M76 13Q80.6 17.1 78.2 22.7Q84 24.5 84.2 30.6Q90.3 29.7 93 35.2Q96.5 31.7 99 36" strokeWidth="1.5" />
      <circle className="a-label" cx="26" cy="48" r="1.1" />
      <circle className="a-label" cx="32" cy="58" r="1.3" />
      <circle className="a-label" cx="88" cy="50" r="1.1" />
      <circle className="a-label" cx="93" cy="58" r="1.3" />
      <circle className="a-label" cx="84" cy="60" r="1" />
      <circle className="a-subtle" cx="14" cy="22" r="1.4" />
      <circle className="a-subtle" cx="10" cy="34" r="1" />
      <circle className="a-subtle" cx="108" cy="50" r="1.2" />
    </>
  ),
}

/** The picture of a deck mix; nothing for a mix that has none yet. Decoration: the name says it. */
export function MixArt({ mix }: { mix: string }) {
  const picture = PICTURES[mix]
  if (!picture) return null
  return (
    <svg className="jm-mix-art" viewBox="0 0 120 72" aria-hidden="true">
      {picture}
    </svg>
  )
}
