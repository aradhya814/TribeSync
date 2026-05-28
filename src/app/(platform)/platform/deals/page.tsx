'use client'

import { Handshake } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type Deal = {
  id: string
  status: string
  agreedAmount: string
  createdAt: string
  campaign: { title: string } | null
  creator: { fullName: string | null; email: string } | null
  msme: { fullName: string | null; email: string } | null
}

const statusClass: Record<string, string> = {
  initiated: 'badge-pending',
  active: 'badge-active',
  completed: 'badge-paid',
  disputed: 'badge-disputed',
  cancelled: 'badge-pending',
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/deals')
      .then((r) => r.json() as Promise<Deal[]>)
      .then((data) => {
        setDeals(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Deals</p>
        <h1 className="heading-1">My Deals</h1>
      </div>

      {loading && (
        <div className="text-muted-foreground text-sm">Loading deals…</div>
      )}

      {!loading && deals.length === 0 && (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Handshake className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">No deals yet. Apply to campaigns to get started.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {deals.map((deal) => (
          <Link key={deal.id} href={`/platform/deals/${deal.id}`}>
            <Card className="glass-card cursor-pointer transition-opacity hover:opacity-80">
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="font-medium">{deal.campaign?.title ?? 'Untitled Campaign'}</p>
                  <p className="text-muted-foreground text-xs">
                    {deal.creator?.fullName ?? deal.creator?.email} ↔ {deal.msme?.fullName ?? deal.msme?.email}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(deal.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusClass[deal.status] ?? 'badge-pending'}>
                    {deal.status}
                  </Badge>
                  <p className="text-sm font-semibold">
                    ₹{Number(deal.agreedAmount).toLocaleString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
