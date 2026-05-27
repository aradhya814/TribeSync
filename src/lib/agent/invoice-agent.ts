import { eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '@/lib/db'
import { invoices, profiles } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email'
import { pusherServer } from '@/lib/pusher'
import { uploadToR2 } from '@/lib/r2'

const creatorProfile = alias(profiles, 'creator_profile')
const brandProfile = alias(profiles, 'brand_profile')

function formatInr(amount: string | null) {
  return `Rs ${Number(amount ?? 0).toLocaleString('en-IN')}`
}

function invoiceHtml(record: {
  invoiceNumber: string
  issuedAt: Date | null
  creatorName: string | null
  creatorEmail: string | null
  brandName: string | null
  brandEmail: string | null
  amount: string
  platformFee: string
  creatorPayout: string
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Inter, Arial, sans-serif; color: #111827; padding: 40px; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
      h1 { margin: 0; font-size: 28px; }
      .muted { color: #6b7280; font-size: 13px; }
      .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
      th { background: #f9fafb; }
      .total { font-size: 20px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div class="top">
      <div>
        <h1>TribeSync Invoice</h1>
        <div class="muted">${record.invoiceNumber}</div>
      </div>
      <div class="muted">${record.issuedAt?.toLocaleDateString('en-IN') ?? new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <div class="box">
      <strong>Creator</strong>
      <p>${record.creatorName ?? 'Creator'}<br />${record.creatorEmail ?? ''}</p>
      <strong>Brand</strong>
      <p>${record.brandName ?? 'Brand'}<br />${record.brandEmail ?? ''}</p>
    </div>
    <table>
      <tr><th>Description</th><th>Amount</th></tr>
      <tr><td>Collaboration amount</td><td>${formatInr(record.amount)}</td></tr>
      <tr><td>TribeSync platform fee</td><td>${formatInr(record.platformFee)}</td></tr>
      <tr><td>Creator payout</td><td>${formatInr(record.creatorPayout)}</td></tr>
      <tr><td class="total">Total</td><td class="total">${formatInr(record.amount)}</td></tr>
    </table>
  </body>
</html>`
}

async function generateAndUploadPdf(invoiceId: string, html: string) {
  const key = `invoices/${invoiceId}.pdf`

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return `pending-r2://${key}`
  }

  try {
    const runtimeRequire = eval('require') as (moduleName: string) => typeof import('html-pdf-node')
    const htmlPdf = runtimeRequire('html-pdf-node')
    const buffer = await htmlPdf.generatePdf(
      { content: html },
      {
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '16mm' },
      },
    )
    return uploadToR2(key, buffer, 'application/pdf')
  } catch (error) {
    console.error('Invoice PDF generation failed', error)
    return `pending-pdf://${key}`
  }
}

export async function onInvoiceCreated(invoiceId: string) {
  const [record] = await db
    .select({
      invoice: invoices,
      creatorName: creatorProfile.fullName,
      creatorEmail: creatorProfile.email,
      brandName: brandProfile.fullName,
      brandEmail: brandProfile.email,
    })
    .from(invoices)
    .leftJoin(creatorProfile, eq(creatorProfile.id, invoices.creatorId))
    .leftJoin(brandProfile, eq(brandProfile.id, invoices.msmeId))
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!record) {
    throw new Error('Invoice not found')
  }

  const pdfUrl = await generateAndUploadPdf(
    record.invoice.id,
    invoiceHtml({
      invoiceNumber: record.invoice.invoiceNumber,
      issuedAt: record.invoice.issuedAt,
      creatorName: record.creatorName,
      creatorEmail: record.creatorEmail,
      brandName: record.brandName,
      brandEmail: record.brandEmail,
      amount: record.invoice.amount,
      platformFee: record.invoice.platformFee,
      creatorPayout: record.invoice.creatorPayout,
    }),
  )

  const [updatedInvoice] = await db
    .update(invoices)
    .set({ pdfUrl, status: 'sent' })
    .where(eq(invoices.id, invoiceId))
    .returning()

  if (record.creatorEmail) {
    await sendEmail({
      to: record.creatorEmail,
      template: 'invoice_sent_creator',
      data: {
        invoiceNumber: record.invoice.invoiceNumber,
        creatorPayout: formatInr(record.invoice.creatorPayout),
        pdfUrl,
      },
    })
  }

  if (record.brandEmail) {
    await sendEmail({
      to: record.brandEmail,
      template: 'invoice_sent_brand',
      data: {
        invoiceNumber: record.invoice.invoiceNumber,
        amount: formatInr(record.invoice.amount),
        pdfUrl,
      },
    })
  }

  if (record.invoice.creatorId) {
    await pusherServer.trigger(`private-user-${record.invoice.creatorId}`, 'deal-updated', {
      invoice: updatedInvoice,
    })
  }

  if (record.invoice.msmeId) {
    await pusherServer.trigger(`private-user-${record.invoice.msmeId}`, 'deal-updated', {
      invoice: updatedInvoice,
    })
  }

  return updatedInvoice
}
