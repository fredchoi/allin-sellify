import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── 모듈 모킹 ──────────────────────────────────────────────────────────────

vi.mock('../repository.js', () => ({
  createContentPost: vi.fn().mockResolvedValue('post-uuid-001'),
  updatePostStatus: vi.fn().mockResolvedValue(undefined),
  getContentPostById: vi.fn(),
  listContentPosts: vi.fn(),
  upsertChannelPost: vi.fn().mockResolvedValue('cp-uuid-001'),
  listChannelPosts: vi.fn(),
  updateChannelPostPublished: vi.fn().mockResolvedValue(undefined),
  updateChannelPostFailed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../services/content-generation.js', () => ({
  generateChannelContent: vi.fn(),
  mockGenerateChannelContent: vi.fn().mockReturnValue({
    model: 'mock',
    channels: {
      blog: { title: '블로그 제목', body: '블로그 본문 1000자...', hashtags: [] },
      instagram: { title: '', body: '감성 캡션 200자', hashtags: ['#무선이어폰', '#가성비'] },
      facebook: { title: '', body: '정보 중심 300자', hashtags: ['#이어폰'] },
      threads: { title: '', body: '임팩트 150자', hashtags: ['#추천'] },
      x: { title: '', body: '핵심 220자', hashtags: ['#이어폰추천'] },
    },
  }),
  ALL_CHANNELS: ['blog', 'instagram', 'facebook', 'threads', 'x'],
}))

vi.mock('../../../adapters/sns-adapter.js', () => ({
  createSnsAdapter: vi.fn(),
}))

vi.mock('../../../config.js', () => ({
  config: {
    ANTHROPIC_API_KEY: '',
  },
}))

import * as repo from '../repository.js'
import { createSnsAdapter } from '../../../adapters/sns-adapter.js'
import {
  createContentPost,
  publishChannels,
  listPosts,
  getPostDetail,
} from '../service.js'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn().mockReturnThis(),
  level: 'info',
  silent: vi.fn(),
} as any

// ─────────────────────────────────────────────
// createContentPost 테스트
// ─────────────────────────────────────────────

describe('createContentPost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('콘텐츠 포스트를 생성하고 ID를 반환한다', async () => {
    const postId = await createContentPost(
      {} as any,
      {
        sellerId: 'seller-001',
        masterTitle: '무선 이어폰 추천 TOP 5',
        masterBody: '가성비 좋은 무선 이어폰을 소개합니다.',
        masterImages: ['https://example.com/img1.jpg'],
        keywords: ['무선이어폰', '가성비이어폰'],
      },
      mockLog
    )

    expect(postId).toBe('post-uuid-001')
    expect(repo.createContentPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sellerId: 'seller-001',
        masterTitle: '무선 이어폰 추천 TOP 5',
      })
    )
  })

  it('비동기 AI 생성을 백그라운드에서 트리거한다', async () => {
    await createContentPost(
      {} as any,
      {
        sellerId: 'seller-001',
        masterTitle: '테스트 제목',
        masterBody: '테스트 본문',
        masterImages: [],
        keywords: ['테스트'],
      },
      mockLog
    )

    // 비동기 처리이므로 즉시 반환됨
    expect(repo.createContentPost).toHaveBeenCalledTimes(1)
  })

  it('scheduledAt이 있으면 repository에 전달한다', async () => {
    await createContentPost(
      {} as any,
      {
        sellerId: 'seller-001',
        masterTitle: '예약 발행 콘텐츠',
        masterBody: '본문',
        masterImages: [],
        keywords: [],
        scheduledAt: '2026-04-01T10:00:00Z',
      },
      mockLog
    )

    expect(repo.createContentPost).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scheduledAt: '2026-04-01T10:00:00Z',
      })
    )
  })
})

// ─────────────────────────────────────────────
// publishChannels 테스트
// ─────────────────────────────────────────────

describe('publishChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ready 상태의 포스트에서 SNS 어댑터를 통해 채널 발행한다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue({
      id: 'post-uuid-001',
      seller_id: 'seller-001',
      processed_product_id: null,
      master_title: '테스트 제목',
      master_body: '테스트 본문',
      master_images: [],
      keywords: [],
      post_status: 'ready',
      scheduled_at: null,
      metadata: {},
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    })
    vi.mocked(repo.listChannelPosts).mockResolvedValue([
      {
        id: 'cp-ig-001',
        content_post_id: 'post-uuid-001',
        channel: 'instagram',
        channel_title: null,
        channel_body: '인스타 캡션',
        hashtags: ['#이어폰'],
        publish_status: 'pending',
        channel_post_id: null,
        channel_url: null,
        published_at: null,
        error_detail: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ])

    const mockSnsAdapter = {
      publish: vi.fn().mockResolvedValue({
        channelPostId: 'ig-post-001',
        channelUrl: 'https://www.instagram.com/p/ig-post-001',
        publishedAt: '2026-03-15T10:00:00Z',
      }),
    }
    vi.mocked(createSnsAdapter).mockReturnValue(mockSnsAdapter)

    const result = await publishChannels(
      {} as any,
      'post-uuid-001',
      { channels: ['instagram'] },
      mockLog
    )

    expect(result.published).toBe(1)
    expect(result.failed).toBe(0)
    expect(createSnsAdapter).toHaveBeenCalledWith('instagram')
    expect(repo.updateChannelPostPublished).toHaveBeenCalledWith(
      expect.anything(),
      'cp-ig-001',
      expect.objectContaining({
        channelPostId: 'ig-post-001',
        channelUrl: 'https://www.instagram.com/p/ig-post-001',
      })
    )
  })

  it('ready 상태가 아닌 포스트는 발행 불가 에러를 던진다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue({
      id: 'post-uuid-002',
      seller_id: 'seller-001',
      processed_product_id: null,
      master_title: '제목',
      master_body: '본문',
      master_images: [],
      keywords: [],
      post_status: 'generating',
      scheduled_at: null,
      metadata: {},
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    })

    await expect(
      publishChannels({} as any, 'post-uuid-002', { channels: ['instagram'] }, mockLog)
    ).rejects.toThrow('발행 불가 상태: generating')
  })

  it('포스트가 존재하지 않으면 에러를 던진다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue(null)

    await expect(
      publishChannels({} as any, 'non-existent', { channels: ['instagram'] }, mockLog)
    ).rejects.toThrow('콘텐츠 포스트를 찾을 수 없습니다')
  })

  it('SNS 어댑터 실패 시 failed 카운트가 증가하고 에러 상세를 기록한다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue({
      id: 'post-uuid-003',
      seller_id: 'seller-001',
      processed_product_id: null,
      master_title: '제목',
      master_body: '본문',
      master_images: [],
      keywords: [],
      post_status: 'ready',
      scheduled_at: null,
      metadata: {},
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    })
    vi.mocked(repo.listChannelPosts).mockResolvedValue([
      {
        id: 'cp-x-001',
        content_post_id: 'post-uuid-003',
        channel: 'x',
        channel_title: null,
        channel_body: 'X 포스트',
        hashtags: [],
        publish_status: 'pending',
        channel_post_id: null,
        channel_url: null,
        published_at: null,
        error_detail: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ])

    const mockSnsAdapter = {
      publish: vi.fn().mockRejectedValue(new Error('X API rate limit')),
    }
    vi.mocked(createSnsAdapter).mockReturnValue(mockSnsAdapter)

    const result = await publishChannels(
      {} as any,
      'post-uuid-003',
      { channels: ['x'] },
      mockLog
    )

    expect(result.failed).toBe(1)
    expect(result.published).toBe(0)
    expect(repo.updateChannelPostFailed).toHaveBeenCalledWith(
      expect.anything(),
      'cp-x-001',
      expect.stringContaining('X API rate limit')
    )
  })

  it('요청 채널에 대한 콘텐츠가 없으면 건너뛴다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue({
      id: 'post-uuid-004',
      seller_id: 'seller-001',
      processed_product_id: null,
      master_title: '제목',
      master_body: '본문',
      master_images: [],
      keywords: [],
      post_status: 'ready',
      scheduled_at: null,
      metadata: {},
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    })
    vi.mocked(repo.listChannelPosts).mockResolvedValue([]) // 채널 콘텐츠 없음

    const result = await publishChannels(
      {} as any,
      'post-uuid-004',
      { channels: ['instagram', 'facebook'] },
      mockLog
    )

    expect(result.published).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockLog.warn).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────
// 조회 함수 테스트
// ─────────────────────────────────────────────

describe('listPosts', () => {
  it('repository에 쿼리를 전달하여 콘텐츠 목록을 반환한다', async () => {
    vi.mocked(repo.listContentPosts).mockResolvedValue({ rows: [], total: 0 })

    const result = await listPosts({} as any, {
      sellerId: 'seller-001',
      page: 1,
      pageSize: 10,
    })

    expect(repo.listContentPosts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sellerId: 'seller-001' })
    )
    expect(result).toEqual({ rows: [], total: 0 })
  })
})

describe('getPostDetail', () => {
  it('콘텐츠 포스트와 채널 포스트 목록을 함께 반환한다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue({
      id: 'post-uuid-001',
      seller_id: 'seller-001',
      processed_product_id: null,
      master_title: '제목',
      master_body: '본문',
      master_images: [],
      keywords: [],
      post_status: 'ready',
      scheduled_at: null,
      metadata: {},
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    })
    vi.mocked(repo.listChannelPosts).mockResolvedValue([
      {
        id: 'cp-001',
        content_post_id: 'post-uuid-001',
        channel: 'blog',
        channel_title: '블로그 제목',
        channel_body: '블로그 본문',
        hashtags: [],
        publish_status: 'pending',
        channel_post_id: null,
        channel_url: null,
        published_at: null,
        error_detail: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ])

    const result = await getPostDetail({} as any, 'post-uuid-001')

    expect(result).toMatchObject({
      id: 'post-uuid-001',
      channelPosts: [{ id: 'cp-001', channel: 'blog' }],
    })
  })

  it('포스트가 존재하지 않으면 null을 반환한다', async () => {
    vi.mocked(repo.getContentPostById).mockResolvedValue(null)

    const result = await getPostDetail({} as any, 'non-existent')

    expect(result).toBeNull()
  })
})
