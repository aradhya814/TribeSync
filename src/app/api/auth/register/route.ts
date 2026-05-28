import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { parseJsonBody } from '@/lib/api/json'
import { db } from '@/lib/db'
import { notificationPrefs, profiles, userRoles } from '@/lib/db/schema'

// In-memory rate limit: max 5 registrations per IP per hour
const registerAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = registerAttempts.get(ip)
  if (!entry || entry.resetAt < now) {
    registerAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(['creator', 'msme']),
})

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again in an hour.' }, { status: 429 })
  }

  const body = await parseJsonBody(request)
  if (body.error) return NextResponse.json({ error: body.error }, { status: 400 })

  const parsed = registerSchema.safeParse(body.data)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration payload' }, { status: 400 })
  }

  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, parsed.data.email))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const userId = await db.transaction(async (transaction) => {
    const [profile] = await transaction
      .insert(profiles)
      .values({
        email: parsed.data.email,
        passwordHash,
        fullName: parsed.data.fullName,
      })
      .returning({ id: profiles.id })

    await transaction.insert(userRoles).values({
      userId: profile.id,
      role: parsed.data.role,
    })

    await transaction.insert(notificationPrefs).values({
      userId: profile.id,
    })

    return profile.id
  })

  return NextResponse.json({ success: true, userId })
}
