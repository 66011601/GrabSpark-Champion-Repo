// "ครบแล้ว", "เสร็จแล้ว", "แค่นี้แหละ", "ไม่มีแล้ว": the merchant has finished listing dishes.
const DONE = /ครบแล้ว|เสร็จแล้ว|แค่นี้|เท่านี้|ไม่มีแล้ว|ไม่มีอะไรแล้ว|พอแล้ว|จบแล้ว/

/** True when the merchant says they have finished, so the companion reminds them to save. */
export const saysDone = (text: string): boolean => DONE.test(text.replace(/\s+/g, ''))
