import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'

export async function POST() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  // Social platform connections are handled via YouTube OAuth (/api/auth/youtube)
  return NextResponse.json({ redirect: '/api/auth/youtube' })
}
