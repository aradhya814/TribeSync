import PusherServer from 'pusher'
import PusherClient from 'pusher-js'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

export const pusherServer = new PusherServer({
  appId: requiredEnv('PUSHER_APP_ID'),
  key: requiredEnv('PUSHER_KEY'),
  secret: requiredEnv('PUSHER_SECRET'),
  cluster: process.env.PUSHER_CLUSTER ?? 'ap2',
  useTLS: true,
})

export const pusherClient =
  typeof window === 'undefined'
    ? null
    : new PusherClient(requiredEnv('NEXT_PUBLIC_PUSHER_KEY'), {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2',
      })
