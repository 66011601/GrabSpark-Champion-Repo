import { Plus, Trash2 } from 'lucide-react'
import { draftChecks } from '@/ai/guardrail/checks.ts'
import type { NavState } from '@/ai/navigator/types.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { inputClass } from '@/components/grab/inputClass.ts'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import type { MenuEntry } from '@/types/domain.ts'
import { ConfirmBar } from './ConfirmBar.tsx'
import type { PanelProps } from './props.ts'

const t = th.act2.addMenu

/**
 * The new dishes the AI drafted from what the owner said, or typed here. Every box can be changed, and nothing is
 * added until the owner taps "ยืนยันเพิ่มเมนู" (the guardrail checks names, prices and duplicates first).
 */
export function AddMenuSheet({ nav, highlight, change, announce }: Pick<PanelProps, 'nav' | 'highlight' | 'change' | 'announce'>) {
  const draft = nav.adding
  const open = Boolean(draft && nav.done !== 'addMenu')
  const items = draft?.items ?? []
  const setItems = (next: MenuEntry[]) => change({ adding: { kind: 'addMenu', items: next } })
  const setItem = (index: number, patch: Partial<MenuEntry>) => setItems(items.map((item, at) => (at === index ? { ...item, ...patch } : item)))
  const failing = draft ? draftChecks(draft, getMerchant()).filter((check) => !check.pass) : []
  return (
    <BottomSheet open={open} title={t.sheetTitle} onClose={() => change({ adding: null })}>
      {draft && (
        <div className="flex flex-col gap-3">
          <p className="text-ink-muted">{t.hint}</p>
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={index} className="flex items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-bold">
                  {t.name}
                  <input value={item.name} onChange={(event) => setItem(index, { name: event.target.value })} className={inputClass(false)} />
                </label>
                <label className="flex w-28 flex-col gap-1 text-sm font-bold">
                  {t.price}
                  <input
                    inputMode="numeric"
                    value={item.priceTHB > 0 ? String(item.priceTHB) : ''}
                    onChange={(event) => setItem(index, { priceTHB: Number(event.target.value.replace(/\D/g, '')) || 0 })}
                    className={inputClass(false)}
                  />
                </label>
                <button
                  type="button"
                  aria-label={t.remove(item.name)}
                  onClick={() => setItems(items.filter((_, at) => at !== index))}
                  className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted active:bg-canvas"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setItems([...items, { name: '', priceTHB: 0 }])}
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl font-bold text-action ring-1 ring-action active:bg-ok-bg"
          >
            <Plus className="size-5" aria-hidden />
            {t.more}
          </button>
          {failing.length > 0 && (
            <ul className="rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
              {failing.map((check) => (
                <li key={check.id}>{check.message}</li>
              ))}
            </ul>
          )}
          <div className="-mx-4 -mb-6">
            <ConfirmBar
              draft={draft}
              label={t.confirm}
              highlight={highlight}
              onDone={() => {
                const added = items.map((item) => ({ name: item.name.trim(), priceTHB: item.priceTHB }))
                change({ done: 'addMenu', added: [...nav.added, ...added], adding: null } satisfies Partial<NavState>)
                announce(t.done(added.length))
              }}
            />
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
