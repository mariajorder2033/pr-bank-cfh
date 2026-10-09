import StoreChrome from '@/components/StoreChrome'
import NotFoundView from '@/components/NotFoundView'

/** URLs that match no route at all: the storefront 404 inside the storefront chrome. */
export default function NotFound() {
  return (
    <StoreChrome>
      <NotFoundView />
    </StoreChrome>
  )
}
