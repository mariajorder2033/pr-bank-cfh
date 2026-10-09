// Creates (or resets) an admin: npm run admin:create -- --email owner@shop.bd [--role owner]
// The password comes from ADMIN_PASSWORD or a hidden prompt. 2FA is set up at first sign-in.
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'

if (existsSync('.env')) process.loadEnvFile('.env')
const { values } = parseArgs({
  options: { email: { type: 'string' }, role: { type: 'string', default: 'owner' } },
})
if (!values.email)
  throw new Error('Usage: npm run admin:create -- --email you@shop.bd [--role owner]')

async function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream }
  out._writeToOutput = (s) => out.output.write(s.includes(question) ? s : '')
  const answer = await new Promise<string>((resolve) => rl.question(question, resolve))
  rl.close()
  process.stdout.write('\n')
  return answer
}

const password = process.env.ADMIN_PASSWORD ?? (await askHidden('Password (12+ characters): '))
if (password.length < 12) throw new Error('Admin passwords need at least 12 characters')

const { db } = await import('../lib/db')
const { hashPassword } = await import('../lib/auth/password')
const email = values.email.trim().toLowerCase()
const role = await db.role.findUniqueOrThrow({ where: { name: values.role } })
const passwordHash = await hashPassword(password)
const user = await db.adminUser.upsert({
  where: { email },
  update: { passwordHash, passwordChangedAt: new Date(), active: true },
  create: { email, passwordHash },
})
await db.userRole.upsert({
  where: { userId_roleId: { userId: user.id, roleId: role.id } },
  update: {},
  create: { userId: user.id, roleId: role.id },
})
console.log(`Admin ${email} (${values.role}) is ready. Sign in at /admin/login to set up 2FA.`)
await db.$disconnect()
