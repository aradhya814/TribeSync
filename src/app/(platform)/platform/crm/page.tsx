'use client'

import { Mail, Plus, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

type CrmStage = 'lead' | 'qualified' | 'outreach' | 'negotiation' | 'partner'

type Contact = {
  id: string
  creatorId: string | null
  name: string
  email: string | null
  platform: string | null
  handle: string | null
  stage: CrmStage | null
  notes: string | null
  tags: string[] | null
  nextStep: string | null
  lastContactedAt: string | null
  followUpDueAt: string | null
}

const stages: Array<{ key: CrmStage; label: string }> = [
  { key: 'lead', label: 'Lead' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'partner', label: 'Partner' },
]

export default function CrmPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact | null>(null)
  const [draft, setDraft] = useState<{ subject: string; message: string } | null>(null)
  const [form, setForm] = useState({ name: '', email: '', platform: '', handle: '' })

  const loadContacts = useCallback(async () => {
    const response = await fetch('/api/crm')
    const data = (await response.json()) as { contacts?: Contact[]; error?: string }
    if (!response.ok) {
      toast.error(data.error ?? 'Could not load CRM')
      return
    }
    setContacts(data.contacts ?? [])
  }, [])

  useEffect(() => {
    void loadContacts()
  }, [loadContacts])

  const contactsByStage = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      contacts: contacts.filter((contact) => (contact.stage ?? 'lead') === stage.key),
    }))
  }, [contacts])

  async function createContact() {
    if (!form.name) return
    const response = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email || undefined,
        platform: form.platform || undefined,
        handle: form.handle || undefined,
      }),
    })
    const data = (await response.json()) as { error?: string }
    if (!response.ok) {
      toast.error(data.error ?? 'Could not add contact')
      return
    }
    setForm({ name: '', email: '', platform: '', handle: '' })
    toast.success('Contact added')
    await loadContacts()
  }

  async function updateStage(contact: Contact, stage: CrmStage) {
    const response = await fetch('/api/crm', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: contact.id, stage }),
    })
    if (!response.ok) {
      toast.error('Could not update stage')
      return
    }
    setContacts((current) => current.map((item) => (item.id === contact.id ? { ...item, stage } : item)))
  }

  async function draftOutreach() {
    if (!selected?.email) {
      toast.error('This contact needs an email address first')
      return
    }

    const response = await fetch('/api/ai/generate-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: selected.email,
        creator: selected,
        tone: 'warm, specific, and businesslike',
      }),
    })
    const data = (await response.json()) as { subject?: string; message?: string; error?: string }
    if (!response.ok || !data.subject || !data.message) {
      toast.error(data.error ?? 'Could not draft outreach')
      return
    }
    setDraft({ subject: data.subject, message: data.message })
    toast.success('Outreach drafted and logged')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="caption">Brand CRM</p>
        <h1 className="heading-1">Creator pipeline</h1>
      </div>

      <div className="glass-card grid gap-3 p-4 lg:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto]">
        <Input placeholder="Creator name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Input placeholder="Platform" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} />
        <Input placeholder="Handle" value={form.handle} onChange={(event) => setForm({ ...form, handle: event.target.value })} />
        <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={createContact}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {contactsByStage.map((column) => (
          <section key={column.key} className="min-h-96 rounded-lg border border-hairline bg-surface/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{column.label}</h2>
              <span className="caption">{column.contacts.length}</span>
            </div>
            <div className="space-y-3">
              {column.contacts.map((contact) => (
                <button
                  key={contact.id}
                  className="w-full rounded-lg border border-hairline bg-surface-elevated p-3 text-left hover:border-tribe-primary/60"
                  onClick={() => {
                    setSelected(contact)
                    setDraft(null)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{contact.name}</p>
                      <p className="caption">{contact.platform ?? 'platform'} {contact.handle ?? ''}</p>
                    </div>
                    {contact.email ? <Mail className="size-4 text-text-low" /> : null}
                  </div>
                  <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                    <Select value={contact.stage ?? 'lead'} onValueChange={(value) => updateStage(contact, value as CrmStage)}>
                      <SelectTrigger className="h-8 border-hairline bg-background text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.key} value={stage.key}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="border-hairline bg-background sm:max-w-xl">
          {selected ? (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="text-white">{selected.name}</SheetTitle>
                <SheetDescription>{selected.email ?? 'No email saved'}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-3">
                <div>
                  <p className="caption">Notes</p>
                  <p className="body-text mt-1">{selected.notes ?? 'No notes yet.'}</p>
                </div>
                <div>
                  <p className="caption">Next step</p>
                  <p className="body-text mt-1">{selected.nextStep ?? 'Not set'}</p>
                </div>
                <div>
                  <p className="caption">Follow-up due</p>
                  <p className="body-text mt-1">{selected.followUpDueAt ?? 'Not scheduled'}</p>
                </div>
              </div>
              <Button className="bg-tribe-primary hover:bg-tribe-primary-hover" onClick={draftOutreach}>
                <Wand2 className="size-4" />
                Draft Outreach
              </Button>
              {draft ? (
                <div className="rounded-lg border border-hairline bg-surface p-4">
                  <p className="text-sm font-semibold text-white">{draft.subject}</p>
                  <Textarea className="mt-3 min-h-40" value={draft.message} readOnly />
                </div>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
