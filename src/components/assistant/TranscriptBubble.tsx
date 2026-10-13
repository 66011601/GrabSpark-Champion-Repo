/** What the merchant said, on the right like a chat message. Interim text is grey and italic. */
export function TranscriptBubble({ text, final }: { text: string; final: boolean }) {
  return (
    <p
      aria-live="polite"
      className={`ml-auto max-w-[85%] rounded-3xl rounded-tr-md bg-canvas px-4 py-3 text-lg ${final ? 'text-ink' : 'italic text-ink-muted'}`}
    >
      {text}
    </p>
  )
}
