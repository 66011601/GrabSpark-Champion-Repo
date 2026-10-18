/** Bubble text → what the Thai voice should read: no symbols it would spell out letter by letter. */
export function toSpeech(text: string): string {
  return text
    // Her name is written in English; the Thai voice says it the Thai way.
    .replace(/Grabbie/gi, 'แกร็บบี้')
    .replace(/0\dx-xxx-(\d{4})/g, (_, tail: string) => `ที่ลงท้ายด้วย ${tail.split('').join(' ')}`)
    .replace(/เช่น\s+\S+@\S+/g, '')
    .replace(/@/g, 'เครื่องหมายแอท')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
