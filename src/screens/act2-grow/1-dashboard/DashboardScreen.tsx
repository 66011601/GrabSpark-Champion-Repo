import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { th } from '@/copy/th.ts'

// Placeholder: Plan 2 replaces this with the proactive-nudge dashboard (spec §7.3, G1).
export function DashboardScreen() {
  return (
    <OnboardingShell title={th.act2Placeholder.title}>
      <p className="text-ink-muted">{th.act2Placeholder.body}</p>
    </OnboardingShell>
  )
}
