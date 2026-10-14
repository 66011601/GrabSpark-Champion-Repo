import type { StepIssue } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'

/** What the helper bar says about the first thing still stopping ต่อไป. */
export function problemText(issue: StepIssue): string {
  const p = th.grab.problems
  switch (issue.problem) {
    case 'missing':
      return p.missing(th.fields[issue.field])
    case 'unchecked':
      return p.unchecked(th.fields[issue.field])
    case 'pinNotConfirmed':
      return p.pin
    case 'idInvalid':
      return p.idInvalid
    case 'nameMismatch':
      return p.nameMismatch
    case 'noBookPhoto':
      return p.noBookPhoto
  }
}
