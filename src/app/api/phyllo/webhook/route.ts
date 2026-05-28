import { NextResponse } from 'next/server'

import { syncPhylloWebhook, verifyPhylloWebhookSignature } from '@/lib/phyllo'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-phyllo-signature') ?? request.headers.get('phyllo-signature')

  if (!verifyPhylloWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody) as unknown
  } catch {
    return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 })
  }

  const updated = await syncPhylloWebhook(payload)
  return NextResponse.json({ success: true, profileId: updated?.id ?? null })
}
