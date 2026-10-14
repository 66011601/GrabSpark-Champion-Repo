import samples from '@/data/ocr-samples.json'
import type { DocKind, ScanResult } from '@/types/domain.ts'

type Samples = { [K in DocKind]: Extract<ScanResult, { kind: K }> }

const SAMPLES = samples as Samples

/** How long the pretend reading takes; S1's scan-line animation lasts the same. */
export const READ_MS = 1200

/** The sample document of that kind, as the scanner would read it. A fresh copy every call. */
export function sampleScan<K extends DocKind>(kind: K): Samples[K] {
  return structuredClone(SAMPLES[kind])
}

/**
 * Prototype stand-in for Grab's document OCR: whatever the photo, it "reads" the sample for that kind.
 * In production this is a call to Grab's backend, never a model key in the browser (spec §12).
 */
export function readDocument(kind: DocKind, delayMs = READ_MS): Promise<ScanResult> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleScan(kind)), delayMs))
}
