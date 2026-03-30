import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { config } from '../config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, 'migrations')

async function migrate() {
  const pool = new Pool({ connectionString: config.DATABASE_URL })

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const { rows: applied } = await pool.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    )
    const appliedSet = new Set(applied.map((r) => r.filename))

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    let count = 0
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  [skip] ${file}`)
        continue
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
      await pool.query('BEGIN')
      try {
        await pool.query(sql)
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        )
        await pool.query('COMMIT')
        console.log(`  [done] ${file}`)
        count++
      } catch (err) {
        await pool.query('ROLLBACK')
        throw err
      }
    }

    if (count === 0) {
      console.log('마이그레이션: 적용할 내용 없음')
    } else {
      console.log(`마이그레이션 완료: ${count}개 적용`)
    }
  } finally {
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('마이그레이션 실패:', err)
  process.exit(1)
})
