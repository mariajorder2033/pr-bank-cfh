import { MetaEdit } from '@/components/admin/CatalogMeta'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <MetaEdit kind="brands" id={(await params).id} />
}
