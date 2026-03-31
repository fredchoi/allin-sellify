import type { MarketplaceAdapter } from './marketplace-adapter.js'
import { NaverSmartStoreAdapter } from './naver-smartstore-adapter.js'
import { MarketplaceMockAdapter } from './marketplace-mock-adapter.js'
import { config } from '../config.js'

export type MarketplaceSource = 'naver' | 'coupang' | 'mock'

export function createMarketplaceAdapter(source?: MarketplaceSource): MarketplaceAdapter {
  const mode = source ?? (config.MARKETPLACE_ADAPTER_MODE === 'real' ? 'naver' : 'mock')

  switch (mode) {
    case 'naver': {
      const clientId = config.NAVER_COMMERCE_CLIENT_ID
      const clientSecret = config.NAVER_COMMERCE_CLIENT_SECRET
      if (!clientId || !clientSecret) {
        console.warn('[MarketplaceAdapterFactory] NAVER_COMMERCE_* 없음 → Mock 어댑터로 폴백')
        return new MarketplaceMockAdapter()
      }
      return new NaverSmartStoreAdapter(clientId, clientSecret)
    }
    case 'coupang':
      console.warn('[MarketplaceAdapterFactory] 쿠팡 어댑터 미구현 → Mock 폴백')
      return new MarketplaceMockAdapter()
    case 'mock':
      return new MarketplaceMockAdapter()
    default:
      throw new Error(`지원하지 않는 마켓플레이스: ${mode}`)
  }
}
