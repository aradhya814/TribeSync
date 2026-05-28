import { Resend } from 'resend'

type EmailTemplate =
  | 'deal_initiated'
  | 'escrow_funded'
  | 'milestone_approved'
  | 'milestone_rejected'
  | 'deal_completed'
  | 'payout_released'
  | 'invoice_sent_creator'
  | 'invoice_sent_brand'
  | 'outreach_received'
  | 'milestone_due_soon'
  | 'welcome'

type SendEmailInput = {
  to: string
  template: EmailTemplate
  data?: Record<string, unknown>
}

const subjects: Record<EmailTemplate, string> = {
  deal_initiated: 'A new TribeSync deal has been initiated',
  escrow_funded: 'Escrow funded for your TribeSync deal',
  milestone_approved: 'Milestone approved',
  milestone_rejected: 'Milestone needs changes',
  deal_completed: 'Deal completed',
  payout_released: 'Payout released',
  invoice_sent_creator: 'Your TribeSync invoice is ready',
  invoice_sent_brand: 'Invoice for your TribeSync campaign',
  outreach_received: 'New collaboration outreach',
  milestone_due_soon: 'Milestone due soon',
  welcome: 'Welcome to TribeSync',
}

function renderData(data: Record<string, unknown> = {}) {
  const rows = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const renderedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return `<p><strong>${key}</strong>: ${renderedValue}</p>`
    })

  return rows.join('') || '<p>You have a new TribeSync update.</p>'
}

export async function sendEmail({ to, template, data }: SendEmailInput) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.FROM_EMAIL ?? 'noreply@tribesync.in',
      to,
      subject: subjects[template],
      html: renderData(data),
    })

    return { success: true }
  } catch (error) {
    console.error('Email send failed', error)
    return { success: false }
  }
}
