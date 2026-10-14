import { Bot, Calculator, ChartColumn, CircleHelp, Link2, Megaphone, MessageSquareText, ReceiptText, ShoppingBasket, Store, UtensilsCrossed, Users, Zap, type LucideIcon } from 'lucide-react'
import type { GridId } from '@/ai/navigator/types.ts'

/** The icon of each item on the GrabMerchant home. */
export const GRID_ICONS: Record<GridId, LucideIcon> = {
  orders: ReceiptText,
  menu: UtensilsCrossed,
  shop: Store,
  boost: Megaphone,
  staff: Users,
  grabshop: ShoppingBasket,
  ai: Bot,
  insights: ChartColumn,
  feedback: MessageSquareText,
  cashier: Calculator,
  express: Zap,
  smartlink: Link2,
  help: CircleHelp,
}
