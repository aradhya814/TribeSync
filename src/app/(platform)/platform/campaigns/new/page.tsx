'use client'

import { Loader2, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type ParsedCampaign = {
  title: string
  goal: string
  niche: string
  budget: number
  deliverables: string
  timeline_days: number
  suggested_min_avg_views: number
  suggested_content_style: string
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [parsed, setParsed] = useState<ParsedCampaign | null>(null)
  const [rawBrief, setRawBrief] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function parseBrief() {
    setIsParsing(true)
    const response = await fetch('/api/ai/parse-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawBrief }),
    })
    const result = (await response.json()) as ParsedCampaign
    setParsed(result)
    setIsParsing(false)
  }

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        goal: String(formData.get('goal') ?? ''),
        niche: String(formData.get('niche') ?? ''),
        budget: String(formData.get('budget') ?? '0'),
        deliverables: String(formData.get('deliverables') ?? ''),
        minAvgViews: Number(formData.get('minAvgViews') ?? 0),
        requiredContentStyle: String(formData.get('requiredContentStyle') ?? ''),
      }),
    })
    const result = (await response.json()) as { campaign?: { id: string }; error?: string }
    setIsSubmitting(false)

    if (!response.ok || !result.campaign) {
      toast.error(result.error ?? 'Could not create campaign')
      return
    }

    await fetch(`/api/campaigns/${result.campaign.id}/submit-for-review`, { method: 'PATCH' })
    router.push(`/platform/campaigns/${result.campaign.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="caption">New campaign</p>
        <h1 className="heading-1">Create a creator brief</h1>
      </div>

      <Tabs defaultValue="describe" className="space-y-5">
        <TabsList className="bg-surface">
          <TabsTrigger value="describe">Describe in words</TabsTrigger>
          <TabsTrigger value="manual">Fill manually</TabsTrigger>
        </TabsList>

        <TabsContent value="describe" className="space-y-4">
          <div className="glass-card p-4">
            <Label htmlFor="rawBrief">Brief</Label>
            <Textarea id="rawBrief" className="mt-2" rows={6} value={rawBrief} onChange={(event) => setRawBrief(event.target.value)} />
            <Button className="mt-3 bg-tribe-primary hover:bg-tribe-primary-hover" onClick={parseBrief} disabled={isParsing || rawBrief.length < 10}>
              {isParsing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              Parse with AI
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="manual" />
      </Tabs>

      <form className="glass-card space-y-4 p-5" onSubmit={submitCampaign}>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required defaultValue={parsed?.title ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={rawBrief} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Input id="goal" name="goal" defaultValue={parsed?.goal ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="niche">Niche</Label>
            <Input id="niche" name="niche" defaultValue={parsed?.niche ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" name="budget" inputMode="decimal" defaultValue={parsed?.budget ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minAvgViews">Suggested min avg views</Label>
            <Input id="minAvgViews" name="minAvgViews" inputMode="numeric" defaultValue={parsed?.suggested_min_avg_views ?? 8000} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="requiredContentStyle">Suggested content style</Label>
          <Input id="requiredContentStyle" name="requiredContentStyle" defaultValue={parsed?.suggested_content_style ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliverables">Deliverables</Label>
          <Textarea id="deliverables" name="deliverables" rows={3} defaultValue={parsed?.deliverables ?? ''} />
        </div>
        <Button className="w-full bg-tribe-primary hover:bg-tribe-primary-hover" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit for Review
        </Button>
      </form>
    </div>
  )
}
