/** GrabMerchant's on/off pill: green when on, grey when off. The whole 56px row height is tappable. */
export function Switch({ on, label, onChange, disabled = false, ...rest }: { on: boolean; label: string; onChange: (next: boolean) => void; disabled?: boolean; 'data-nav'?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex min-h-14 min-w-14 shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-4 focus-visible:outline-action disabled:cursor-default"
      {...rest}
    >
      <span className={`relative h-8 w-14 rounded-full transition-colors duration-200 ${on ? 'bg-grab' : 'bg-line ring-1 ring-field'}`}>
        <span className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : ''}`} />
      </span>
    </button>
  )
}
