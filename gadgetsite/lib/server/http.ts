/** Mutating requests must come from our own site (spec §10: CSRF origin check). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const app = process.env.APP_URL
  if (!origin || !app) return false
  try {
    return new URL(origin).origin === new URL(app).origin
  } catch {
    return false
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status })
