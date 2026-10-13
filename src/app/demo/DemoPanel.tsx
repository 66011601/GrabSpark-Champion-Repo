import { useEffect, useState } from 'react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { demoFlags } from '@/services/demoFlags.ts'
import { demoBus } from './demoBus.ts'
import { demoProfile, scriptLines } from './demoProfile.ts'

// Presenter-only tooling (desktop, beside the phone). Press D to hide or show.
const JUMPS: { label: string; screen: Screen; withProfile?: boolean }[] = [
  { label: 'A1 · คุยเปิดร้าน', screen: 'A1_TALK' },
  { label: 'A2 · ตรวจทาน (ข้อมูลตัวอย่าง)', screen: 'A2_REVIEW', withProfile: true },
  { label: 'A3 · ส่งแล้ว', screen: 'A3_SUBMITTED', withProfile: true },
  { label: '30 วันต่อมา…', screen: 'TRANSITION' },
  { label: 'G1 · หน้าร้าน', screen: 'G1_DASHBOARD' },
]

export function DemoPanel() {
  const { state, dispatch } = useJourney()
  const [visible, setVisible] = useState(true)
  const [failApi, setFailApi] = useState(demoFlags.simulateApiFailure)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (event.key.toLowerCase() === 'd' && tag !== 'INPUT' && tag !== 'TEXTAREA') setVisible((shown) => !shown)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!visible) return null

  const onA1 = state.screen === 'A1_TALK'

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
              dispatch({ type: 'GO', screen: jump.screen })
            }}
          >
            {jump.label}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">พูดตามบท (ที่หน้า A1)</h3>
        {scriptLines.map((line) => (
          <button
            key={line.id}
            type="button"
            disabled={!onA1}
            className="min-h-12 rounded-xl px-3 py-2 text-left ring-1 ring-line hover:bg-canvas disabled:opacity-40"
            onClick={() => demoBus.say(line.say)}
          >
            <span className="font-bold">บรรทัด {line.id}:</span> <span className="line-clamp-2 text-sm">{line.say}</span>
          </button>
        ))}
        <p className="text-sm text-ink-muted">บรรทัด 4: กดชิป "ใช่" ในแอปเพื่อใช้เบอร์ที่ล็อกอิน</p>
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
