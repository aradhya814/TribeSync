'use client'

import { CheckCircle2, Circle, ExternalLink, Loader2, ShieldCheck, Upload } from 'lucide-react'
import Script from 'next/script'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type RazorpayResponse = {
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  theme: { color: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

type DealRecord = {
  deal: {
    id: string
    status: string | null
    agreedAmount: string
    creatorId: string | null
    msmeId: string | null
  }
  campaign: {
    title: string
    goal: string | null
  }
  escrow: {
    status: string | null
    totalAmount: string
    releasedAmount: string | null
    fundedAt: string | null
  } | null
  invoice: {
    invoiceNumber: string
    status: string | null
    pdfUrl: string | null
  } | null
  milestones: Array<{
    id: string
    title: string
    description: string | null
    dueDate: string | null
    status: string | null
    proofUrl: string | null
    proofPlatform: string | null
    proofVerified: boolean | null
    proofMetadata: Record<string, unknown> | null
    proofVerificationError: string | null
    rejectionReason: string | null
  }>
  creator: {
    fullName: string | null
    email: string
  } | null
  brand: {
    fullName: string | null
    email: string
  } | null
  viewer: {
    id: string
    role: string
  }
}

type PaymentOrder = {
  order_id?: string
  amount?: number
  key?: string
  error?: string
}

const dealSteps = ['initiated', 'active', 'completed', 'invoiced', 'paid']

function formatInr(amount: string | null | undefined) {
  return `Rs ${Number(amount ?? 0).toLocaleString('en-IN')}`
}

function statusClass(status: string | null | undefined) {
  if (status === 'active' || status === 'approved' || status === 'funded' || status === 'completed') return 'badge-active'
  if (status === 'paid' || status === 'invoiced' || status === 'sent') return 'badge-paid'
  if (status === 'disputed' || status === 'rejected') return 'badge-disputed'
  if (status === 'draft' || status === 'unfunded' || status === 'pending') return 'badge-draft'
  return 'badge-pending'
}

function proofConfidence(metadata: Record<string, unknown> | null) {
  const confidence = metadata?.aiConfidence
  return typeof confidence === 'number' ? confidence : null
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>()
  const [record, setRecord] = useState<DealRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})

  const isCreator = record?.viewer.id === record?.deal.creatorId
  const isBrand = record?.viewer.id === record?.deal.msmeId

  const currentStepIndex = useMemo(() => {
    const status = record?.deal.status ?? 'initiated'
    return Math.max(0, dealSteps.indexOf(status))
  }, [record?.deal.status])

  const loadDeal = useCallback(async () => {
    setIsLoading(true)
    const response = await fetch(`/api/deals/${params.id}`)
    const data = (await response.json()) as DealRecord | { error: string }
    setIsLoading(false)

    if (!response.ok) {
      toast.error('error' in data ? data.error : 'Could not load deal')
      return
    }

    setRecord(data as DealRecord)
  }, [params.id])

  useEffect(() => {
    void loadDeal()
  }, [loadDeal])

  async function fundEscrow() {
    if (!record) return
    setBusyId('fund')
    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId: record.deal.id }),
    })
    const order = (await response.json()) as PaymentOrder
    setBusyId(null)

    if (!response.ok || !order.order_id || !order.amount) {
      toast.error(order.error ?? 'Could not create Razorpay order')
      return
    }

    if (!window.Razorpay || !order.key) {
      toast.success('Razorpay order created. Checkout will work once payment keys are added.')
      return
    }

    new window.Razorpay({
      key: order.key,
      amount: order.amount,
      currency: 'INR',
      name: 'TribeSync Escrow',
      description: record.campaign.title,
      order_id: order.order_id,
      handler: () => {
        toast.success('Payment captured. Waiting for Razorpay webhook confirmation.')
        void loadDeal()
      },
      theme: { color: '#EF5B5B' },
    }).open()
  }

  async function updateMilestone(milestoneId: string, payload: Record<string, unknown>) {
    setBusyId(milestoneId)
    const response = await fetch(`/api/milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json()) as { error?: string }
    setBusyId(null)

    if (!response.ok) {
      toast.error(data.error ?? 'Milestone update failed')
      return
    }

    toast.success('Milestone updated')
    await loadDeal()
  }

  if (isLoading) {
    return <div className="glass-card p-6">Loading deal...</div>
  }

  if (!record) {
    return <div className="glass-card p-6">Deal not found.</div>
  }

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="caption">Deal</p>
          <h1 className="heading-1">{record.campaign.title}</h1>
          <p className="body-text mt-2">
            {record.brand?.fullName ?? 'Brand'} with {record.creator?.fullName ?? 'Creator'}
          </p>
        </div>
        <span className={statusClass(record.deal.status)}>{record.deal.status ?? 'initiated'}</span>
      </div>

      <div className="glass-card p-5">
        <div className="grid gap-4 sm:grid-cols-5">
          {dealSteps.map((step, index) => {
            const complete = index <= currentStepIndex
            return (
              <div key={step} className="flex items-center gap-2">
                {complete ? <CheckCircle2 className="size-5 text-emerald-400" /> : <Circle className="size-5 text-text-low" />}
                <span className={complete ? 'text-sm font-semibold text-white' : 'text-sm text-text-low'}>{step}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card className="border-hairline bg-surface">
          <CardHeader>
            <CardTitle className="text-white">Escrow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="caption">Amount</p>
                <p className="text-2xl font-bold text-white">{formatInr(record.escrow?.totalAmount ?? record.deal.agreedAmount)}</p>
              </div>
              <div>
                <p className="caption">Released</p>
                <p className="text-2xl font-bold text-white">{formatInr(record.escrow?.releasedAmount)}</p>
              </div>
              <div>
                <p className="caption">Status</p>
                <span className={statusClass(record.escrow?.status)}>{record.escrow?.status ?? 'unfunded'}</span>
              </div>
            </div>
            {isBrand && record.escrow?.status === 'unfunded' ? (
              <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={fundEscrow} disabled={busyId === 'fund'}>
                {busyId === 'fund' ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Fund Escrow
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-hairline bg-surface">
          <CardHeader>
            <CardTitle className="text-white">Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {record.invoice ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{record.invoice.invoiceNumber}</span>
                  <span className={statusClass(record.invoice.status)}>{record.invoice.status}</span>
                </div>
                {record.invoice.pdfUrl ? (
                  <a className="inline-flex items-center gap-2 text-sm text-tribe-primary" href={record.invoice.pdfUrl} target="_blank">
                    <ExternalLink className="size-4" />
                    View PDF
                  </a>
                ) : null}
              </>
            ) : (
              <p className="body-text">Invoice appears automatically after all milestones are approved.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="heading-2">Milestones</h2>
          <p className="body-text">Proof submission, verification, and approval happen here.</p>
        </div>

        {record.milestones.length === 0 ? (
          <div className="glass-card p-5">
            <p className="body-text">No milestones have been added yet.</p>
          </div>
        ) : null}

        <div className="grid gap-4">
          {record.milestones.map((milestone) => {
            const confidence = proofConfidence(milestone.proofMetadata)
            return (
              <div key={milestone.id} className="glass-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">{milestone.title}</h3>
                    <p className="body-text mt-1">{milestone.description}</p>
                    <p className="caption mt-2">Due {milestone.dueDate ?? 'not set'}</p>
                  </div>
                  <span className={statusClass(milestone.status)}>{milestone.status ?? 'pending'}</span>
                </div>

                {milestone.proofUrl ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    <a className="inline-flex items-center gap-2 text-tribe-primary" href={milestone.proofUrl} target="_blank">
                      <ExternalLink className="size-4" />
                      Proof
                    </a>
                    {milestone.proofVerified ? <Badge className="bg-emerald-500/15 text-emerald-300">YouTube verified</Badge> : null}
                    {confidence !== null ? <Badge className="bg-blue-500/15 text-blue-300">AI alignment {confidence}%</Badge> : null}
                    {milestone.proofVerificationError ? (
                      <span className="text-xs text-amber-300">{milestone.proofVerificationError}</span>
                    ) : null}
                  </div>
                ) : null}

                {isCreator && record.deal.status === 'active' && milestone.status !== 'approved' ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input
                      placeholder="Paste YouTube or Instagram proof URL"
                      value={proofUrls[milestone.id] ?? ''}
                      onChange={(event) => setProofUrls((current) => ({ ...current, [milestone.id]: event.target.value }))}
                    />
                    <Button
                      className="bg-tribe-primary hover:bg-tribe-primary-hover"
                      disabled={busyId === milestone.id || !proofUrls[milestone.id]}
                      onClick={() => updateMilestone(milestone.id, { action: 'submit_proof', proofUrl: proofUrls[milestone.id] })}
                    >
                      {busyId === milestone.id ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      Submit Proof
                    </Button>
                  </div>
                ) : null}

                {isBrand && milestone.status === 'completed' ? (
                  <div className="mt-4 grid gap-3">
                    <Textarea
                      placeholder="Reason if rejecting"
                      value={rejectionReasons[milestone.id] ?? ''}
                      onChange={(event) =>
                        setRejectionReasons((current) => ({ ...current, [milestone.id]: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-tribe-primary hover:bg-tribe-primary-hover"
                        disabled={busyId === milestone.id}
                        onClick={() => updateMilestone(milestone.id, { action: 'approve' })}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busyId === milestone.id || !rejectionReasons[milestone.id]}
                        onClick={() =>
                          updateMilestone(milestone.id, {
                            action: 'reject',
                            rejectionReason: rejectionReasons[milestone.id],
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}

                {milestone.rejectionReason ? <p className="mt-3 text-sm text-red-300">{milestone.rejectionReason}</p> : null}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
