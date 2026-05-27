import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { NextResponse } from 'next/server'

import { requireCron } from '@/lib/api/auth-check'
import { db } from '@/lib/db'
import { invoices, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'

const creatorProfile = alias(profiles, 'invoice_monitor_creator')
const brandProfile = alias(profiles, 'invoice_monitor_brand')

export async function POST(request: Request) {
  const cronError = requireCron(request)
  if (cronError) return cronError

  const rows = await db
    .select({
      invoice: invoices,
      creatorEmail: creatorProfile.email,
      brandEmail: brandProfile.email,
    })
    .from(invoices)
    .leftJoin(creatorProfile, eq(creatorProfile.id, invoices.creatorId))
    .leftJoin(brandProfile, eq(brandProfile.id, invoices.msmeId))
    .where(eq(invoices.status, 'sent'))

  let remindersSent = 0
  let markedOverdue = 0
  const now = Date.now()

  for (const row of rows) {
    if (!row.invoice.dueDate) continue
    const dueAt = new Date(row.invoice.dueDate).getTime()
    const daysOverdue = Math.floor((now - dueAt) / (24 * 60 * 60 * 1000))
    if (daysOverdue < 1) continue

    for (const email of [row.creatorEmail, row.brandEmail]) {
      if (!email) continue
      await sendEmail({
        to: email,
        template: 'invoice_sent_brand',
        data: {
          invoiceNumber: row.invoice.invoiceNumber,
          overdueDays: daysOverdue,
          amount: `Rs ${Number(row.invoice.amount).toLocaleString('en-IN')}`,
        },
      })
      remindersSent += 1
    }

    if (daysOverdue >= 7) {
      await db.update(invoices).set({ status: 'overdue' }).where(eq(invoices.id, row.invoice.id))
      markedOverdue += 1
    }
  }

  return NextResponse.json({ remindersSent, markedOverdue })
}
