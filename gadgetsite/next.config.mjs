import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig)
