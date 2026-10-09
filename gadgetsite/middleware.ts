import { NextResponse, type NextRequest } from 'next/server'

/** Admin pages need a session cookie; the session itself is checked server-side. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/admin/login' || req.cookies.has('gs_admin')) return NextResponse.next()
  return NextResponse.redirect(new URL('/admin/login', req.url))
}

export const config = { matcher: ['/admin', '/admin/:path*'] }
