import { Star, Volume2 } from 'lucide-react'
import { complaintTopics } from '@/ai/navigator/insights.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { mark } from '@/components/navigator/mark.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { voice } from '@/services/speech/voiceProvider.ts'
import { AppHeader } from './AppHeader.tsx'
import type { PanelProps } from './props.ts'

const t = th.act2.feedback

export function Feedback({ nav, highlight, change, home }: PanelProps) {
  const shop = getMerchant()
  const topics = complaintTopics(shop)
  const reviews = shop.reviews.filter((review) => !nav.negativeOnly || review.stars <= 3)
  return (
    <>
      <AppHeader title={t.title} onBack={home} />
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        <button
          type="button"
          data-nav="filter-negative"
          aria-pressed={nav.negativeOnly}
          onClick={() => change({ negativeOnly: !nav.negativeOnly })}
          className={`min-h-14 cursor-pointer rounded-xl font-bold ${nav.negativeOnly ? 'bg-action text-white' : 'bg-surface text-action ring-1 ring-line'} ${mark(highlight, 'filter-negative')}`}
        >
          {t.filter} · {t.reviewCount(reviews.length)}
        </button>
        <ul className="divide-y divide-line rounded-2xl bg-surface px-4 ring-1 ring-line">
          {reviews.map((review) => (
            <li key={review.text} className="py-3">
              <p className="flex items-center gap-1 text-warn-ink" aria-label={`${review.stars} ดาว`}>
                {Array.from({ length: review.stars }, (_, i) => (
                  <Star key={i} className="size-4 fill-current" aria-hidden />
                ))}
              </p>
              <p>{review.text}</p>
            </li>
          ))}
        </ul>
        {nav.negativeOnly && (
          <section data-nav="summary" className={`rounded-2xl bg-ok-bg p-4 ${mark(highlight, 'summary')}`}>
            <p className="text-sm font-bold text-action">{th.act2.sample}</p>
            <p className="text-lg font-bold">{t.summary(topics.map((topic) => t.topic(topic.topic, topic.count)).join(' และ '))}</p>
          </section>
        )}
        <Button variant="secondary" fullWidth data-nav="lesson-open" className={mark(highlight, 'lesson-open')} onClick={() => change({ lesson: true })}>
          {t.lessonTitle}
        </Button>
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
