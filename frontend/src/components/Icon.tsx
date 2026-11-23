import type { ReactNode } from 'react'

// The icon set: inline SVG on a 24px grid, stroke 2.4, round caps and joins, currentColor.
// ✕ and ✓ use a heavier stroke. The skip triangle is the one filled shape.
const ICONS = {
  restart: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
  },
  refresh: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 4v4.5h4.5" />
      </>
    ),
  },
  plus: { stroke: 2.4, shape: <path d="M12 5v14M5 12h14" /> },
  minus: { stroke: 2.4, shape: <path d="M5 12h14" /> },
  skip: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M5 5l10 7-10 7z" fill="currentColor" />
        <path d="M19 5v14" />
      </>
    ),
  },
  edit: { stroke: 2.4, shape: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /> },
  close: { stroke: 2.6, shape: <path d="M7 7l10 10M17 7L7 17" /> },
  pass: { stroke: 3, shape: <path d="M6 6l12 12M18 6L6 18" /> },
  check: { stroke: 3, shape: <path d="M5 12.5l4.5 4.5L19 7" /> },
  gear: {
    stroke: 2.2,
    shape: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
  back: { stroke: 2.4, shape: <path d="M19 12H5M11 6l-6 6 6 6" /> },
  forward: { stroke: 2.4, shape: <path d="M5 12h14M13 6l6 6-6 6" /> },
  music: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M9 18V6l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="16" r="2.5" />
      </>
    ),
  },
  speaker: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        <path d="M15.5 9a4 4 0 0 1 0 6" />
      </>
    ),
  },
  speakerOff: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        <path d="M16 9l5 6M21 9l-5 6" />
      </>
    ),
  },
  info: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M12 11v6" />
        <path d="M12 7.5h.01" />
      </>
    ),
  },
  search: {
    stroke: 2.4,
    shape: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M20 20l-4.2-4.2" />
      </>
    ),
  },
  link: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </>
    ),
  },
  // Safari's Share: a box with an arrow up out of it.
  share: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M12 3v12M8 7l4-4 4 4" />
        <path d="M8.5 10H6v11h12V10h-2.5" />
      </>
    ),
  },
  trash: { stroke: 2.4, shape: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /> },
  signOut: { stroke: 2.4, shape: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /> },
  offline: {
    stroke: 2.4,
    shape: (
      <>
        <path d="M3 3l18 18" />
        <path d="M8.5 16.4a5 5 0 0 1 7 0" />
        <path d="M5 12.9a10 10 0 0 1 4.2-2.4M19 12.9a10 10 0 0 0-3-2" />
        <path d="M2 9a15 15 0 0 1 4.5-2.7M22 9a15 15 0 0 0-9-3.9" />
        <path d="M12 20h.01" />
      </>
    ),
  },
  tv: {
    stroke: 2.4,
    shape: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
      </>
    ),
  },
  laptop: {
    stroke: 2.4,
    shape: (
      <>
        <rect x="4" y="5" width="16" height="11" rx="1.5" />
        <path d="M2 19h20" />
      </>
    ),
  },
  phone: {
    stroke: 2.4,
    shape: (
      <>
        <rect x="7" y="2.5" width="10" height="19" rx="2" />
        <path d="M11 18.5h2" />
      </>
    ),
  },
  deviceSpeaker: {
    stroke: 2.4,
    shape: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <circle cx="12" cy="14" r="3" />
        <path d="M12 7h.01" />
      </>
    ),
  },
} satisfies Record<string, { stroke: number; shape: ReactNode }>

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  /** Width and height in px. Leave it out where the surrounding class sizes the icon. */
  size?: number
  strokeWidth?: number
}

/** Decorative: the button or element around it carries the label. */
export function Icon({ name, size, strokeWidth }: IconProps) {
  const { stroke, shape } = ICONS[name]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape}
    </svg>
  )
}
