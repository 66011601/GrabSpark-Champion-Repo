import { th } from '@/copy/th.ts'

/** A drawn stand-in for the map, when the real map pictures cannot load. */
export function DrawnMap({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 160" role="img" aria-label={th.review.mapAlt(label)} className="block h-40 w-full bg-canvas">
      <path d="M0 60 H320 M0 120 H320 M110 0 V160 M230 0 V160" className="stroke-line" strokeWidth="14" fill="none" />
      <path d="M110 60 L230 120" className="stroke-line" strokeWidth="8" fill="none" />
      <rect x="248" y="18" width="48" height="30" rx="6" className="fill-grab/30" />
      <g transform="translate(160 86)">
        <path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" className="fill-action" />
        <circle cx="0" cy="-17" r="8" className="fill-surface" />
      </g>
    </svg>
  )
}
