// Records the companion's lines with Google Cloud Text-to-Speech, so she sounds the same on every device.
//
//   npm run voice            records lines that have no recording yet (and drops recordings no longer used)
//   TTS_VOICE=gemini npm run voice    the Gemini voice with its style prompt (needs the Vertex AI API on)
//
// The lines are every sentence in src/copy/th.ts plus scripts/voice/spoken.json: lines heard while running the demo
// (dish names, prices, the sample shop), collected in the dev server with
// `copy(JSON.stringify([...window.__spokenLines], null, 1))`.
// The key is read from GOOGLE_TTS_API_KEY (or .env.local) and is never written anywhere. A key restricted to the
// site's address needs TTS_REFERER set to that address. Output: public/voice/<id>.mp3 and public/voice/manifest.json.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = new URL('../../', import.meta.url)
const OUT = new URL('public/voice/', ROOT)
const SPOKEN = new URL('scripts/voice/spoken.json', ROOT)

// The companion is a cute little girl. The Chirp 3 HD voices need no extra API but take no style or pitch, so the
// youthful voice (Leda) is recorded a little slow and played back faster without keeping its pitch: higher and
// younger, at about the normal speed (0.88 × 1.18 ≈ 1.04). Gemini takes a style prompt instead.
const VOICES = {
  chirp: { label: 'th-TH-Chirp3-HD-Leda@0.88', voice: { languageCode: 'th-TH', name: 'th-TH-Chirp3-HD-Leda' }, speakingRate: 0.88, playbackRate: 1.18 },
  gemini: {
    label: 'gemini-3.1-flash-tts-preview/Aoede: Cute, Friendly, Little Girl',
    voice: { languageCode: 'th-TH', name: 'Aoede', modelName: 'gemini-3.1-flash-tts-preview' },
    prompt: 'Cute, Friendly, Little Girl',
    playbackRate: 1,
  },
}
const VOICE = VOICES[process.env.TTS_VOICE ?? 'chirp']
if (!VOICE) throw new Error(`TTS_VOICE must be one of ${Object.keys(VOICES).join(', ')}`)

const KEY = process.env.GOOGLE_TTS_API_KEY ?? readFileSync(new URL('.env.local', ROOT), 'utf8').match(/^GOOGLE_TTS_API_KEY=(\S+)/m)?.[1]
if (!KEY) throw new Error('Set GOOGLE_TTS_API_KEY, or put GOOGLE_TTS_API_KEY=… in .env.local')
const REFERER = process.env.TTS_REFERER

const lineKey = (text) => text.replace(/\s+/g, ' ').trim()
const THAI = /[฀-๿]/
// A sentence she might say, not a short button label.
const sentence = (text) => THAI.test(text) && (text.replace(/\s/g, '').length >= 14 || /(?:ค่ะ|คะ|ค่า|จ้า|\?)$/.test(text.trim()))

// The copy file and the speech clean-up are TypeScript with the app's @/ paths: Vite loads them as the app does.
const vite = await createServer({ root: fileURLToPath(ROOT), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { th } = await vite.ssrLoadModule('/src/copy/th.ts')
const { toSpeech } = await vite.ssrLoadModule('/src/lib/speechText.ts')
await vite.close()

const strings = []
const walk = (value) => {
  if (typeof value === 'string') strings.push(value)
  else if (Array.isArray(value)) value.forEach(walk)
  else if (value && typeof value === 'object') Object.values(value).forEach(walk)
}
walk(th)
const spoken = existsSync(SPOKEN) ? JSON.parse(readFileSync(SPOKEN, 'utf8')) : []
const lines = [...new Set([...strings.filter(sentence), ...spoken].map(lineKey).filter(Boolean))].sort()

const idOf = (line) => createHash('sha1').update(`${VOICE.label}\n${toSpeech(line)}`).digest('hex').slice(0, 12)

async function synthesize(text) {
  const body = { input: VOICE.prompt ? { prompt: VOICE.prompt, text } : { text }, voice: VOICE.voice, audioConfig: { audioEncoding: 'MP3', ...(VOICE.speakingRate ? { speakingRate: VOICE.speakingRate } : {}) } }
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(REFERER ? { Referer: REFERER } : {}) },
      body: JSON.stringify(body),
    })
    if (response.ok) return Buffer.from((await response.json()).audioContent, 'base64')
    const message = ((await response.json().catch(() => ({}))).error?.message ?? response.statusText).replaceAll(KEY, '…')
    // Too many requests or a hiccup: wait and try again. Anything else (a bad key, an API not turned on) stops here.
    if ((response.status !== 429 && response.status < 500) || attempt >= 5) throw new Error(`${response.status} ${message}`)
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt))
  }
}

mkdirSync(OUT, { recursive: true })
const manifest = Object.fromEntries(lines.map((line) => [line, idOf(line)]))
const missing = [...new Set(Object.values(manifest))].filter((id) => !existsSync(new URL(`${id}.mp3`, OUT)))
const textOf = new Map(lines.map((line) => [idOf(line), toSpeech(line)]))
console.log(`${lines.length} lines, ${missing.length} to record with ${VOICE.label}`)

let done = 0
const queue = [...missing]
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      writeFileSync(new URL(`${id}.mp3`, OUT), await synthesize(textOf.get(id)))
      done += 1
      if (done % 20 === 0 || done === missing.length) console.log(`  ${done}/${missing.length}`)
    }
  }),
)

// Recordings no line uses any more (changed copy, another voice) are removed.
const used = new Set(Object.values(manifest))
for (const file of readdirSync(OUT)) if (file.endsWith('.mp3') && !used.has(file.slice(0, -4))) unlinkSync(new URL(file, OUT))
writeFileSync(new URL('manifest.json', OUT), `${JSON.stringify({ voice: VOICE.label, playbackRate: VOICE.playbackRate, lines: manifest }, null, 1)}\n`)
console.log('wrote public/voice/manifest.json')
