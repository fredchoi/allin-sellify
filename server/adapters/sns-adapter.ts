// SNS 발행 어댑터 — Meta (Instagram, Facebook, Threads) + X
// 현재 구현: Mock 모드. 실제 API 키 세팅 시 real 모드로 전환

export type SnsChannel = 'instagram' | 'facebook' | 'threads' | 'x'

export interface SnsPublishInput {
  channel: SnsChannel
  body: string
  hashtags: string[]
  title?: string
  imageUrls?: string[]
}

export interface SnsPublishResult {
  channelPostId: string
  channelUrl: string
  publishedAt: string
}

export interface SnsAdapter {
  publish(input: SnsPublishInput): Promise<SnsPublishResult>
}

// ── Meta Mock ─────────────────────────────────────────────────────────────────

class MetaMockAdapter implements SnsAdapter {
  async publish(input: SnsPublishInput): Promise<SnsPublishResult> {
    // 실제 Meta Graph API 연동 시 이 메서드 교체
    const fakeId = `meta_${input.channel}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const baseUrls: Record<string, string> = {
      instagram: 'https://www.instagram.com/p/',
      facebook: 'https://www.facebook.com/permalink/',
      threads: 'https://www.threads.net/t/',
    }
    return {
      channelPostId: fakeId,
      channelUrl: `${baseUrls[input.channel] ?? 'https://example.com/'}${fakeId}`,
      publishedAt: new Date().toISOString(),
    }
  }
}

// ── X (Twitter) Mock ──────────────────────────────────────────────────────────

class XMockAdapter implements SnsAdapter {
  async publish(input: SnsPublishInput): Promise<SnsPublishResult> {
    // 실제 X API v2 연동 시 이 메서드 교체
    const fakeId = `x_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    return {
      channelPostId: fakeId,
      channelUrl: `https://x.com/i/web/status/${fakeId}`,
      publishedAt: new Date().toISOString(),
    }
  }
}

// ── 블로그 Mock ───────────────────────────────────────────────────────────────

class BlogMockAdapter implements SnsAdapter {
  async publish(input: SnsPublishInput): Promise<SnsPublishResult> {
    // 실제 블로그 API (네이버, Tistory 등) 연동 시 교체
    const fakeId = `blog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      channelPostId: fakeId,
      channelUrl: `https://blog.example.com/posts/${fakeId}`,
      publishedAt: new Date().toISOString(),
    }
  }
}

// ── 팩토리 ─────────────────────────────────────────────────────────────────────

const META_CHANNELS = new Set(['instagram', 'facebook', 'threads'])

export function createSnsAdapter(channel: string): SnsAdapter {
  if (channel === 'blog') return new BlogMockAdapter()
  if (META_CHANNELS.has(channel)) return new MetaMockAdapter()
  if (channel === 'x') return new XMockAdapter()
  throw new Error(`지원하지 않는 SNS 채널: ${channel}`)
}
