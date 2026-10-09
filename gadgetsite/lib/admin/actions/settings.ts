import { z } from 'zod'
import { MotionSettings, ThemeSettings } from '@/lib/content/schemas'
import { normalizePhone } from '@/lib/domain/phone'
import { getSms } from '@/lib/integrations/sms'
import { describeCredential, readCredential, saveCredential } from '@/lib/server/credentials'
import { db } from '@/lib/db'
import { adminAction, ActionError } from '../action'
import { audited } from '../audit'
import { imageUrl, intField, requiredText, text, checkbox } from '../forms'

async function saveSetting(actorId: string, ip: string, key: string, value: object) {
  await audited(
    actorId,
    'update',
    'setting',
    key,
    async (tx) => {
      const before = (await tx.setting.findUnique({ where: { key } }))?.value ?? null
      await tx.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
      return { before, after: value, result: null }
    },
    ip,
  )
}

const Site = z.object({
  nameEn: requiredText(80),
  nameBn: text(80),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null
      const p = normalizePhone(v)
      if (!p) ctx.addIssue({ code: 'custom', message: 'invalid_value' })
      return p
    }),
  logoUrl: imageUrl,
})

export const saveSite = adminAction(
  'settings.write',
  Site,
  ['settings', 'content'],
  async (v, { actorId, ip }) => saveSetting(actorId, ip, 'site', v),
)

export const saveTheme = adminAction(
  'settings.write',
  ThemeSettings,
  ['settings'],
  async (v, { actorId, ip }) => saveSetting(actorId, ip, 'theme', v),
)

const Motion = z
  .object({
    heroCycleMs: intField(500, 60_000),
    heroSlideMs: intField(50, 5_000),
    heroEasing: requiredText(80),
    tickerPxPerS: intField(5, 1_000),
    wipeMs: intField(0, 2_000),
    tileFadeMs: intField(0, 2_000),
  })
  .pipe(MotionSettings)

export const saveMotion = adminAction(
  'settings.write',
  Motion,
  ['settings'],
  async (v, { actorId, ip }) => saveSetting(actorId, ip, 'motion', v),
)

export const saveDelivery = adminAction(
  'settings.write',
  z.object({ freeOver: intField(0, 10_000_000) }),
  ['settings'],
  async (v, { actorId, ip }) => saveSetting(actorId, ip, 'delivery', v),
)

const Sms = z.object({
  provider: z.enum(['bulksmsbd']),
  apiKey: text(300),
  senderId: requiredText(40),
  enabled: checkbox,
})

/** Keys are write-only: a blank key keeps the stored one; the audit log sees them masked. */
export const saveServiceSms = adminAction('settings.write', Sms, [], async (v, { actorId, ip }) => {
  const current = await readCredential('sms')
  const apiKey = v.apiKey || (current?.provider === v.provider ? current.config.apiKey : '')
  if (!apiKey) throw new ActionError('required', { apiKey: ['required'] })
  await audited(
    actorId,
    'update',
    'service',
    'sms',
    async () => {
      const before = await describeCredential('sms')
      await saveCredential('sms', v.provider, { apiKey, senderId: v.senderId }, v.enabled)
      const after = await describeCredential('sms')
      return { before, after, result: null }
    },
    ip,
  )
})

/** Sends a test message through the saved gateway to a number the admin enters. */
export const sendTestSms = adminAction(
  'settings.write',
  z.object({
    phone: z
      .string()
      .transform(
        (p, ctx) =>
          normalizePhone(p) ??
          (ctx.addIssue({ code: 'custom', message: 'invalid_value' }), z.NEVER),
      ),
  }),
  [],
  async ({ phone }, { actorId }) => {
    const sms = await getSms()
    if (!sms) throw new ActionError('sms_not_configured')
    try {
      await sms.send(phone, 'gadgetsite: test message from the admin panel.')
    } catch (e) {
      throw new ActionError(e instanceof Error ? e.message : 'send_failed')
    }
    await db.auditLog.create({
      data: {
        actorId,
        action: 'update',
        entity: 'service',
        entityId: 'sms:test',
        after: { phone },
      },
    })
  },
)
