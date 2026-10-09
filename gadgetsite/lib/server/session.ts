import { cookies } from 'next/headers'
import { SESSION_COOKIE, readCustomer } from '@/lib/auth/customer'

/** The signed-in customer for this request, or null. Never cached: it depends on the cookie. */
export async function currentCustomer() {
  return readCustomer((await cookies()).get(SESSION_COOKIE)?.value)
}
