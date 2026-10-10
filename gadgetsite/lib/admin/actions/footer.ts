import { FooterSettings } from '@/lib/content/schemas'
import { adminAction } from '../action'
import { audited } from '../audit'

/** Lists arrive as indexed fields; blank rows (no title / name / url) are dropped first. */
const Footer = FooterSettings.extend({}).transform((f) => f)

function clean(raw: unknown): unknown {
  const f = (raw ?? {}) as Record<string, unknown[]>
  const arr = (k: string) =>
    Array.isArray(f[k]) ? (f[k] as Record<string, unknown>[]).filter(Boolean) : []
  const filled = (v: unknown) => typeof v === 'string' && v.trim() !== ''
  return {
    ...f,
    columns: arr('columns')
      .filter((c) => filled((c.title as { en?: string } | undefined)?.en))
      .map((c) => ({
        ...c,
        links: (Array.isArray(c.links) ? (c.links as Record<string, unknown>[]) : []).filter(
          (l) => l && filled(l.href),
        ),
      })),
    branches: arr('branches').filter((b) => filled((b.name as { en?: string })?.en)),
    socials: arr('socials').filter((s) => filled(s.url)),
    appLinks: arr('appLinks').filter((a) => filled(a.url)),
  }
}

export const saveFooter = adminAction(
  'content.write',
  // Validation runs on the cleaned value, so empty template rows never cause errors.
  Footer,
  ['content', 'settings'],
  async (value, { actorId, ip }) => {
    await audited(
      actorId,
      'update',
      'setting',
      'footer',
      async (tx) => {
        const before = (await tx.setting.findUnique({ where: { key: 'footer' } }))?.value ?? null
        await tx.setting.upsert({
          where: { key: 'footer' },
          create: { key: 'footer', value },
          update: { value },
        })
        return { before, after: value, result: null }
      },
      ip,
    )
  },
  clean,
)
