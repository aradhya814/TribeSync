import { getToken } from 'next-auth/jwt'
import { type NextRequest, NextResponse } from 'next/server'

import type { AppRole } from '@/lib/db/schema'

export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const userRole = token?.role as AppRole | undefined

  if (nextUrl.pathname.startsWith('/platform') && !token) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', nextUrl))
    }

    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/platform/home', nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/platform/:path*', '/admin/:path*'],
}
