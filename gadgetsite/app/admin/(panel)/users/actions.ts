'use server'
import type { ActionState } from '@/lib/admin/action'
import * as c from '@/lib/admin/actions/customers'
import * as a from '@/lib/admin/actions/users'

export const inviteAdmin = async (p: ActionState, f: FormData) => a.inviteAdmin(p, f)
export const updateAdmin = async (p: ActionState, f: FormData) => a.updateAdmin(p, f)
export const reset2fa = async (p: ActionState, f: FormData) => a.reset2fa(p, f)
export const saveRoleMatrix = async (p: ActionState, f: FormData) => a.saveRoleMatrix(p, f)
export const signOutCustomer = async (p: ActionState, f: FormData) => c.signOutCustomer(p, f)
