import cron from 'node-cron'

const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const cronSecret = process.env.CRON_SECRET

async function callCronRoute(route: string) {
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured')
    return
  }

  const url = route.startsWith('http') ? route : `${baseUrl}${route}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      console.error(`Cron route failed ${route}: ${response.status} ${body}`)
      return
    }

    console.log(`Cron route completed ${route}`)
  } catch (error) {
    console.error(`Cron route crashed ${route}`, error)
  }
}

const timezone = 'Asia/Kolkata'

cron.schedule('0 * * * *', () => void callCronRoute('/api/cron/followup-agent'), { timezone })
cron.schedule('0 8 * * *', () => void callCronRoute('/api/cron/signal-outreach'), { timezone })
cron.schedule('0 9 * * *', () => void callCronRoute('/api/cron/milestone-monitor'), { timezone })
cron.schedule('0 3 * * *', () => void callCronRoute('/api/cron/refresh-market-rates'), { timezone })
cron.schedule('0 6 * * 1', () => void callCronRoute('/api/cron/generate-playbooks'), { timezone })
cron.schedule('0 0 * * 0', () => void callCronRoute('/api/cron/calculate-rankings'), { timezone })
cron.schedule('0 2 1 * *', () => void callCronRoute('/api/cron/generate-chronicles'), { timezone })
cron.schedule('5 2 1 * *', () => void callCronRoute('/api/cron/generate-chronicles?offset=50'), { timezone })

console.log(`TribeSync worker started with base URL ${baseUrl}`)
