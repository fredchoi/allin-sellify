import type { Pool } from 'pg'
import type { SaveKeywordRequest, ListQuery } from './schemas.js'
import { AppError } from '../../plugins/error-handler.js'

export interface Keyword {
  id: string
  seller_id: string
  keyword: string
  search_volume: number | null
  competition: number | null
  cgi: number | null
  trend_score: number | null
  opp_score: number | null
  category: string | null
  status: 'active' | 'archived' | 'monitoring'
  last_analyzed_at: Date | null
  created_at: Date
  updated_at: Date
}

export async function saveKeyword(db: Pool, data: SaveKeywordRequest): Promise<Keyword> {
  const { rows } = await db.query<Keyword>(
    `INSERT INTO keywords
      (seller_id, keyword, search_volume, competition, cgi, trend_score, opp_score, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (seller_id, keyword)
     DO UPDATE SET
       search_volume = EXCLUDED.search_volume,
       competition = EXCLUDED.competition,
       cgi = EXCLUDED.cgi,
       trend_score = EXCLUDED.trend_score,
       opp_score = EXCLUDED.opp_score,
       category = EXCLUDED.category,
       last_analyzed_at = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [
      data.sellerId,
      data.keyword,
      data.searchVolume,
      data.competition,
      data.cgi,
      data.trendScore,
      data.oppScore,
      data.category ?? null,
    ]
  )
  return rows[0]
}

export async function listKeywords(
  db: Pool,
  query: ListQuery
): Promise<{ keywords: Keyword[]; total: number }> {
  const conditions = ['seller_id = $1']
  const params: unknown[] = [query.sellerId]

  if (query.status) {
    conditions.push(`status = $${params.length + 1}`)
    params.push(query.status)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const orderBy = `ORDER BY ${query.sort} DESC NULLS LAST`
  const offset = (query.page - 1) * query.limit

  const [{ rows }, { rows: countRows }] = await Promise.all([
    db.query<Keyword>(
      `SELECT * FROM keywords ${where} ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.limit, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM keywords ${where}`,
      params
    ),
  ])

  return { keywords: rows, total: parseInt(countRows[0].count, 10) }
}

export async function getKeywordById(db: Pool, id: string): Promise<Keyword> {
  const { rows } = await db.query<Keyword>(
    'SELECT * FROM keywords WHERE id = $1',
    [id]
  )
  if (!rows[0]) {
    throw new AppError(404, '키워드를 찾을 수 없습니다', 'KEYWORD_NOT_FOUND')
  }
  return rows[0]
}

export async function archiveKeyword(db: Pool, id: string): Promise<void> {
  const { rowCount } = await db.query(
    "UPDATE keywords SET status = 'archived', updated_at = NOW() WHERE id = $1",
    [id]
  )
  if (!rowCount) {
    throw new AppError(404, '키워드를 찾을 수 없습니다', 'KEYWORD_NOT_FOUND')
  }
}

export async function getKeywordDailyStats(
  db: Pool,
  keywordId: string
): Promise<Array<{ date: string; opp_score: number | null; search_volume: number | null }>> {
  const { rows } = await db.query(
    `SELECT date, opp_score, search_volume
     FROM keyword_daily_stats
     WHERE keyword_id = $1
     ORDER BY date DESC
     LIMIT 90`,
    [keywordId]
  )
  return rows
}
