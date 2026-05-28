import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import type { AppRole } from '@/lib/db/schema'

export default auth((request) => {
  const { nextUrl } = request
  const session = request.auth
  const userRole = session?.user?.role as AppRole | undefined

  if (nextUrl.pathname.startsWith('/platform') && !session) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', nextUrl))
    }
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/platform/home', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/platform/:path*', '/admin/:path*'],
}
