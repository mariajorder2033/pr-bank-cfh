import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** Where uploaded files live. Local disk until hosting is chosen; S3 driver then (spec §14). */
export interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string): Promise<string>
}

const local: StorageDriver = {
  async put(key, bytes) {
    const path = join(process.cwd(), 'public', key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
    return `/${key}`
  },
}

export function getStorage(): StorageDriver {
  return local
}

export function uploadKey(ext: string, now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `uploads/${yyyy}/${mm}/${randomBytes(12).toString('hex')}.${ext}`
}
