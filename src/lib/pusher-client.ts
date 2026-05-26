'use client'

import PusherClient from 'pusher-js'

let client: PusherClient | null = null

export function getPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY

  if (!key) {
    return null
  }

  client ??= new PusherClient(key, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2',
  })

  return client
}
