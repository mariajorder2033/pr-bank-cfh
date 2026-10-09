import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone project inside the bank monorepo: trace files from here, not the repo root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
}

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig)
