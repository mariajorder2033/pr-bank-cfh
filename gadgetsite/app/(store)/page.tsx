import Sections from '@/components/Sections'
import { getLayout } from '@/lib/server/cached'
import { currentLocale } from '@/lib/server/locale'

export default async function Home() {
  const [sections, locale] = await Promise.all([getLayout('home'), currentLocale()])
  return <Sections sections={sections} locale={locale} />
}
