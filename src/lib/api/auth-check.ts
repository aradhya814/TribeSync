import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    } as const
  }

  return { session, error: null } as const
}

export async function requireAdmin() {
  const authResult = await requireAuth()

  if (authResult.error) {
    return authResult
  }

  if (authResult.session.user.role !== 'admin') {
    return {
      session: authResult.session,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    } as const
  }

  return { session: authResult.session, error: null } as const
}

export function requireCron(request: Request) {
  const authorization = request.headers.get('Authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
