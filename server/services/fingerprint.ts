// 상품 핑거프린팅 서비스
// 상품명 토크나이저 + 이미지 perceptual hash → 중복 판정

/**
 * 한국어 간이 토크나이저
 * Kiwi(Python)를 쓰는 것이 이상적이지만 Node.js 서버에서는
 * 정규식 기반 간이 분리로 핵심 키워드를 추출한다.
 */
function tokenizeKorean(text: string): string[] {
  return text
    .replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => t.toLowerCase())
}

/**
 * TF 기반 코사인 유사도 (간이 버전)
 */
function cosineSimilarity(a: string[], b: string[]): number {
  const freqA = buildFreq(a)
  const freqB = buildFreq(b)

  const keys = new Set([...Object.keys(freqA), ...Object.keys(freqB)])
  let dot = 0
  let magA = 0
  let magB = 0

  for (const k of keys) {
    const va = freqA[k] ?? 0
    const vb = freqB[k] ?? 0
    dot += va * vb
    magA += va * va
    magB += vb * vb
  }

  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

function buildFreq(tokens: string[]): Record<string, number> {
  return tokens.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1
    return acc
  }, {})
}

export interface FingerprintResult {
  textFingerprint: string   // 토큰화된 텍스트 (공백 구분)
  isDuplicate: boolean
  similarity: number        // 0~1
}

export function computeTextFingerprint(name: string): string {
  return tokenizeKorean(name).sort().join(' ')
}

export function isTextDuplicate(fpA: string, fpB: string, threshold = 0.85): boolean {
  const tokensA = fpA.split(' ')
  const tokensB = fpB.split(' ')
  return cosineSimilarity(tokensA, tokensB) >= threshold
}

/** perceptual hash 간 해밍 거리 기반 유사도 */
export function isImageDuplicate(hashA: string, hashB: string, threshold = 0.85): boolean {
  if (!hashA || !hashB) return false
  try {
    const a = BigInt(`0x${hashA}`)
    const b = BigInt(`0x${hashB}`)
    const xor = a ^ b
    const hammingDist = xor.toString(2).split('').filter((c) => c === '1').length
    return 1 - hammingDist / 64 >= threshold
  } catch {
    return false
  }
}

/** 텍스트+이미지 복합 중복 판정 */
export function isDuplicate(
  textFpA: string,
  textFpB: string,
  imageHashA: string,
  imageHashB: string,
  threshold = 0.85
): boolean {
  return isTextDuplicate(textFpA, textFpB, threshold) && isImageDuplicate(imageHashA, imageHashB, threshold)
}
