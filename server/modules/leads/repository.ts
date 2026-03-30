import type { Pool } from 'pg'
import type { CreateLeadInput, Lead } from './schemas.js'

export function buildLeadsRepository(db: Pool) {
  async function create(input: CreateLeadInput): Promise<Lead> {
    const { rows } = await db.query<{
      id: number
      name: string
      email: string
      plan: string
      source: string
      created_at: Date
    }>(
      `INSERT INTO leads (name, email, plan)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, plan = EXCLUDED.plan
       RETURNING id, name, email, plan, source, created_at`,
      [input.name, input.email, input.plan]
    )
    const row = rows[0]
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      plan: row.plan,
      source: row.source,
      createdAt: row.created_at,
    }
  }

  async function count(): Promise<number> {
    const { rows } = await db.query<{ count: string }>('SELECT COUNT(*) FROM leads')
    return parseInt(rows[0].count, 10)
  }

  return { create, count }
}
