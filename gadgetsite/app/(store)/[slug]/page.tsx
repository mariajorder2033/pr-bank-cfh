import CmsPageView from '@/components/CmsPageView'

/** Admin CMS pages (policies, custom pages) linked from the footer. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CmsPageView slug={slug} kinds={['policy', 'custom', 'about']} />
}
