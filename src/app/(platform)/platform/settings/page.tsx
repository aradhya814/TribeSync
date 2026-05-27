'use client'

import { Copy, Download, Save } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type SettingsData = {
  profile: {
    id: string
    fullName: string | null
    email: string
    bio: string | null
    niche: string | null
    location: string | null
    publicSlug: string | null
    linkInBioEnabled: boolean | null
    linkInBioCta: string | null
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

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [profileForm, setProfileForm] = useState({ fullName: '', bio: '', niche: '', location: '' })
  const [bankForm, setBankForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '', panNumber: '', gstNumber: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })

  async function loadSettings() {
    const response = await fetch('/api/settings')
    const payload = (await response.json()) as SettingsData
    setData(payload)
    setProfileForm({
      fullName: payload.profile?.fullName ?? '',
      bio: payload.profile?.bio ?? '',
      niche: payload.profile?.niche ?? '',
      location: payload.profile?.location ?? '',
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
            <Textarea placeholder="Bio" value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} />
            <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => patchSettings({ section: 'profile', ...profileForm })}>
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
              <p className="body-text mt-2">{data?.profile?.bio ?? 'Profile preview'}</p>
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
