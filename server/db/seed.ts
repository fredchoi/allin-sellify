import { Pool } from 'pg'
import { config } from '../config.js'

const DEMO_SELLER_ID = '00000000-0000-0000-0000-000000000001'

const SEED_KEYWORDS = [
  { keyword: '무선이어폰', search_volume: 85000, competition: 0.8, cgi: 0.2968, trend_score: 0.52, opp_score: 0.4617, category: '전자기기' },
  { keyword: '블루투스이어폰', search_volume: 62000, competition: 0.75, cgi: 0.3144, trend_score: 0.48, opp_score: 0.4361, category: '전자기기' },
  { keyword: '노이즈캔슬링이어폰', search_volume: 34000, competition: 0.65, cgi: 0.4132, trend_score: 0.61, opp_score: 0.4449, category: '전자기기' },
  { keyword: '스마트워치', search_volume: 120000, competition: 0.85, cgi: 0.21, trend_score: 0.55, opp_score: 0.4118, category: '전자기기' },
  { keyword: '갤럭시버즈', search_volume: 45000, competition: 0.7, cgi: 0.3652, trend_score: 0.44, opp_score: 0.4265, category: '전자기기' },
  { keyword: 'USB허브', search_volume: 28000, competition: 0.55, cgi: 0.4256, trend_score: 0.50, opp_score: 0.4359, category: '컴퓨터용품' },
  { keyword: '무선충전기', search_volume: 52000, competition: 0.72, cgi: 0.3808, trend_score: 0.53, opp_score: 0.4393, category: '전자기기' },
  { keyword: '보조배터리', search_volume: 78000, competition: 0.78, cgi: 0.3392, trend_score: 0.49, opp_score: 0.4286, category: '전자기기' },
  { keyword: '스마트폰케이스', search_volume: 140000, competition: 0.88, cgi: 0.1832, trend_score: 0.56, opp_score: 0.3945, category: '스마트폰 액세서리' },
  { keyword: '무선키보드', search_volume: 35000, competition: 0.6, cgi: 0.3960, trend_score: 0.58, opp_score: 0.4444, category: '컴퓨터용품' },
]

async function seed() {
  const pool = new Pool({ connectionString: config.DATABASE_URL })

  try {
    console.log('시드 데이터 삽입 중...')

    for (const kw of SEED_KEYWORDS) {
      await pool.query(
        `INSERT INTO keywords
          (seller_id, keyword, search_volume, competition, cgi, trend_score, opp_score, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (seller_id, keyword) DO NOTHING`,
        [
          DEMO_SELLER_ID,
          kw.keyword,
          kw.search_volume,
          kw.competition,
          kw.cgi,
          kw.trend_score,
          kw.opp_score,
          kw.category,
        ]
      )
      console.log(`  [seed] ${kw.keyword}`)
    }

    console.log(`시드 완료: ${SEED_KEYWORDS.length}개 키워드 (seller_id: ${DEMO_SELLER_ID})`)
  } finally {
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('시드 실패:', err)
  process.exit(1)
})
