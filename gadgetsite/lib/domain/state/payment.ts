import { defineMachine } from './machine'

export const PAYMENT_STATUSES = [
  'initiated',
  'pending',
  'paid',
  'failed',
  'cancelled',
  'expired',
  'refund_pending',
  'refunded',
  'partially_refunded',
] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

// TRD §12.1. `paid` is only reachable after provider verification.
export const paymentMachine = defineMachine<PaymentStatus>({
  initiated: ['pending', 'failed', 'cancelled', 'expired'],
  pending: ['paid', 'failed', 'cancelled', 'expired'],
  paid: ['refund_pending'],
  refund_pending: ['refunded', 'partially_refunded'],
  partially_refunded: ['refund_pending'],
  failed: [],
  cancelled: [],
  expired: [],
  refunded: [],
})
