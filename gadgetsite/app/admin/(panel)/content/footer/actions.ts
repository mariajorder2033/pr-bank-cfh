'use server'
import type { ActionState } from '@/lib/admin/action'
import * as a from '@/lib/admin/actions/footer'

export const saveFooter = async (p: ActionState, f: FormData) => a.saveFooter(p, f)
