'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ui } from '@/lib/ui'

export default function ThemeToggle() {
  const t = useTranslations('nav')
  const [light, setLight] = useState(false)
  useEffect(() => setLight(document.documentElement.classList.contains('light')), [])
  return (
    <button
      type="button"
      className={`${ui.iconBox} !bg-[#5a4d40]`}
      aria-label={t('theme')}
      onClick={() => {
        const next = !light
        setLight(next)
        document.documentElement.classList.toggle('light', next)
        try {
          localStorage.setItem('theme', next ? 'light' : 'dark')
        } catch {}
      }}
    >
      {light ? '☀' : '☾'}
    </button>
  )
}
