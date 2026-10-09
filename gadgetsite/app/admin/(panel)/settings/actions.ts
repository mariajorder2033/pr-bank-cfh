'use server'
import type { ActionState } from '@/lib/admin/action'
import * as a from '@/lib/admin/actions/settings'

export const saveSite = async (p: ActionState, f: FormData) => a.saveSite(p, f)
export const saveTheme = async (p: ActionState, f: FormData) => a.saveTheme(p, f)
export const saveMotion = async (p: ActionState, f: FormData) => a.saveMotion(p, f)
export const saveDelivery = async (p: ActionState, f: FormData) => a.saveDelivery(p, f)
export const saveServiceSms = async (p: ActionState, f: FormData) => a.saveServiceSms(p, f)
export const sendTestSms = async (p: ActionState, f: FormData) => a.sendTestSms(p, f)
