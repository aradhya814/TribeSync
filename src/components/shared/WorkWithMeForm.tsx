'use client'

import { Loader2, Send } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type BriefResponse = {
  success?: boolean
  error?: string
}

export function WorkWithMeForm({ creatorId }: { creatorId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        brandName: String(formData.get('brandName') ?? ''),
        contactEmail: String(formData.get('contactEmail') ?? ''),
        product: String(formData.get('product') ?? ''),
        budget: String(formData.get('budget') ?? '') || null,
        timeline: String(formData.get('timeline') ?? ''),
        message: String(formData.get('message') ?? ''),
      }),
    })

    const result = (await response.json()) as BriefResponse
    setIsSubmitting(false)

    if (!response.ok || !result.success) {
      toast.error(result.error ?? 'Could not send brief')
      return
    }

    setIsSubmitted(true)
    toast.success('Brief sent')
  }

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-5">
        <h2 className="heading-3">Brief received</h2>
        <p className="body-text mt-2">The creator has been notified.</p>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="brandName">Brand name</Label>
        <Input id="brandName" name="brandName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="product">Product</Label>
        <Input id="product" name="product" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input id="budget" name="budget" inputMode="decimal" placeholder="60000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline">Timeline</Label>
          <Input id="timeline" name="timeline" placeholder="2 weeks" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>
      <Button type="submit" className="w-full bg-tribe-primary hover:bg-tribe-primary-hover" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send brief
      </Button>
    </form>
  )
}
