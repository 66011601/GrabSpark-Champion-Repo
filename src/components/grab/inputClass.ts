/** GrabMerchant's text box: rounded, thin border, green when focused. */
export const inputClass = (invalid = false) =>
  `min-h-14 w-full rounded-xl border bg-surface px-4 text-lg transition-colors placeholder:text-ink-muted focus:border-action focus:ring-2 focus:ring-grab/25 focus:outline-none ${invalid ? 'border-warn-ink' : 'border-field'}`
