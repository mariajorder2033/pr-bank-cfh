'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ui } from '@/lib/ui'

export default function LocaleToggle() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  return (
    <button
      type="button"
      data-testid="locale-toggle"
      className={`${ui.iconBox} text-xs`}
      onClick={() => {
        const next = locale === 'bn' ? 'en' : 'bn'
        document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`
        router.refresh()
      }}
    >
      {t('language')}
    </button>
  )
}
