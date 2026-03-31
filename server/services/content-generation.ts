// 블로그·SNS 콘텐츠 생성 — Claude API 1-call, 5개 채널 동시 변환
// Sonnet: 마스터 콘텐츠 + 채널별 변환

import { z } from 'zod'

export type Channel = 'blog' | 'instagram' | 'facebook' | 'threads' | 'x'

export const ALL_CHANNELS: Channel[] = ['blog', 'instagram', 'facebook', 'threads', 'x']

export interface ContentGenerationInput {
  masterTitle: string
  masterBody: string
  keywords: string[]
  productName?: string
  category?: string
}

export interface ChannelContent {
  channel: Channel
  title?: string
  body: string
  hashtags: string[]
}

export interface ContentGenerationResult {
  channels: Record<Channel, ChannelContent>
  model: string
}

const ChannelOutputSchema = z.object({
  blog: z.object({
    title: z.string(),
    body: z.string(),
    hashtags: z.array(z.string()),
  }),
  instagram: z.object({
    body: z.string(),
    hashtags: z.array(z.string()),
  }),
  facebook: z.object({
    body: z.string(),
    hashtags: z.array(z.string()),
  }),
  threads: z.object({
    body: z.string(),
    hashtags: z.array(z.string()),
  }),
  x: z.object({
    body: z.string(),
    hashtags: z.array(z.string()),
  }),
})

function buildContentPrompt(input: ContentGenerationInput): string {
  const keywordStr = input.keywords.length > 0 ? input.keywords.join(', ') : '없음'
  return `당신은 온라인 셀러를 위한 SNS 콘텐츠 전문 작가입니다.

## 콘텐츠 정보
- 제목: ${input.masterTitle}
- 본문: ${input.masterBody}
- 키워드: ${keywordStr}
${input.productName ? `- 상품명: ${input.productName}` : ''}
${input.category ? `- 카테고리: ${input.category}` : ''}

## 각 채널별 콘텐츠 요구사항
1. **블로그**: SEO 최적화 제목 + 마크다운 본문 1000자 내외. 키워드 자연스럽게 포함. 소제목 활용.
2. **인스타그램**: 감성적 캡션 200자 이내. 이모지 적절히 사용. 해시태그 10-15개.
3. **페이스북**: 정보 중심 300자 이내. 친근한 톤. 해시태그 3-5개.
4. **쓰레드**: 임팩트 있는 한 문장 + 핵심 메시지 150자 이내. 해시태그 2-3개.
5. **X (트위터)**: 핵심 가치 220자 이내. 간결하고 임팩트 있게. 해시태그 2-3개.

## 응답 형식 (JSON만, 다른 텍스트 없이)
{
  "blog": {
    "title": "SEO 최적화 블로그 제목",
    "body": "마크다운 형식 블로그 본문 (1000자 내외)",
    "hashtags": ["키워드1", "키워드2"]
  },
  "instagram": {
    "body": "인스타그램 캡션 (200자 이내)",
    "hashtags": ["해시태그1", "해시태그2"]
  },
  "facebook": {
    "body": "페이스북 게시글 (300자 이내)",
    "hashtags": ["해시태그1"]
  },
  "threads": {
    "body": "쓰레드 게시글 (150자 이내)",
    "hashtags": ["해시태그1"]
  },
  "x": {
    "body": "X 게시글 (220자 이내)",
    "hashtags": ["해시태그1"]
  }
}`
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude API 오류 ${res.status}: ${body}`)
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  return data.content.find((c) => c.type === 'text')?.text ?? ''
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`JSON 파싱 실패: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}

export async function generateChannelContent(
  input: ContentGenerationInput,
  apiKey: string
): Promise<ContentGenerationResult> {
  const raw = await callClaude(buildContentPrompt(input), apiKey)
  const parsed = ChannelOutputSchema.parse(extractJson(raw))

  return {
    channels: {
      blog: { channel: 'blog', title: parsed.blog.title, body: parsed.blog.body, hashtags: parsed.blog.hashtags },
      instagram: { channel: 'instagram', body: parsed.instagram.body, hashtags: parsed.instagram.hashtags },
      facebook: { channel: 'facebook', body: parsed.facebook.body, hashtags: parsed.facebook.hashtags },
      threads: { channel: 'threads', body: parsed.threads.body, hashtags: parsed.threads.hashtags },
      x: { channel: 'x', body: parsed.x.body, hashtags: parsed.x.hashtags },
    },
    model: 'claude-sonnet-4-6',
  }
}

/** API 키 없을 때 Mock 데이터 반환 */
export function mockGenerateChannelContent(
  input: ContentGenerationInput
): ContentGenerationResult {
  const title = input.masterTitle || '신상품 소개'
  const keywords = input.keywords.slice(0, 3).map((k) => k.replace(/\s+/g, ''))

  return {
    channels: {
      blog: {
        channel: 'blog',
        title: `[리뷰] ${title} — 온라인 셀러 필수템 완벽 분석`,
        body: `## ${title}\n\n안녕하세요! 오늘은 ${title}을(를) 소개해드리겠습니다.\n\n### 제품 특징\n\n${input.masterBody}\n\n### 구매 포인트\n\n1. **가성비 최강** — 도매가 직거래로 합리적인 가격\n2. **빠른 배송** — 당일 출고로 신속 배송\n3. **품질 보증** — 검증된 공급업체 제품\n\n### 마무리\n\n${title}는 온라인 쇼핑몰 운영에 꼭 필요한 상품입니다. 지금 바로 확인해보세요!`,
        hashtags: [...keywords, '온라인쇼핑', '셀러추천', '도매직거래'],
      },
      instagram: {
        channel: 'instagram',
        body: `✨ ${title} 입고 완료! 🎉\n\n${input.masterBody.slice(0, 80)}...\n\n지금 바로 확인해보세요 👇\n#셀러올인원 #온라인쇼핑`,
        hashtags: [...keywords, '셀러올인원', '온라인쇼핑', '신상입고', '쇼핑스타그램', '인스타쇼핑'],
      },
      facebook: {
        channel: 'facebook',
        body: `🛍️ ${title} 신규 입고!\n\n${input.masterBody.slice(0, 150)}\n\n합리적인 가격으로 만나보세요. 링크는 프로필에서 확인!`,
        hashtags: [...keywords, '온라인쇼핑몰', '신상품'],
      },
      threads: {
        channel: 'threads',
        body: `${title} 드디어 입고됐어요 🔥 ${input.masterBody.slice(0, 80)} 지금 바로 GO →`,
        hashtags: [...keywords, '신상'],
      },
      x: {
        channel: 'x',
        body: `[신상] ${title} 입고 완료 🎯 ${input.masterBody.slice(0, 120)} 구매 링크 ↓`,
        hashtags: [...keywords, '온라인쇼핑'],
      },
    },
    model: 'mock',
  }
}
