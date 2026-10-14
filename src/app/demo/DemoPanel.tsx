import { useEffect, useState } from 'react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { demoFlags } from '@/services/demoFlags.ts'
import { demoBus } from './demoBus.ts'
import { th } from '@/copy/th.ts'
import { scriptLines, step4DemoProfile, submittedDemoProfile } from './demoProfile.ts'

// Presenter-only tooling (desktop, beside the phone). Press D to hide or show.
const JUMPS: { label: string; screen: Screen; sample?: 'step4' | 'submitted' }[] = [
  { label: 'หน้าแรก GrabMerchant', screen: 'G0_WELCOME' },
  { label: 'เข้าสู่ระบบ', screen: 'L1_LOGIN' },
  { label: '1/7 เลือกบริการ', screen: 'S1_SERVICE' },
  { label: '2/7 อีเมลและรหัสผ่าน', screen: 'S2_ACCOUNT' },
  { label: '2/7 เบอร์โทรและ OTP', screen: 'S2_PHONE' },
  { label: '3/7 ข้อมูลธุรกิจ', screen: 'S3_BUSINESS' },
  { label: '4/7 ข้อมูลร้าน (ข้อมูลตัวอย่าง)', screen: 'S4_SHOP', sample: 'step4' },
  { label: '5/7 ข้อมูลของคุณ', screen: 'S5_OWNER' },
  { label: '6/7 ข้อมูลธนาคาร', screen: 'S6_BANK' },
  { label: '7/7 คำยืนยัน (ข้อมูลตัวอย่าง)', screen: 'S7_CONFIRM', sample: 'submitted' },
  { label: 'หน้าหลัก (รออนุมัติ)', screen: 'H1_HOME', sample: 'submitted' },
  { label: 'เพิ่มเมนู', screen: 'H2_MENU' },
  { label: 'เวลาเปิด-ปิด', screen: 'H3_HOURS' },
  { label: '30 วันต่อมา…', screen: 'TRANSITION' },
  { label: 'Act 2: หน้าหลัก GrabMerchant', screen: 'G1_DASHBOARD' },
]

// Screens where the companion is listening, so a line "spoken" from here is heard.
const LISTENING_SCREENS: Screen[] = ['G0_WELCOME', 'S1_SERVICE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM', 'H1_HOME', 'H2_MENU', 'H3_HOURS', 'G1_DASHBOARD']

const ASKS = ['sales', 'forecast', 'promo', 'soldOut', 'feedback'] as const

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
            key={jump.label}
            type="button"
            className="min-h-12 rounded-xl px-3 text-left ring-1 ring-line hover:bg-canvas"
            onClick={() => {
              if (jump.sample === 'step4') dispatch({ type: 'LOAD_PROFILE', profile: step4DemoProfile(), phoneVerified: true })
              if (jump.sample === 'submitted') dispatch({ type: 'LOAD_PROFILE', profile: submittedDemoProfile(), phoneVerified: true })
              dispatch({ type: 'GO', screen: jump.screen })
            }}
          >
            {jump.label}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">พูดแทนไมค์ (บรรทัด 1 ใช้ที่ 3/7 · บรรทัด 2 ที่เวลาเปิด-ปิด · บรรทัด 3 ที่เพิ่มเมนู)</h3>
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
        <h3 className="font-bold">Act 2: สั่งด้วยเสียง (ข้ามแอนิเมชัน: กด S)</h3>
        {ASKS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={state.screen !== 'G1_DASHBOARD'}
            className="min-h-12 rounded-xl px-3 py-2 text-left ring-1 ring-line hover:bg-canvas disabled:opacity-40"
            onClick={() => demoBus.say(th.act2.ask[id])}
          >
            {th.act2.ask[id]}
          </button>
        ))}
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
