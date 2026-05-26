'use client'

import { Bell, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

import type { AppShellUser } from './AppShell'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function TopBar({ user }: { user: AppShellUser }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="caption">Workspace</p>
          <h1 className="truncate text-base font-semibold text-white">{user.name}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative text-text-mid hover:text-white">
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-tribe-primary" />
          </Button>

          <Avatar className="size-9 border border-hairline">
            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-surface-elevated text-xs text-white">
              {initials(user.name) || 'TS'}
            </AvatarFallback>
          </Avatar>

          <Button
            variant="ghost"
            size="icon"
            className="text-text-mid hover:text-white"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
