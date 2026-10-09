import { describe, expect, test } from 'vitest'
import { IllegalTransition, type Machine } from '@/lib/domain/state/machine'
import { orderMachine, type OrderStatus } from '@/lib/domain/state/order'
import { paymentMachine } from '@/lib/domain/state/payment'
import { codMachine, shipmentMachine } from '@/lib/domain/state/shipment'

describe('order machine', () => {
  test('allows the happy path from cart to completed', () => {
    const path: OrderStatus[] = [
      'cart',
      'pending_payment',
      'placed',
      'confirmed',
      'processing',
      'packed',
      'ready_to_ship',
      'shipped',
      'out_for_delivery',
      'delivered',
      'completed',
    ]
    for (let i = 1; i < path.length; i++) {
      expect(() => orderMachine.assertTransition(path[i - 1], path[i])).not.toThrow()
    }
  })

  test('rejects an illegal jump with the states on the error', () => {
    try {
      orderMachine.assertTransition('pending_payment', 'shipped')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(IllegalTransition)
      expect((e as IllegalTransition).from).toBe('pending_payment')
      expect((e as IllegalTransition).to).toBe('shipped')
    }
  })
})

describe('payment machine', () => {
  test('a failed attempt can never become paid', () => {
    expect(paymentMachine.canTransition('failed', 'paid')).toBe(false)
    expect(paymentMachine.canTransition('pending', 'paid')).toBe(true)
  })
})

describe('shipment machine', () => {
  test('delivered is terminal', () => {
    expect(shipmentMachine.next('delivered')).toEqual([])
  })
})

test('every target state is itself a state in its machine', () => {
  const machines = [orderMachine, paymentMachine, shipmentMachine, codMachine] as Machine<string>[]
  for (const m of machines) {
    for (const s of m.states) {
      for (const t of m.next(s)) expect(m.states).toContain(t)
    }
  }
})
