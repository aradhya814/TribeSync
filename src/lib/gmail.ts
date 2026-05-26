import { google } from 'googleapis'

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

function encodeMessage(to: string, subject: string, body: string) {
  const from = process.env.FROM_EMAIL ?? 'noreply@tribesync.in'
  const message = [
    `From: TribeSync <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n')

  return Buffer.from(message).toString('base64url')
}

export async function sendGmail(to: string, subject: string, body: string) {
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodeMessage(to, subject, body),
    },
  })
}
