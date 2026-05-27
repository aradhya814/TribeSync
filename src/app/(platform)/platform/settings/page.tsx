'use client'

import { Copy, Download, Loader2, Save } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type SettingsData = {
  profile: {
    id: string
    fullName: string | null
    email: string
    enrichedSummary: string | null
    niche: string | null
    location: string | null
    publicSlug: string | null
    linkInBioEnabled: boolean | null
    linkInBioCta: string | null
    views72h: number | null
    contentLanguage: string | null
    contentPurity: string | null
    secondaryNiche: string | null
    contentMixRatio: string | null
    sponsorshipReadiness: string | null
    acceptsSponsorships: boolean | null
  } | null
  notificationPrefs: Record<string, boolean> | null
  bankDetails: {
    accountHolderName: string
    ifscCode: string
    bankName: string | null
    upiId: string | null
    panNumber: string | null
    gstNumber: string | null
    maskedAccountNumber: string | null
    isVerified: boolean | null
  } | null
}

type PhylloConnectWindow = Window & {
  PhylloConnect?: {
    initialize: (config: {
      clientDisplayName: string
      environment: string
      userId: string
      token: string
      workPlatformId?: string
    }) => { open: () => void }
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    enrichedSummary: '',
    niche: '',
    location: '',
    views72h: '',
    contentLanguage: 'en',
    contentPurity: 'pure',
    secondaryNiche: '',
    primaryMixPercent: '70',
    secondaryMixPercent: '30',
    acceptsSponsorships: true,
  })
  const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '', panNumber: '', gstNumber: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [isConnectingPhyllo, setIsConnectingPhyllo] = useState(false)
  const [phylloTokenStatus, setPhylloTokenStatus] = useState('')

  async function loadSettings() {
    const response = await fetch('/api/settings')
    const payload = (await response.json()) as SettingsData
    setData(payload)
    const [primaryMixPercent = '70', secondaryMixPercent = '30'] = (payload.profile?.contentMixRatio ?? '70/30').split('/')
    setProfileForm({
      fullName: payload.profile?.fullName ?? '',
      enrichedSummary: payload.profile?.enrichedSummary ?? '',
      niche: payload.profile?.niche ?? '',
      location: payload.profile?.location ?? '',
      views72h: payload.profile?.views72h ? String(payload.profile.views72h) : '',
      contentLanguage: payload.profile?.contentLanguage ?? 'en',
      contentPurity: payload.profile?.contentPurity ?? 'pure',
      secondaryNiche: payload.profile?.secondaryNiche ?? '',
      primaryMixPercent,
      secondaryMixPercent,
      acceptsSponsorships: payload.profile?.acceptsSponsorships ?? true,
    })
    setBankForm({
      accountHolderName: payload.bankDetails?.accountHolderName ?? '',
      accountNumber: '',
      ifscCode: payload.bankDetails?.ifscCode ?? '',
      bankName: payload.bankDetails?.bankName ?? '',
      upiId: payload.bankDetails?.upiId ?? '',
      panNumber: payload.bankDetails?.panNumber ?? '',
      gstNumber: payload.bankDetails?.gstNumber ?? '',
    })
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const publicUrl = useMemo(() => {
    if (!data?.profile?.publicSlug) return ''
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/c/${data.profile.publicSlug}`
  }, [data?.profile?.publicSlug])

  async function patchSettings(payload: Record<string, unknown>) {
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const error = (await response.json()) as { error?: string }
      toast.error(error.error ?? 'Settings update failed')
      return
    }
    toast.success('Saved')
    await loadSettings()
  }

  function downloadQr() {
    const canvas = document.getElementById('profile-qr') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'tribesync-profile-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function saveProfile() {
    void patchSettings({
      section: 'profile',
      fullName: profileForm.fullName,
      enrichedSummary: profileForm.enrichedSummary,
      niche: profileForm.niche,
      location: profileForm.location,
      views72h: Number(profileForm.views72h || 0),
      contentLanguage: profileForm.contentLanguage,
      contentPurity: profileForm.contentPurity,
      secondaryNiche: profileForm.contentPurity === 'mixed' ? profileForm.secondaryNiche : undefined,
      contentMixRatio:
        profileForm.contentPurity === 'mixed'
          ? `${profileForm.primaryMixPercent || '70'}/${profileForm.secondaryMixPercent || '30'}`
          : undefined,
      acceptsSponsorships: profileForm.acceptsSponsorships,
    })
  }

  async function connectPhyllo() {
    setIsConnectingPhyllo(true)
    setPhylloTokenStatus('')

    const response = await fetch('/api/phyllo/connect', { method: 'POST' })
    const payload = (await response.json()) as { sdkToken?: string; phylloUserId?: string; error?: string }
    setIsConnectingPhyllo(false)

    if (!response.ok || !payload.sdkToken || !payload.phylloUserId) {
      toast.error(payload.error ?? 'Could not start Phyllo connection')
      return
    }

    const phylloConnect = (window as PhylloConnectWindow).PhylloConnect
    if (phylloConnect) {
      phylloConnect.initialize({
        clientDisplayName: 'TribeSync',
        environment: process.env.NEXT_PUBLIC_PHYLLO_ENVIRONMENT ?? 'sandbox',
        userId: payload.phylloUserId,
        token: payload.sdkToken,
      }).open()
    } else {
      setPhylloTokenStatus('Connection token ready. Load the Phyllo Connect SDK to open the OAuth flow.')
    }

    toast.success('Phyllo connection started')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Settings</p>
        <h1 className="heading-1">Account</h1>
      </div>

      <Tabs defaultValue="profile" className="space-y-5">
        <TabsList className="bg-surface">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="link">Link-in-Bio</TabsTrigger>
          <TabsTrigger value="payout">Payout</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="glass-card p-5">
          <div className="grid gap-4">
            <Input placeholder="Full name" value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} />
            <Input placeholder="Niche" value={profileForm.niche} onChange={(event) => setProfileForm({ ...profileForm, niche: event.target.value })} />
            <Input placeholder="Location" value={profileForm.location} onChange={(event) => setProfileForm({ ...profileForm, location: event.target.value })} />
            <Textarea placeholder="Bio" value={profileForm.enrichedSummary} onChange={(event) => setProfileForm({ ...profileForm, enrichedSummary: event.target.value })} />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="views72h">Views in first 72 hours (average)</Label>
                <Input
                  id="views72h"
                  inputMode="numeric"
                  value={profileForm.views72h}
                  onChange={(event) => setProfileForm({ ...profileForm, views72h: event.target.value })}
                />
                <p className="caption">
                  Brands use this to gauge how quickly your audience engages. 80K+ in 72h on a 15-min video is considered sponsorship-ready.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Content Language</Label>
                <Select
                  value={profileForm.contentLanguage}
                  onValueChange={(value) => setProfileForm({ ...profileForm, contentLanguage: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ta">Tamil</SelectItem>
                    <SelectItem value="te">Telugu</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-hairline bg-surface-elevated p-4">
              <Label>Content Type</Label>
              <RadioGroup
                className="mt-3 grid gap-3 sm:grid-cols-3"
                value={profileForm.contentPurity}
                onValueChange={(value) => setProfileForm({ ...profileForm, contentPurity: value })}
              >
                {[
                  ['pure', 'Pure Niche'],
                  ['mixed', 'Mixed Content'],
                  ['regional', 'Regional'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-white">
                    <RadioGroupItem value={value} />
                    {label}
                  </label>
                ))}
              </RadioGroup>

              {profileForm.contentPurity === 'mixed' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr]">
                  <Input
                    aria-label="Primary niche percentage"
                    inputMode="numeric"
                    value={profileForm.primaryMixPercent}
                    onChange={(event) => setProfileForm({ ...profileForm, primaryMixPercent: event.target.value })}
                    placeholder="Primary niche %"
                  />
                  <Select
                    value={profileForm.secondaryNiche || 'lifestyle'}
                    onValueChange={(value) => setProfileForm({ ...profileForm, secondaryNiche: value })}
                  >
                    <SelectTrigger><SelectValue placeholder="Secondary niche" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label="Secondary niche percentage"
                    inputMode="numeric"
                    value={profileForm.secondaryMixPercent}
                    onChange={(event) => setProfileForm({ ...profileForm, secondaryMixPercent: event.target.value })}
                    placeholder="Secondary %"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface-elevated p-3">
              <div>
                <p className="text-sm font-semibold text-white">Open to Sponsorships</p>
                <p className="caption">Allows brands to prioritize you in sponsorship-ready filters.</p>
              </div>
              <Switch
                checked={profileForm.acceptsSponsorships}
                onCheckedChange={(checked) => setProfileForm({ ...profileForm, acceptsSponsorships: checked })}
              />
            </div>

            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-sm font-semibold text-white">
                Your sponsorship readiness score: {Number(data?.profile?.sponsorshipReadiness ?? 0).toFixed(2)} / 1.00
              </p>
              <p className="caption mt-1">Improve it: Connect YouTube to verify your view velocity</p>
              <Button className="mt-3 bg-tribe-primary hover:bg-tribe-primary-hover" onClick={connectPhyllo} disabled={isConnectingPhyllo}>
                {isConnectingPhyllo ? <Loader2 className="size-4 animate-spin" /> : null}
                Connect YouTube / Instagram
              </Button>
              {phylloTokenStatus ? <p className="caption mt-2">{phylloTokenStatus}</p> : null}
            </div>

            <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={saveProfile}>
              <Save className="size-4" />
              Save profile
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="link" className="glass-card p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <div className="rounded-lg border border-hairline bg-surface-elevated p-3">
                <p className="caption">Public URL</p>
                <div className="mt-2 flex gap-2">
                  <Input readOnly value={publicUrl} />
                  <Button variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <Input
                placeholder="CTA text"
                value={data?.profile?.linkInBioCta ?? ''}
                onChange={(event) => setData((current) => current ? { ...current, profile: current.profile ? { ...current.profile, linkInBioCta: event.target.value } : null } : current)}
              />
              <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface-elevated p-3">
                <span className="text-sm font-semibold text-white">Enabled</span>
                <Switch
                  checked={Boolean(data?.profile?.linkInBioEnabled)}
                  onCheckedChange={(checked) => setData((current) => current ? { ...current, profile: current.profile ? { ...current.profile, linkInBioEnabled: checked } : null } : current)}
                />
              </div>
              <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => patchSettings({ section: 'link', linkInBioCta: data?.profile?.linkInBioCta, linkInBioEnabled: data?.profile?.linkInBioEnabled })}>
                Save link
              </Button>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-elevated p-5">
              <p className="text-lg font-semibold text-white">{data?.profile?.fullName ?? 'Creator'}</p>
              <p className="body-text mt-2">{data?.profile?.enrichedSummary ?? 'Profile preview'}</p>
              {publicUrl ? <QRCodeCanvas id="profile-qr" value={publicUrl} className="mt-5 rounded bg-white p-2" /> : null}
              <Button variant="outline" className="mt-4" onClick={downloadQr}>
                <Download className="size-4" />
                Download QR
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payout" className="glass-card p-5">
          <div className="grid gap-4">
            <p className="caption">Saved account {data?.bankDetails?.maskedAccountNumber ?? 'not set'} · {data?.bankDetails?.isVerified ? 'verified' : 'pending verification'}</p>
            <Input placeholder="Account holder" value={bankForm.accountHolderName} onChange={(event) => setBankForm({ ...bankForm, accountHolderName: event.target.value })} />
            <Input placeholder="Account number" value={bankForm.accountNumber} onChange={(event) => setBankForm({ ...bankForm, accountNumber: event.target.value })} />
            <Input placeholder="IFSC" value={bankForm.ifscCode} onChange={(event) => setBankForm({ ...bankForm, ifscCode: event.target.value })} />
            <Input placeholder="Bank name" value={bankForm.bankName} onChange={(event) => setBankForm({ ...bankForm, bankName: event.target.value })} />
            <Input placeholder="UPI ID" value={bankForm.upiId} onChange={(event) => setBankForm({ ...bankForm, upiId: event.target.value })} />
            <Input placeholder="PAN" value={bankForm.panNumber} onChange={(event) => setBankForm({ ...bankForm, panNumber: event.target.value })} />
            <Input placeholder="GST optional" value={bankForm.gstNumber} onChange={(event) => setBankForm({ ...bankForm, gstNumber: event.target.value })} />
            <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => patchSettings({ section: 'bank', ...bankForm, accountNumber: bankForm.accountNumber || undefined })}>
              Save payout
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="glass-card p-5">
          <div className="space-y-3">
            {Object.entries(data?.notificationPrefs ?? {}).filter(([key]) => key.startsWith('email')).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-hairline bg-surface-elevated p-3">
                <span className="text-sm font-semibold text-white">{key}</span>
                <Switch checked={Boolean(value)} onCheckedChange={(checked) => patchSettings({ section: 'notifications', [key]: checked })} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="glass-card p-5">
          <div className="grid gap-4">
            <Input type="password" placeholder="Current password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
            <Input type="password" placeholder="New password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
            <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => patchSettings({ section: 'password', ...passwordForm })}>
              Change password
            </Button>
            <Button variant="destructive" onClick={() => patchSettings({ section: 'delete', confirmation: 'DELETE' })}>
              Delete account
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
