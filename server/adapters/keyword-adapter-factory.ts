import type { KeywordAdapter } from './keyword-adapter.js'
import { MockAdapter } from './mock-adapter.js'
import { NaverAdAdapter } from './naver-ad-adapter.js'
import { NaverDataLabAdapter } from './naver-datalab-adapter.js'
import { config } from '../config.js'

class CompositeAdapter implements KeywordAdapter {
  readonly name = 'composite'

  constructor(
    private readonly adAdapter: NaverAdAdapter,
    private readonly datalabAdapter: NaverDataLabAdapter
  ) {}

  async getKeywordStats(
    keywords: string[],
    options?: { device?: 'all' | 'pc' | 'mobile' }
  ) {
    return this.adAdapter.getKeywordStats(keywords, options)
  }

  async getKeywordTrend(
    keywords: string[],
    options?: { startDate?: string; endDate?: string; timeUnit?: 'date' | 'week' | 'month' }
  ) {
    return this.datalabAdapter.getKeywordTrend(keywords, options)
  }
}

export function createKeywordAdapter(): KeywordAdapter {
  if (config.KEYWORD_ADAPTER_MODE === 'real') {
    return new CompositeAdapter(new NaverAdAdapter(), new NaverDataLabAdapter())
  }
  return new MockAdapter()
}
