import 'dotenv/config'

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import postgres from 'postgres'

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before running database migrations.')
  }

  const sql = postgres(databaseUrl, { max: 1 })
  const migrationsDir = join(process.cwd(), 'src/lib/db/migrations')

  try {
    const files = await readdir(migrationsDir)
    // Run all .sql files in lexicographic order (001_, 0001_, 0002_, etc.)
    const sqlFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of sqlFiles) {
      const migrationSql = await readFile(join(migrationsDir, file), 'utf8')
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migrationSql)
      })
      console.log(`Migration applied: ${file}`)
    }

    console.log(`Database migrations completed (${sqlFiles.length} files).`)
  } finally {
    await sql.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure'
  console.error(message)
  process.exit(1)
})
