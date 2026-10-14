import type { OnboardingProfile, SetupPart } from '@/types/domain.ts'
import { demoFlags } from './demoFlags.ts'

// Write calls to the (mock) Grab backend. Only guardrail modules may import this file;
// src/architecture.test.ts enforces that.

export interface ApplicationReceipt {
  applicationId: string
  submittedAt: string
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('Mock Grab API is unavailable')
    this.name = 'ApiUnavailableError'
  }
}

const LATENCY_MS = 800

export function submitApplication(profile: OnboardingProfile): Promise<ApplicationReceipt> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (demoFlags.simulateApiFailure) {
        reject(new ApiUnavailableError())
        return
      }
      resolve({ applicationId: `APP-${profile.sessionId.toUpperCase()}`, submittedAt: new Date().toISOString() })
    }, LATENCY_MS)
  })
}

export interface SetupReceipt {
  part: SetupPart
  savedAt: string
}

export function saveStoreSetup(part: SetupPart, profile: OnboardingProfile): Promise<SetupReceipt> {
  void profile // the mock keeps nothing; a real backend stores the menu or hours
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (demoFlags.simulateApiFailure) {
        reject(new ApiUnavailableError())
        return
      }
      resolve({ part, savedAt: new Date().toISOString() })
    }, LATENCY_MS)
  })
}
