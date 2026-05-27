import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuth } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { crmContacts } from '@/lib/db/schema'

const crmStageSchema = z.enum(['lead', 'qualified', 'outreach', 'negotiation', 'partner'])

const createContactSchema = z.object({
  creatorId: z.string().uuid().optional(),
  name: z.string().min(2),
  email: z.string().email().optional(),
  platform: z.string().optional(),
  handle: z.string().optional(),
  stage: crmStageSchema.optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  nextStep: z.string().optional(),
  followUpDueAt: z.string().datetime().optional(),
})

const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().uuid(),
  lastContactedAt: z.string().datetime().optional(),
})

export async function GET() {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const contacts = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.ownerId, authResult.session.user.id))
    .orderBy(desc(crmContacts.updatedAt))

  return NextResponse.json({ contacts })
}

export async function POST(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const parsed = createContactSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid CRM contact payload' }, { status: 400 })

  const [contact] = await db
    .insert(crmContacts)
    .values({
      ownerId: authResult.session.user.id,
      creatorId: parsed.data.creatorId,
      name: parsed.data.name,
      email: parsed.data.email,
      platform: parsed.data.platform,
      handle: parsed.data.handle,
      stage: parsed.data.stage ?? 'lead',
      notes: parsed.data.notes,
      tags: parsed.data.tags,
      nextStep: parsed.data.nextStep,
      followUpDueAt: parsed.data.followUpDueAt ? new Date(parsed.data.followUpDueAt) : undefined,
    })
    .returning()

  return NextResponse.json({ contact }, { status: 201 })
}

export async function PATCH(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const parsed = updateContactSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid CRM contact payload' }, { status: 400 })

  const [contact] = await db
    .update(crmContacts)
    .set({
      creatorId: parsed.data.creatorId,
      name: parsed.data.name,
      email: parsed.data.email,
      platform: parsed.data.platform,
      handle: parsed.data.handle,
      stage: parsed.data.stage,
      notes: parsed.data.notes,
      tags: parsed.data.tags,
      nextStep: parsed.data.nextStep,
      followUpDueAt: parsed.data.followUpDueAt ? new Date(parsed.data.followUpDueAt) : undefined,
      lastContactedAt: parsed.data.lastContactedAt ? new Date(parsed.data.lastContactedAt) : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(crmContacts.id, parsed.data.id), eq(crmContacts.ownerId, authResult.session.user.id)))
    .returning()

  if (!contact) return NextResponse.json({ error: 'CRM contact not found' }, { status: 404 })

  return NextResponse.json({ contact })
}

export async function DELETE(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Contact id is required' }, { status: 400 })

  const [contact] = await db
    .delete(crmContacts)
    .where(and(eq(crmContacts.id, id), eq(crmContacts.ownerId, authResult.session.user.id)))
    .returning()

  if (!contact) return NextResponse.json({ error: 'CRM contact not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
