import type { Pool } from 'pg'
import type { FastifyBaseLogger } from 'fastify'
import {
  generateChannelContent,
  mockGenerateChannelContent,
  ALL_CHANNELS,
  type Channel,
} from '../../services/content-generation.js'
import { createSnsAdapter } from '../../adapters/sns-adapter.js'
import * as repo from './repository.js'
import type { CreateContentPostInput, PublishChannelInput, ListContentQuery } from './schemas.js'
import { config } from '../../config.js'

// ── 콘텐츠 생성 ───────────────────────────────────────────────────────────────

export async function createContentPost(
  db: Pool,
  input: CreateContentPostInput,
  log: FastifyBaseLogger
): Promise<string> {
  const postId = await repo.createContentPost(db, {
    sellerId: input.sellerId,
    processedProductId: input.processedProductId,
    masterTitle: input.masterTitle,
    masterBody: input.masterBody,
    masterImages: input.masterImages,
    keywords: input.keywords,
    scheduledAt: input.scheduledAt,
  })

  // 비동기 AI 채널 콘텐츠 생성
  generateInBackground(db, postId, input, log).catch((err) => {
    log.error({ err, postId }, '채널 콘텐츠 생성 백그라운드 처리 실패')
  })

  return postId
}

async function generateInBackground(
  db: Pool,
  postId: string,
  input: CreateContentPostInput,
  log: FastifyBaseLogger
): Promise<void> {
  await repo.updatePostStatus(db, postId, 'generating')

  try {
    const result = config.ANTHROPIC_API_KEY
      ? await generateChannelContent(
          {
            masterTitle: input.masterTitle,
            masterBody: input.masterBody,
            keywords: input.keywords,
          },
          config.ANTHROPIC_API_KEY
        )
      : mockGenerateChannelContent({
          masterTitle: input.masterTitle,
          masterBody: input.masterBody,
          keywords: input.keywords,
        })

    // 각 채널 콘텐츠 DB 저장
    for (const channel of ALL_CHANNELS) {
      const ch = result.channels[channel]
      await repo.upsertChannelPost(db, {
        contentPostId: postId,
        channel,
        channelTitle: ch.title,
        channelBody: ch.body,
        hashtags: ch.hashtags,
      })
    }

    await repo.updatePostStatus(db, postId, 'ready')
    log.info({ postId, model: result.model }, '채널 콘텐츠 생성 완료')
  } catch (err) {
    await repo.updatePostStatus(db, postId, 'failed')
    log.error({ err, postId }, '채널 콘텐츠 생성 실패')
  }
}

// ── 채널 발행 ─────────────────────────────────────────────────────────────────

export async function publishChannels(
  db: Pool,
  postId: string,
  input: PublishChannelInput,
  log: FastifyBaseLogger
): Promise<{ published: number; failed: number }> {
  const post = await repo.getContentPostById(db, postId)
  if (!post) throw new Error('콘텐츠 포스트를 찾을 수 없습니다')
  if (post.post_status !== 'ready') {
    throw new Error(`발행 불가 상태: ${post.post_status} (ready 상태여야 합니다)`)
  }

  const channelPosts = await repo.listChannelPosts(db, postId)
  await repo.updatePostStatus(db, postId, 'publishing')

  let published = 0
  let failed = 0

  for (const channel of input.channels as Channel[]) {
    const channelPost = channelPosts.find((cp) => cp.channel === channel)
    if (!channelPost) {
      log.warn({ postId, channel }, '채널 콘텐츠 없음, 발행 건너뜀')
      continue
    }

    try {
      const adapter = createSnsAdapter(channel)
      const result = await adapter.publish({
        channel: channel as 'instagram' | 'facebook' | 'threads' | 'x',
        body: channelPost.channel_body,
        hashtags: Array.isArray(channelPost.hashtags) ? channelPost.hashtags : [],
        title: channelPost.channel_title ?? undefined,
      })

      await repo.updateChannelPostPublished(db, channelPost.id, {
        channelPostId: result.channelPostId,
        channelUrl: result.channelUrl,
        publishedAt: result.publishedAt,
      })
      published++
      log.info({ postId, channel }, '채널 발행 성공')
    } catch (err) {
      await repo.updateChannelPostFailed(db, channelPost.id, String(err))
      failed++
      log.error({ err, postId, channel }, '채널 발행 실패')
    }
  }

  // 모든 요청 채널이 완료되면 published 상태로
  const allChannelPosts = await repo.listChannelPosts(db, postId)
  const anyPublished = allChannelPosts.some((cp) => cp.publish_status === 'published')
  await repo.updatePostStatus(db, postId, anyPublished ? 'published' : 'failed')

  return { published, failed }
}

// ── 조회 ──────────────────────────────────────────────────────────────────────

export async function listPosts(db: Pool, query: ListContentQuery) {
  return repo.listContentPosts(db, query)
}

export async function getPostDetail(db: Pool, id: string) {
  const post = await repo.getContentPostById(db, id)
  if (!post) return null
  const channelPosts = await repo.listChannelPosts(db, id)
  return { ...post, channelPosts }
}
