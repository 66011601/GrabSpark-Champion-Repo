/** The outline a step puts on what the AI is pointing at. */
export const mark = (highlight: string | null, id: string) => (highlight === id ? 'ring-4 ring-grab ring-offset-2' : '')
