import type { Pool } from 'pg'
import type { Channel } from '../../services/content-generation.js'

// ── Row 타입 ─────────────────────────────────────────────────────────────────

export interface ContentPostRow {
  id: string
  seller_id: string
  processed_product_id: string | null
  master_title: string
  master_body: string
  master_images: string[]
  keywords: string[]
  post_status: string
  scheduled_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ContentChannelPostRow {
  id: string
  content_post_id: string
  channel: string
  channel_title: string | null
  channel_body: string
  hashtags: string[]
  publish_status: string
  channel_post_id: string | null
  channel_url: string | null
  published_at: string | null
  error_detail: string | null
  created_at: string
  updated_at: string
}

// ── content_posts ─────────────────────────────────────────────────────────────

export async function createContentPost(
  db: Pool,
  data: {
    sellerId: string
    processedProductId?: string
    masterTitle: string
    masterBody: string
    masterImages: string[]
    keywords: string[]
    scheduledAt?: string
  }
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO content_posts
      (seller_id, processed_product_id, master_title, master_body,
       master_images, keywords, scheduled_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
     RETURNING id`,
    [
      data.sellerId,
      data.processedProductId ?? null,
      data.masterTitle,
      data.masterBody,
      JSON.stringify(data.masterImages),
      JSON.stringify(data.keywords),
      data.scheduledAt ?? null,
    ]
  )
  return rows[0].id
}

export async function updatePostStatus(
  db: Pool,
  id: string,
  status: string
): Promise<void> {
  await db.query(
    `UPDATE content_posts SET post_status = $1, updated_at = NOW() WHERE id = $2`,
    [status, id]
  )
}

export async function getContentPostById(
  db: Pool,
  id: string
): Promise<ContentPostRow | null> {
  const { rows } = await db.query<ContentPostRow>(
    `SELECT * FROM content_posts WHERE id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function listContentPosts(
  db: Pool,
  opts: { sellerId?: string; postStatus?: string; page: number; pageSize: number }
): Promise<{ rows: ContentPostRow[]; total: number }> {
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = 1

  if (opts.sellerId) {
    conditions.push(`seller_id = $${idx++}`)
    params.push(opts.sellerId)
  }
  if (opts.postStatus) {
    conditions.push(`post_status = $${idx++}`)
    params.push(opts.postStatus)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (opts.page - 1) * opts.pageSize

  const [{ rows }, { rows: countRows }] = await Promise.all([
    db.query<ContentPostRow>(
      `SELECT * FROM content_posts ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, opts.pageSize, offset]
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(*) FROM content_posts ${where}`,
      params
    ),
  ])

  return { rows, total: parseInt(countRows[0].count, 10) }
}

// ── content_channel_posts ─────────────────────────────────────────────────────

export async function upsertChannelPost(
  db: Pool,
  data: {
    contentPostId: string
    channel: Channel
    channelTitle?: string
    channelBody: string
    hashtags: string[]
  }
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO content_channel_posts
      (content_post_id, channel, channel_title, channel_body, hashtags)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (content_post_id, channel)
     DO UPDATE SET
       channel_title = EXCLUDED.channel_title,
       channel_body  = EXCLUDED.channel_body,
       hashtags      = EXCLUDED.hashtags,
       publish_status = 'pending',
       updated_at    = NOW()
     RETURNING id`,
    [
      data.contentPostId,
      data.channel,
      data.channelTitle ?? null,
      data.channelBody,
      JSON.stringify(data.hashtags),
    ]
  )
  return rows[0].id
}

export async function updateChannelPostPublished(
  db: Pool,
  id: string,
  data: { channelPostId: string; channelUrl: string; publishedAt: string }
): Promise<void> {
  await db.query(
    `UPDATE content_channel_posts
     SET publish_status = 'published',
         channel_post_id = $1,
         channel_url = $2,
         published_at = $3,
         error_detail = NULL,
         updated_at = NOW()
     WHERE id = $4`,
    [data.channelPostId, data.channelUrl, data.publishedAt, id]
  )
}

export async function updateChannelPostFailed(
  db: Pool,
  id: string,
  errorDetail: string
): Promise<void> {
  await db.query(
    `UPDATE content_channel_posts
     SET publish_status = 'failed',
         error_detail = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [errorDetail, id]
  )
}

export async function listChannelPosts(
  db: Pool,
  contentPostId: string
): Promise<ContentChannelPostRow[]> {
  const { rows } = await db.query<ContentChannelPostRow>(
    `SELECT * FROM content_channel_posts WHERE content_post_id = $1 ORDER BY channel`,
    [contentPostId]
  )
  return rows
}
