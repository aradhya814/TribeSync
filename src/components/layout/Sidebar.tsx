'use client'

import {
  BarChart3,
  BellDot,
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Compass,
  FileText,
  Handshake,
  Home,
  LineChart,
  Megaphone,
  PanelLeft,
  PlaySquare,
  Search,
  Settings,
  Shield,
  Trophy,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

import type { AppRole } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
}

const creatorNav: NavItem[] = [
  { label: 'Home', href: '/platform/home', icon: Home },
  { label: 'Discover Campaigns', href: '/platform/campaigns', icon: Compass },
  { label: 'My Deals', href: '/platform/deals', icon: Handshake },
  { label: 'Growth', href: '/platform/growth/dashboard', icon: LineChart },
  { label: 'Rankings', href: '/platform/growth/rankings', icon: Trophy },
  { label: 'Playbooks', href: '/platform/growth/playbooks', icon: PlaySquare },
  { label: 'Settings', href: '/platform/settings', icon: Settings },
]

const brandNav: NavItem[] = [
  { label: 'Home', href: '/platform/home', icon: Home },
  { label: 'Find Creators', href: '/platform/search', icon: Search },
  { label: 'My Campaigns', href: '/platform/campaigns', icon: BriefcaseBusiness },
  { label: 'Analytics', href: '/platform/analytics', icon: BarChart3 },
  { label: 'Deals', href: '/platform/deals', icon: Handshake },
  { label: 'CRM', href: '/platform/crm', icon: Users },
  { label: 'Outreach', href: '/platform/outreach', icon: Megaphone },
  { label: 'Settings', href: '/platform/settings', icon: Settings },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: Shield },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Campaigns', href: '/admin/campaigns', icon: BriefcaseBusiness },
  { label: 'Disputes', href: '/admin/disputes', icon: BellDot },
  { label: 'Payouts', href: '/admin/payouts', icon: FileText },
  { label: 'Analytics', href: '/admin/analytics', icon: ChartNoAxesColumnIncreasing },
]

function navForRole(role: AppRole) {
  if (role === 'admin') return adminNav
  if (role === 'msme') return brandNav
  return creatorNav
}

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname()
  const nav = navForRole(role)

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-hairline bg-surface px-4 py-5 lg:block">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-tribe-primary text-sm font-bold text-white">
          TS
        </div>
        <div>
          <p className="text-sm font-bold text-white">TribeSync</p>
          <p className="caption capitalize">{role}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-item', isActive && 'sidebar-item-active')}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 rounded-lg border border-hairline bg-surface-elevated p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <PanelLeft className="size-4 text-tribe-primary" />
          Agent feed
        </div>
        <p className="caption leading-5">Autonomous updates appear on Home when workflows start running.</p>
      </div>
    </aside>
  )
}
