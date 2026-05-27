'use client'

import type { ReactNode } from 'react'

import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import type { AppRole } from '@/lib/db/schema'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export type AppShellUser = {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  role: AppRole
}

export function AppShell({ children, user }: { children: ReactNode; user: AppShellUser }) {
  useRealtimeNotifications(user.id)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
