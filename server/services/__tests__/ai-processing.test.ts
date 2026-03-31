import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  processProductWithAi,
  mockProcessProduct,
  type AiProcessingInput,
} from '../ai-processing'

// --- helpers -----------------------------------------------------------

function makeInput(overrides: Partial<AiProcessingInput> = {}): AiProcessingInput {
  return {
    productName: '여름 린넨 셔츠 남성용',
    category: '패션의류',
    price: 12000,
    options: [
      { name: '색상', values: ['화이트', '네이비'] },
      { name: '사이즈', values: ['M', 'L', 'XL'] },
    ],
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

function claudeError(status: number, body: string): Response {
  return new Response(body, { status })
}

// --- suite -------------------------------------------------------------

describe('ai-processing 서비스', () => {
  const API_KEY = 'test-api-key'
  let fetchMock: Mock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  // 1. processProductWithAi — 올바른 프롬프트 구성 및 Sonnet 호출
  describe('processProductWithAi', () => {
    it('Sonnet 모델로 Claude API를 호출하고 제목/후킹문구를 반환한다', async () => {
      const titleJson = JSON.stringify({
        title: '[여름특가] 린넨 셔츠 남성 무료배송',
        hookingText: '시원한 린넨 소재로 여름을 쾌적하게',
      })

      fetchMock.mockResolvedValueOnce(claudeResponse(titleJson))

      const input = makeInput()
      const result = await processProductWithAi(input, API_KEY)

      expect(result.title).toBe('[여름특가] 린넨 셔츠 남성 무료배송')
      expect(result.hookingText).toBe('시원한 린넨 소재로 여름을 쾌적하게')
      expect(result.model).toBe('claude-sonnet-4-6')

      // fetch가 Sonnet 모델로 호출되었는지 확인
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body as string)
      expect(callBody.model).toBe('claude-sonnet-4-6')
      expect(callBody.messages[0].content).toContain('여름 린넨 셔츠 남성용')
    })

    it('프롬프트에 카테고리, 가격, 옵션 정보가 포함된다', async () => {
      const titleJson = JSON.stringify({
        title: '테스트 제목',
        hookingText: '테스트 후킹',
      })

      fetchMock.mockResolvedValueOnce(claudeResponse(titleJson))

      const input = makeInput({ category: '생활용품', price: 25000 })
      await processProductWithAi(input, API_KEY)

      const prompt = JSON.parse(fetchMock.mock.calls[0][1].body as string).messages[0].content
      expect(prompt).toContain('생활용품')
      expect(prompt).toContain('25,000')
      expect(prompt).toContain('색상: 화이트, 네이비')
    })

    it('API 오류 시 에러를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(claudeError(429, 'rate limited'))

      await expect(processProductWithAi(makeInput(), API_KEY)).rejects.toThrow(
        'Claude API 오류 429',
      )
    })

    // 2. 옵션 파싱 폴백 — values가 5개 초과이면 Haiku로 재파싱
    it('옵션 값이 5개 초과 시 Haiku 모델로 옵션 재파싱한다', async () => {
      const manyValuesInput = makeInput({
        options: [
          {
            name: '색상',
            values: ['레드', '블루', '그린', '옐로우', '블랙', '화이트'],
          },
        ],
      })

      const titleJson = JSON.stringify({
        title: '테스트 제목',
        hookingText: '테스트 후킹',
      })
      const optionJson = JSON.stringify({
        options: [
          { name: '색상', values: ['레드', '블루', '그린', '옐로우', '블랙', '화이트'] },
        ],
      })

      fetchMock
        .mockResolvedValueOnce(claudeResponse(titleJson))  // Sonnet 호출
        .mockResolvedValueOnce(claudeResponse(optionJson))  // Haiku 호출

      const result = await processProductWithAi(manyValuesInput, API_KEY)

      expect(fetchMock).toHaveBeenCalledTimes(2)

      const haikuBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
      expect(haikuBody.model).toBe('claude-haiku-4-5-20251001')

      expect(result.processedOptions).toEqual([
        { name: '색상', values: ['레드', '블루', '그린', '옐로우', '블랙', '화이트'] },
      ])
    })

    it('Haiku 옵션 파싱 실패 시 원본 옵션을 유지한다', async () => {
      const manyValuesInput = makeInput({
        options: [
          { name: '사이즈', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        ],
      })

      const titleJson = JSON.stringify({
        title: '테스트 제목',
        hookingText: '테스트 후킹',
      })

      fetchMock
        .mockResolvedValueOnce(claudeResponse(titleJson))
        .mockResolvedValueOnce(claudeError(500, 'internal error')) // Haiku 실패

      const result = await processProductWithAi(manyValuesInput, API_KEY)

      // 원본 옵션이 그대로 반환된다
      expect(result.processedOptions).toEqual(manyValuesInput.options)
    })
  })

  // 3. extractJson 헬퍼 — 마크다운 래핑 및 malformed JSON 처리
  describe('extractJson 동작 (processProductWithAi 내부)', () => {
    it('마크다운 코드블록으로 감싼 JSON도 올바르게 파싱한다', async () => {
      const wrappedJson = '```json\n{"title": "마크다운 래핑 제목", "hookingText": "후킹 텍스트"}\n```'

      fetchMock.mockResolvedValueOnce(claudeResponse(wrappedJson))

      const result = await processProductWithAi(makeInput(), API_KEY)
      expect(result.title).toBe('마크다운 래핑 제목')
    })

    it('JSON이 전혀 없는 응답 시 에러를 던진다', async () => {
      fetchMock.mockResolvedValueOnce(claudeResponse('이것은 JSON이 아닙니다'))

      await expect(processProductWithAi(makeInput(), API_KEY)).rejects.toThrow('JSON 파싱 실패')
    })
  })

  // 4. mockProcessProduct
  describe('mockProcessProduct', () => {
    it('API 호출 없이 구조화된 Mock 결과를 반환한다', () => {
      const input = makeInput({ productName: '프리미엄 스테인리스 텀블러 500ml' })
      const result = mockProcessProduct(input)

      expect(result.title).toContain('[특가]')
      expect(result.title).toContain('프리미엄 스테인리스 텀블러 500m') // 20자 슬라이스
      expect(result.hookingText).toContain('도매가 직거래')
      expect(result.processedOptions).toEqual(input.options)
      expect(result.model).toBe('mock')

      // fetch가 호출되지 않았는지 확인
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })
})
