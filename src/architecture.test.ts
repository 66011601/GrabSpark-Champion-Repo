import { describe, expect, it } from 'vitest'

// Raw source of every app file, keyed by path ("/src/...").
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true })

// The AI may prepare drafts but never execute them: only guardrail modules may call write APIs.
const ALLOWED_WRITERS = ['/src/ai/onboarding/submit.ts', '/src/ai/guardrail/confirmAndExecute.ts', '/src/services/merchantApi.write.ts']
const IMPORTS_WRITE_API = /(?:from\s+|import\s*\(\s*)['"][^'"]*merchantApi\.write/
const IMPORTS_REACT = /from\s+['"]react/

// Sending is the merchant's own tap: ส่งใบสมัคร on 7/7, and บันทึก on the menu and hours screens.
const SUBMITTERS = ['/src/screens/signup/S7Confirm.tsx', '/src/screens/home/H2Menu.tsx', '/src/screens/home/H3Hours.tsx']
// Act 2: the AI only prepares drafts; the merchant's tap on the confirm bar is the only thing that sends one.
const CONFIRMERS = ['/src/screens/act2-grow/1-dashboard/ConfirmBar.tsx']
const IMPORTS_CONFIRM = /(?:from\s+|import\s*\(\s*)['"][^'"]*(?:guardrail\/|\.\/)confirmAndExecute(?:\.ts)?['"]/
const IMPORTS_SUBMIT = /(?:from\s+|import\s*\(\s*)['"][^'"]*(?:onboarding\/|\.\/)submit(?:\.ts)?['"]/

const appFiles = Object.entries(sources).filter(([path]) => !/\.test\.tsx?$/.test(path))

describe('architecture', () => {
  it('sees the source tree', () => {
    expect(Object.keys(sources)).toContain('/src/ai/onboarding/submit.ts')
    expect(Object.keys(sources)).toContain('/src/services/ocr/mockOcr.ts')
    expect(Object.keys(sources)).toContain('/src/screens/signup/S7Confirm.tsx')
    expect(Object.keys(sources)).toContain('/src/screens/home/H2Menu.tsx')
    expect(Object.keys(sources)).toContain('/src/ai/guardrail/confirmAndExecute.ts')
    expect(Object.keys(sources)).toContain('/src/screens/act2-grow/1-dashboard/ConfirmBar.tsx')
    expect(IMPORTS_CONFIRM.test("import { confirmDraft } from '@/ai/guardrail/confirmAndExecute.ts'")).toBe(true)
    expect(IMPORTS_WRITE_API.test("import { submitApplication } from '@/services/merchantApi.write.ts'")).toBe(true)
  })

  it('only lets guardrail modules import the write API', () => {
    const offenders = appFiles
      .filter(([path, source]) => !ALLOWED_WRITERS.includes(path) && IMPORTS_WRITE_API.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('keeps src/ai free of React', () => {
    const offenders = appFiles
      .filter(([path, source]) => path.startsWith('/src/ai/') && IMPORTS_REACT.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('only lets the confirm and set-up screens send', () => {
    const offenders = appFiles
      .filter(([path, source]) => !SUBMITTERS.includes(path) && IMPORTS_SUBMIT.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it('only lets the confirm bar send what the AI prepared', () => {
    const offenders = appFiles
      .filter(([path, source]) => !CONFIRMERS.includes(path) && IMPORTS_CONFIRM.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
