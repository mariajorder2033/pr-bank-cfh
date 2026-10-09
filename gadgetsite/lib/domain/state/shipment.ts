import { defineMachine } from './machine'

export const SHIPMENT_STATUSES = [
  'created',
  'pickup_scheduled',
  'picked_up',
  'in_transit',
  'at_hub',
  'out_for_delivery',
  'delivered',
  'delivery_failed',
  'rescheduled',
  'returned_to_merchant',
  'cancelled',
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

// TRD §12.1.
export const shipmentMachine = defineMachine<ShipmentStatus>({
  created: ['pickup_scheduled', 'cancelled'],
  pickup_scheduled: ['picked_up', 'cancelled'],
  picked_up: ['in_transit'],
  in_transit: ['at_hub', 'out_for_delivery'],
  at_hub: ['in_transit', 'out_for_delivery'],
  out_for_delivery: ['delivered', 'delivery_failed'],
  delivery_failed: ['rescheduled', 'returned_to_merchant'],
  rescheduled: ['out_for_delivery'],
  delivered: [],
  returned_to_merchant: [],
  cancelled: [],
})

export const COD_STATUSES = ['pending', 'collected', 'remitted', 'reconciled'] as const
export type CodStatus = (typeof COD_STATUSES)[number]

export const codMachine = defineMachine<CodStatus>({
  pending: ['collected'],
  collected: ['remitted'],
  remitted: ['reconciled'],
  reconciled: [],
})
