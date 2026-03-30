-- Migration 001: 키워드 인텔리전스 모듈 초기 스키마

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE keywords (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL,
  keyword         TEXT NOT NULL,
  search_volume   INTEGER,
  competition     NUMERIC(5,4),
  cgi             NUMERIC(5,4),
  trend_score     NUMERIC(5,4),
  opp_score       NUMERIC(5,4),
  category        TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'archived', 'monitoring')),
  last_analyzed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, keyword)
);

CREATE INDEX idx_keywords_seller ON keywords(seller_id);
CREATE INDEX idx_keywords_opp ON keywords(opp_score DESC NULLS LAST);
CREATE INDEX idx_keywords_status ON keywords(status);

-- 일별 통계 (향후 TimescaleDB 하이퍼테이블 전환 대비)
CREATE TABLE keyword_daily_stats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id      UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  search_volume   INTEGER,
  competition     NUMERIC(5,4),
  cgi             NUMERIC(5,4),
  trend_score     NUMERIC(5,4),
  opp_score       NUMERIC(5,4),
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(keyword_id, date)
);

CREATE INDEX idx_kds_keyword_date ON keyword_daily_stats(keyword_id, date DESC);

-- TimescaleDB 전환 시:
-- SELECT create_hypertable('keyword_daily_stats', 'date');
