'use server'
import type { ActionState } from '@/lib/admin/action'
import * as a from '@/lib/admin/actions/products'

export const saveProduct = async (p: ActionState, f: FormData) => a.saveProduct(p, f)
export const bulkSaveVariants = async (p: ActionState, f: FormData) => a.bulkSaveVariants(p, f)
