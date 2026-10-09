import { defineMachine } from './machine'

export const ORDER_STATUSES = [
  'cart',
  'pending_payment',
  'payment_failed',
  'booked',
  'placed',
  'confirmed',
  'processing',
  'packed',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
  'return_requested',
  'exchange_requested',
  'returned',
  'refunded',
  'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

// TRD §12.1.
export const orderMachine = defineMachine<OrderStatus>({
  cart: ['pending_payment', 'placed', 'cancelled'],
  pending_payment: ['placed', 'booked', 'payment_failed', 'cancelled'],
  payment_failed: ['pending_payment', 'cancelled'],
  booked: ['pending_payment', 'placed', 'cancelled'],
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped'],
  shipped: ['out_for_delivery', 'returned'],
  out_for_delivery: ['delivered', 'shipped', 'returned'],
  delivered: ['completed', 'return_requested', 'exchange_requested'],
  completed: ['return_requested'],
  return_requested: ['returned', 'delivered'],
  exchange_requested: ['delivered', 'completed'],
  returned: ['refunded'],
  refunded: [],
  cancelled: ['refunded'],
})
