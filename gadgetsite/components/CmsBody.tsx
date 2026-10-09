import { text, type Bilingual, type Locale } from '@/lib/i18n'

/** CMS rich text. Sanitised when admin saves it (spec §10, Stage 3). */
export default function CmsBody({ html, locale }: { html: Bilingual; locale: Locale }) {
  return (
    <div
      className="font-serif leading-7 [&_a]:text-sand [&_h2]:mt-4 [&_h2]:font-sans [&_h2]:text-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2"
      dangerouslySetInnerHTML={{ __html: text(html, locale) }}
    />
  )
}
