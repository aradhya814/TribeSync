'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

import { getPusherClient } from '@/lib/pusher-client'

const eventMessages: Record<string, string> = {
  'deal-updated': 'Deal updated',
  'milestone-updated': 'Milestone updated',
  'brief-received': 'New inbound brief received',
  'payout-released': 'Payout released',
  'milestone-overdue': 'Milestone overdue',
}

export function useRealtimeNotifications(userId?: string) {
  useEffect(() => {
    if (!userId) return

    const client = getPusherClient()
    if (!client) return

    const channel = client.subscribe(`private-user-${userId}`)
    const handlers = Object.entries(eventMessages).map(([event, message]) => {
      const handler = () => toast(message)
      channel.bind(event, handler)
      return { event, handler }
    })

    return () => {
      for (const { event, handler } of handlers) {
        channel.unbind(event, handler)
      }
      client.unsubscribe(`private-user-${userId}`)
    }
  }, [userId])
}
