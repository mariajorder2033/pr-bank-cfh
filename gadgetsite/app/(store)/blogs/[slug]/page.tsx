import CmsPageView from '@/components/CmsPageView'

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CmsPageView slug={slug} kinds={['blog']} />
}
