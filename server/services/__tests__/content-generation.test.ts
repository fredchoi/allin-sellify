import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  generateChannelContent,
  mockGenerateChannelContent,
  ALL_CHANNELS,
  type ContentGenerationInput,
} from '../content-generation'

// --- helpers -----------------------------------------------------------

function makeInput(overrides: Partial<ContentGenerationInput> = {}): ContentGenerationInput {
  return {
    masterTitle: '여름 린넨 셔츠 추천',
    masterBody: '통기성 좋은 린넨 소재로 여름에 시원하게 착용할 수 있는 셔츠입니다.',
    keywords: ['린넨셔츠', '여름패션', '남성셔츠'],
    productName: '프리미엄 린넨 셔츠',
    category: '패션의류',
    ...overrides,
  }
}

function claudeResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      content: [{ type: 'text', text }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

function validChannelJson(): string {
  return JSON.stringify({
    blog: {
      title: 'SEO 최적화된 린넨 셔츠 리뷰',
      body: '## 린넨 셔츠 리뷰\n\n여름 필수 아이템입니다.',
      hashtags: ['린넨셔츠', '여름패션'],
    },
    instagram: {
      body: '시원한 린넨 셔츠 입고 완료!',
      hashtags: ['린넨셔츠', '여름코디', '셀러올인원'],
    },
    facebook: {
      body: '린넨 셔츠 신규 입고! 합리적인 가격으로 만나보세요.',
      hashtags: ['린넨셔츠', '온라인쇼핑'],
    },
    threads: {
      body: '린넨 셔츠 드디어 입고!',
      hashtags: ['린넨셔츠'],
    },
    x: {
      body: '[신상] 린넨 셔츠 입고 완료',
      hashtags: ['린넨셔츠'],
    },
  })
}

// --- suite -------------------------------------------------------------

describe('content-generation 서비스', () => {
  const API_KEY = 'test-api-key'
  let fetchMock: Mock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  describe('generateChannelContent', () => {
    it('Claude API를 호출하고 5개 채널 콘텐츠를 반환한다', async () => {
      fetchMock.mockResolvedValueOnce(claudeResponse(validChannelJson()))

      const result = await generateChannelContent(makeInput(), API_KEY)

      expect(result.model).toBe('claude-sonnet-4-6')
      expect(Object.keys(result.channels)).toHaveLength(5)

      // blog에는 title이 포함된다
      expect(result.channels.blog.channel).toBe('blog')
      expect(result.channels.blog.title).toBe('SEO 최적화된 린넨 셔츠 리뷰')
      expect(result.channels.blog.hashtags).toContain('린넨셔츠')

      // 나머지 채널에는 body와 hashtags가 있다
      for (const ch of ['instagram', 'facebook', 'threads', 'x'] as const) {
        expect(result.channels[ch].channel).toBe(ch)
        expect(result.channels[ch].body.length).toBeGreaterThan(0)
        expect(result.channels[ch].hashtags.length).toBeGreaterThan(0)
      }
    })

    it('Sonnet 모델과 max_tokens 4096으로 호출한다', async () => {
      fetchMock.mockResolvedValueOnce(claudeResponse(validChannelJson()))

      await generateChannelContent(makeInput(), API_KEY)

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body as string)
      expect(callBody.model).toBe('claude-sonnet-4-6')
      expect(callBody.max_tokens).toBe(4096)
    })

    it('프롬프트에 키워드, 상품명, 카테고리가 포함된다', async () => {
      fetchMock.mockResolvedValueOnce(claudeResponse(validChannelJson()))

      await generateChannelContent(makeInput(), API_KEY)

      const prompt = JSON.parse(fetchMock.mock.calls[0][1].body as string).messages[0].content
      expect(prompt).toContain('린넨셔츠, 여름패션, 남성셔츠')
      expect(prompt).toContain('프리미엄 린넨 셔츠')
      expect(prompt).toContain('패션의류')
    })

    it('API 오류 시 에러를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('overloaded', { status: 529 }),
      )

      await expect(generateChannelContent(makeInput(), API_KEY)).rejects.toThrow(
        'Claude API 오류 529',
      )
    })

    it('응답 JSON에 필수 필드가 누락되면 Zod 검증 에러를 던진다', async () => {
      const incomplete = JSON.stringify({
        blog: { title: '블로그 제목', body: '본문', hashtags: [] },
        // instagram, facebook, threads, x 누락
      })

      fetchMock.mockResolvedValueOnce(claudeResponse(incomplete))

      await expect(generateChannelContent(makeInput(), API_KEY)).rejects.toThrow()
    })

    it('JSON이 없는 응답 시 파싱 에러를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(
        claudeResponse('콘텐츠를 생성할 수 없습니다'),
      )

      await expect(generateChannelContent(makeInput(), API_KEY)).rejects.toThrow(
        'JSON 파싱 실패',
      )
    })
  })

  describe('mockGenerateChannelContent', () => {
    it('API 호출 없이 모든 채널의 Mock 콘텐츠를 반환한다', () => {
      const input = makeInput()
      const result = mockGenerateChannelContent(input)

      expect(result.model).toBe('mock')

      for (const ch of ALL_CHANNELS) {
        expect(result.channels[ch].channel).toBe(ch)
        expect(result.channels[ch].body.length).toBeGreaterThan(0)
        expect(result.channels[ch].hashtags.length).toBeGreaterThan(0)
      }

      // blog에는 title이 포함된다
      expect(result.channels.blog.title).toContain('여름 린넨 셔츠 추천')

      // 키워드가 해시태그에 포함된다
      expect(result.channels.blog.hashtags).toContain('린넨셔츠')

      // fetch가 호출되지 않았는지 확인
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
