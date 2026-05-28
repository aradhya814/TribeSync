import { NextResponse } from 'next/server'

import { requireAuth } from '@/lib/api/auth-check'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'YouTube connection not configured' }, { status: 503 })
  }

  const baseUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const redirectUri = `${baseUrl}/api/auth/youtube/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: YOUTUBE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: authResult.session.user.id,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
