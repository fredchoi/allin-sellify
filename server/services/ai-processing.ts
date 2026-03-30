// AI 가공 파이프라인 — Claude API 연동
// Sonnet: 제목/후킹문구, Haiku: 옵션 파싱 폴백

import { z } from 'zod'

export interface AiProcessingInput {
  productName: string
  category?: string
  price: number
  options: Array<{ name: string; values: string[] }>
  description?: string
}

export interface AiProcessingResult {
  title: string
  hookingText: string
  processedOptions: Array<{ name: string; values: string[] }>
  model: string
}

const TitleResultSchema = z.object({
  title: z.string(),
  hookingText: z.string(),
})

const OptionResultSchema = z.object({
  options: z.array(
    z.object({
      name: z.string(),
      values: z.array(z.string()),
    })
  ),
})

function buildTitlePrompt(input: AiProcessingInput): string {
  return `당신은 온라인 쇼핑몰 상품 등록 전문가입니다.

다음 도매 상품 정보를 바탕으로 네이버 스마트스토어용 상품 제목과 후킹 문구를 작성해주세요.

## 상품 정보
- 도매 상품명: ${input.productName}
- 카테고리: ${input.category ?? '미분류'}
- 도매가: ${input.price.toLocaleString()}원
- 옵션: ${input.options.map((o) => `${o.name}: ${o.values.join(', ')}`).join(' / ') || '없음'}

## 작성 규칙
- 제목: 40자 이내, 주요 키워드 포함, 구매욕 자극
- 후킹문구: 2줄 이내, 핵심 혜택/특징 강조
- 과장 광고 금지
- JSON 형식으로만 응답

## 응답 형식
{
  "title": "상품 제목",
  "hookingText": "후킹 문구"
}`
}

function buildOptionPrompt(rawOptions: string): string {
  return `다음 도매 상품의 옵션 정보를 파싱하여 구조화된 JSON으로 변환해주세요.

## 원본 옵션 데이터
${rawOptions}

## 응답 형식
{
  "options": [
    {
      "name": "옵션명",
      "values": ["값1", "값2"]
    }
  ]
}`
}

async function callClaude(
  prompt: string,
  model: string,
  apiKey: string
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Claude API 오류 ${res.status}: ${body}`)
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const text = data.content.find((c) => c.type === 'text')?.text ?? ''
  return text
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`JSON 파싱 실패: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}

export async function processProductWithAi(
  input: AiProcessingInput,
  apiKey: string
): Promise<AiProcessingResult> {
  const SONNET = 'claude-sonnet-4-6'
  const HAIKU = 'claude-haiku-4-5-20251001'

  // Step 1: 제목/후킹문구 (Sonnet)
  const titleRaw = await callClaude(buildTitlePrompt(input), SONNET, apiKey)
  const titleJson = TitleResultSchema.parse(extractJson(titleRaw))

  // Step 2: 옵션 파싱 (옵션이 복잡한 경우 Haiku 폴백)
  let processedOptions = input.options
  if (input.options.some((o) => o.values.length > 5)) {
    try {
      const rawOptions = input.options
        .map((o) => `${o.name}: ${o.values.join(', ')}`)
        .join('\n')
      const optRaw = await callClaude(buildOptionPrompt(rawOptions), HAIKU, apiKey)
      const optJson = OptionResultSchema.parse(extractJson(optRaw))
      processedOptions = optJson.options
    } catch {
      // 옵션 파싱 실패 시 원본 유지
    }
  }

  return {
    title: titleJson.title,
    hookingText: titleJson.hookingText,
    processedOptions,
    model: SONNET,
  }
}

/** API 키 없을 때 사용하는 Mock AI 처리 */
export function mockProcessProduct(input: AiProcessingInput): AiProcessingResult {
  const shortName = input.productName.slice(0, 20)
  return {
    title: `[특가] ${shortName} 무료배송`,
    hookingText: `✔ 도매가 직거래로 최저가 보장\n✔ 당일 발송 / 빠른 배송`,
    processedOptions: input.options,
    model: 'mock',
  }
}
