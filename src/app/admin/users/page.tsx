'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type UserRow = {
  profile: {
    id: string
    email: string
    fullName: string | null
    status: string | null
    isVerified: boolean | null
  }
  role: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])

  async function loadUsers() {
    const response = await fetch('/api/admin/users')
    const data = (await response.json()) as { users?: UserRow[] }
    if (response.ok) setUsers(data.users ?? [])
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  async function mutate(id: string, action: 'verify' | 'suspend') {
    const response = await fetch(`/api/admin/users/${id}/${action}`, { method: 'PATCH' })
    if (!response.ok) {
      toast.error('Admin action failed')
      return
    }
    await loadUsers()
  }

  return (
    <main className="min-h-screen bg-background p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="caption">Admin</p>
          <h1 className="heading-1">Users</h1>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-hairline">
            {users.map((user) => (
              <div key={user.profile.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{user.profile.fullName ?? user.profile.email}</p>
                  <p className="caption">{user.profile.email}</p>
                </div>
                <span className="caption">{user.role}</span>
                <span className="caption">{user.profile.status}</span>
                <Button variant="outline" onClick={() => mutate(user.profile.id, 'verify')}>
                  {user.profile.isVerified ? 'Unverify' : 'Verify'}
                </Button>
                <Button variant="outline" onClick={() => mutate(user.profile.id, 'suspend')}>
                  {user.profile.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                </Button>
              </div>
            ))}
            {users.length === 0 ? <p className="body-text p-4">No users found.</p> : null}
          </div>
        </div>
      </div>
    </main>
  )
}
