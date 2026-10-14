import { useEffect, useState } from 'react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { PHOTO_PATH, type Screen } from '@/app/journey/journeyMachine.ts'
import type { DocKind } from '@/types/domain.ts'
import { demoFlags } from '@/services/demoFlags.ts'
import { demoBus } from './demoBus.ts'
import { demoProfile, scriptLines } from './demoProfile.ts'

// Presenter-only tooling (desktop, beside the phone). Press D to hide or show.
const JUMPS: { label: string; screen: Screen; withProfile?: boolean; scan?: DocKind[] }[] = [
  { label: 'R1 · หน้าแรก', screen: 'R1_WELCOME' },
  { label: 'R2 · อีเมลและรหัสผ่าน', screen: 'R2_ACCOUNT' },
  { label: 'R3 · ข้อมูลร้าน', screen: 'R3_STORE' },
  { label: 'A1 · คุยเปิดร้าน', screen: 'A1_TALK' },
  { label: 'S1 · ถ่ายรูปเอกสาร (ทางถ่ายรูป)', screen: 'S1_SCAN', scan: PHOTO_PATH },
  { label: 'A2 · ตรวจทาน (ข้อมูลตัวอย่าง)', screen: 'A2_REVIEW', withProfile: true },
  { label: 'A3 · ส่งแล้ว', screen: 'A3_SUBMITTED', withProfile: true },
  { label: '30 วันต่อมา…', screen: 'TRANSITION' },
  { label: 'G1 · หน้าร้าน', screen: 'G1_DASHBOARD' },
]

// Screens where the companion is listening, so a line "spoken" from here is heard.
const LISTENING_SCREENS: Screen[] = ['R1_WELCOME', 'R2_ACCOUNT', 'R3_STORE', 'A1_TALK', 'S1_SCAN', 'A2_REVIEW']

export function DemoPanel() {
  const { state, dispatch } = useJourney()
  const [visible, setVisible] = useState(true)
  const [failApi, setFailApi] = useState(demoFlags.simulateApiFailure)
  const [line, setLine] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (event.key.toLowerCase() === 'd' && tag !== 'INPUT' && tag !== 'TEXTAREA') setVisible((shown) => !shown)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!visible) return null

  const canSpeak = LISTENING_SCREENS.includes(state.screen)

  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-5 rounded-3xl bg-surface p-5 text-base shadow-lg ring-1 ring-line sm:flex">
      <div>
        <h2 className="text-lg font-bold">Demo panel</h2>
        <p className="text-sm text-ink-muted">กด D เพื่อซ่อน/แสดง · ตอนนี้: {state.screen}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">ไปที่หน้า</h3>
        {JUMPS.map((jump) => (
          <button
            key={jump.screen}
            type="button"
            className="min-h-12 rounded-xl px-3 text-left ring-1 ring-line hover:bg-canvas"
            onClick={() => {
              if (jump.withProfile) dispatch({ type: 'LOAD_PROFILE', profile: demoProfile() })
              if (jump.scan) dispatch({ type: 'START_SCAN', docs: jump.scan, returnTo: 'A1_TALK' })
              else dispatch({ type: 'GO', screen: jump.screen })
            }}
          >
            {jump.label}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">พูดแทนไมค์ (บทใช้ที่หน้า R3 หรือ A1)</h3>
        {scriptLines.map((line) => (
          <button
            key={line.id}
            type="button"
            disabled={!canSpeak}
            className="min-h-12 rounded-xl px-3 py-2 text-left ring-1 ring-line hover:bg-canvas disabled:opacity-40"
            onClick={() => demoBus.say(line.say)}
          >
            <span className="font-bold">บรรทัด {line.id}:</span> <span className="line-clamp-2 text-sm">{line.say}</span>
          </button>
        ))}
        <p className="text-sm text-ink-muted">บรรทัด 4: กดชิป "ใช่" ในแอปเพื่อใช้เบอร์ที่ล็อกอิน</p>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (!line.trim()) return
            demoBus.say(line.trim())
            setLine('')
          }}
        >
          <label htmlFor="demo-say" className="sr-only">
            พูดเอง
          </label>
          <input
            id="demo-say"
            value={line}
            onChange={(event) => setLine(event.target.value)}
            placeholder='พูดเอง เช่น "ลงทะเบียน"'
            disabled={!canSpeak}
            className="min-h-12 min-w-0 flex-1 rounded-xl px-3 ring-1 ring-line disabled:opacity-40"
          />
          <button type="submit" disabled={!canSpeak} className="min-h-12 rounded-xl px-3 ring-1 ring-line hover:bg-canvas disabled:opacity-40">
            พูด
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={failApi}
            onChange={(event) => {
              demoFlags.simulateApiFailure = event.target.checked
              setFailApi(event.target.checked)
            }}
          />
          จำลองระบบล่ม (ตอนกดส่ง)
        </label>
        <button type="button" className="min-h-12 rounded-xl px-3 text-left ring-1 ring-line hover:bg-canvas" onClick={() => dispatch({ type: 'RESET' })}>
          เริ่มใหม่ทั้งหมด
        </button>
      </section>
    </aside>
  )
}
