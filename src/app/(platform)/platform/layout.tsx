import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/AppShell'
import { auth } from '@/lib/auth'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <AppShell
      user={{
        id: session.user.id,
        name: session.user.name ?? session.user.email ?? 'TribeSync User',
        email: session.user.email ?? '',
        avatarUrl: session.user.image,
        role: session.user.role,
      }}
    >
      {children}
    </AppShell>
  )
}
