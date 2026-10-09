'use server'
import type { ActionState } from '@/lib/admin/action'
import * as a from '@/lib/admin/actions/catalog-meta'

export const saveCategory = async (p: ActionState, f: FormData) => a.saveCategory(p, f)
export const deleteCategory = async (p: ActionState, f: FormData) => a.deleteCategory(p, f)
export const saveBrand = async (p: ActionState, f: FormData) => a.saveBrand(p, f)
export const deleteBrand = async (p: ActionState, f: FormData) => a.deleteBrand(p, f)
export const saveBadge = async (p: ActionState, f: FormData) => a.saveBadge(p, f)
export const deleteBadge = async (p: ActionState, f: FormData) => a.deleteBadge(p, f)
export const saveCarePlan = async (p: ActionState, f: FormData) => a.saveCarePlan(p, f)
export const deleteCarePlan = async (p: ActionState, f: FormData) => a.deleteCarePlan(p, f)
