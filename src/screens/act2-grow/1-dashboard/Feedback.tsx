import { BookOpen, ChevronRight, Star, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { complaintTopics, ratingSummary } from '@/ai/navigator/insights.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { voice } from '@/services/speech/voiceProvider.ts'
import { AppHeader } from './AppHeader.tsx'
import type { PanelProps } from './props.ts'
import { TabBar } from './TabBar.tsx'

const t = th.act2.feedback
type Tab = 'reviews' | 'reports'
const TABS: { id: Tab; label: string }[] = [
  { id: 'reviews', label: t.tabs.reviews },
  { id: 'reports', label: t.tabs.reports },
]
const chip = (on: boolean) => `min-h-12 cursor-pointer rounded-full px-5 font-bold ${on ? 'bg-action text-white' : 'bg-surface text-ink ring-1 ring-line'}`

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 text-warn-ink" role="img" aria-label={t.stars(count)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-4 ${i < count ? 'fill-current' : 'text-line'}`} aria-hidden />
      ))}
    </span>
  )
}

/** GrabMerchant's ฟีดแบก: reviews (filterable by stars) and reports from customers. */
export function Feedback({ nav, highlight, change, home }: PanelProps) {
  const [tab, setTab] = useState<Tab>('reviews')
  const shop = getMerchant()
  const rating = ratingSummary(shop)
  const topics = complaintTopics(shop)
  const reviews = shop.reviews.filter((review) => !nav.negativeOnly || review.stars <= 3)
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <TabBar tabs={TABS} current={tab} onPick={setTab} />
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas px-4 py-3">
        {tab === 'reports' ? (
          <p className="rounded-2xl bg-surface p-6 text-center text-ink-muted ring-1 ring-line">{t.noReports}</p>
        ) : (
          <>
            <section className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line">
              <p className="text-money font-bold tabular-nums">{rating.average}</p>
              <div>
                <Stars count={Math.round(rating.average)} />
                <p className="text-sm text-ink-muted">
                  {t.ratingOf(rating.count)} · {th.act2.sample}
                </p>
              </div>
            </section>
            <div className="flex gap-2">
              <button type="button" aria-pressed={!nav.negativeOnly} onClick={() => change({ negativeOnly: false })} className={chip(!nav.negativeOnly)}>
                {t.all}
              </button>
              <button type="button" data-nav="filter-negative" aria-pressed={nav.negativeOnly} onClick={() => change({ negativeOnly: true })} className={`${chip(nav.negativeOnly)} ${mark(highlight, 'filter-negative')}`}>
                {t.filter}
              </button>
            </div>
            {nav.negativeOnly && topics.length > 0 && (
              <section data-nav="summary" className={`rounded-2xl bg-ok-bg p-4 ${mark(highlight, 'summary')}`}>
                <p className="font-bold">{t.summary(topics.map((topic) => t.topic(topic.topic, topic.count)).join(' และ '))}</p>
                <button
                  type="button"
                  data-nav="lesson-open"
                  onClick={() => change({ lesson: true })}
                  className={`mt-3 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl bg-surface px-3 text-left ring-1 ring-line active:bg-canvas ${mark(highlight, 'lesson-open')}`}
                >
                  <BookOpen className="size-6 shrink-0 text-action" aria-hidden />
                  <span className="flex-1 font-bold">{t.lessonTitle}</span>
                  <ChevronRight className="size-5 text-ink-muted" aria-hidden />
                </button>
              </section>
            )}
            <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
              {reviews.map((review) => (
                <li key={review.text} className="flex flex-col gap-1 py-3">
                  <Stars count={review.stars} />
                  <p>{review.text}</p>
                  {review.topic && <span className="self-start rounded-full bg-warn-bg px-2 text-sm text-warn-ink">{review.topic}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <BottomSheet
        open={nav.lesson}
        title={t.lessonTitle}
        onClose={() => {
          voice.stop()
          change({ lesson: false })
        }}
      >
        <ol className="flex list-decimal flex-col gap-3 pl-6 text-lg">
          {t.lesson.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <Button className="mt-4" fullWidth icon={<Volume2 className="size-6" aria-hidden />} onClick={() => voice.speak(t.lesson.join(' '))}>
          {t.read}
        </Button>
      </BottomSheet>
    </>
  )
}
