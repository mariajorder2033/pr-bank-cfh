import { expect, test } from 'vitest'
import { CodStatus, OrderStatus, PaymentStatus, ShipmentStatus } from '@/lib/generated/prisma/enums'
import { ORDER_STATUSES } from '@/lib/domain/state/order'
import { PAYMENT_STATUSES } from '@/lib/domain/state/payment'
import { COD_STATUSES, SHIPMENT_STATUSES } from '@/lib/domain/state/shipment'

const sorted = (xs: readonly string[]) => [...xs].sort()

test('database status enums match the domain state machines', () => {
  expect(sorted(Object.values(OrderStatus))).toEqual(sorted(ORDER_STATUSES))
  expect(sorted(Object.values(PaymentStatus))).toEqual(sorted(PAYMENT_STATUSES))
  expect(sorted(Object.values(ShipmentStatus))).toEqual(sorted(SHIPMENT_STATUSES))
  expect(sorted(Object.values(CodStatus))).toEqual(sorted(COD_STATUSES))
})
