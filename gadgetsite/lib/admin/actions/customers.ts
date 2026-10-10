import { z } from 'zod'
import { adminAction } from '../action'
import { audited } from '../audit'
import { requiredText } from '../forms'

/** Ends every session a customer has (e.g. a lost phone or a support request). */
export const signOutCustomer = adminAction(
  'users.manage',
  z.object({ id: requiredText(40) }),
  [],
  async ({ id }, { actorId, ip }) => {
    await audited(
      actorId,
      'update',
      'customer',
      id,
      async (tx) => {
        const count = await tx.customerSession.count({ where: { customerId: id } })
        await tx.customerSession.deleteMany({ where: { customerId: id } })
        return { before: { sessions: count }, after: { sessions: 0 }, result: null }
      },
      ip,
    )
  },
)
