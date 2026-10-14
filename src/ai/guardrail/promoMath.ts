/** Profit of one sale after Grab's commission. Money maths stays here, never in the AI. */
export function profitPerUnit(priceTHB: number, costTHB: number, commissionRate: number): number {
  return Math.round((priceTHB * (1 - commissionRate) - costTHB) * 100) / 100
}

export interface ImpactInput {
  baselineByHour: Record<string, number>
  window: [string, string] // "HH:MM"
  liftPct: [number, number]
  days: number
  price: number
  profitPerBundle: number
}

export interface Impact {
  extraOrders: [number, number]
  extraRevenueTHB: [number, number]
  extraProfitTHB: [number, number]
}

/** A range, rounded down so nothing is overstated (spec 6.6). Ignores customers who would have bought anyway. */
export function estimateImpact({ baselineByHour, window, liftPct, days, price, profitPerBundle }: ImpactInput): Impact {
  const from = Number(window[0].slice(0, 2))
  const to = Number(window[1].slice(0, 2))
  let perDay = 0
  for (let hour = from; hour < to; hour++) perDay += baselineByHour[String(hour)] ?? 0
  const orders = liftPct.map((lift) => Math.round((perDay * lift) / 100) * days) as [number, number]
  return {
    extraOrders: orders,
    extraRevenueTHB: orders.map((count) => Math.floor(count * price)) as [number, number],
    extraProfitTHB: orders.map((count) => Math.floor(count * profitPerBundle)) as [number, number],
  }
}
