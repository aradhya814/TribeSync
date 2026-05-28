import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const client = postgres(databaseUrl, { max: 10 })

export const db = drizzle(client, { schema })
export type DB = typeof db
