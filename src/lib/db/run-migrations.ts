import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import postgres from 'postgres'

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before running database migrations.')
  }

  const sql = postgres(databaseUrl, { max: 1 })
  const migrationPath = join(process.cwd(), 'src/lib/db/migrations/001_triggers.sql')
  const migrationSql = await readFile(migrationPath, 'utf8')

  try {
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migrationSql)
    })
    console.log('Database trigger migration completed.')
  } finally {
    await sql.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure'
  console.error(message)
  process.exit(1)
})
