import type { WholesaleAdapter } from './wholesale-adapter.js'
import { DomeggookAdapter } from './domeggook-adapter.js'
import { WholesaleMockAdapter } from './wholesale-mock-adapter.js'

export type WholesaleSource = 'domeggook' | 'mock'

export function createWholesaleAdapter(source: WholesaleSource): WholesaleAdapter {
  switch (source) {
    case 'domeggook': {
      const apiKey = process.env.DOMEGGOOK_API_KEY
      if (!apiKey) {
        console.warn('[WholesaleAdapterFactory] DOMEGGOOK_API_KEY 없음 → Mock 어댑터로 폴백')
        return new WholesaleMockAdapter()
      }
      return new DomeggookAdapter(apiKey)
    }
    case 'mock':
      return new WholesaleMockAdapter()
    default:
      throw new Error(`지원하지 않는 도매 소스: ${source}`)
  }
}
