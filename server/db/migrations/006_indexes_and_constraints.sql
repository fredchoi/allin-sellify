-- Migration 006: 성능 최적화 인덱스 + 누락 제약조건
-- 003_core_schema.sql 보완

-- 정산 쿼리: orders(seller_id, marketplace, ordered_at) 커버링 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_seller_market_date
  ON orders(seller_id, marketplace, ordered_at DESC);

-- 정산 쿼리: settlements(seller_id, marketplace, period_start) 복합
CREATE INDEX IF NOT EXISTS idx_settlements_seller_market
  ON settlements(seller_id, marketplace, period_start DESC);

-- 재고 폴링: status + next_poll_at 부분 인덱스 강화 (이미 있지만 tier 포함)
CREATE INDEX IF NOT EXISTS idx_isj_active_poll
  ON inventory_sync_jobs(status, next_poll_at, tier)
  WHERE status = 'active';

-- content_channel_posts: 이미 UNIQUE(content_post_id, channel) 존재 확인
-- → 003에서 이미 정의됨, 스킵

-- store_products: store_id + display_order 정렬 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_sp_store_order
  ON store_products(store_id, display_order);

-- carts: store_id + session_id 조회 최적화
CREATE INDEX IF NOT EXISTS idx_carts_store_session
  ON carts(store_id, session_id);

-- content_posts: seller_id + post_status 필터 최적화
CREATE INDEX IF NOT EXISTS idx_cp_seller_status
  ON content_posts(seller_id, post_status);

-- processed_products: seller_id + processing_status 복합
CREATE INDEX IF NOT EXISTS idx_pp_seller_status
  ON processed_products(seller_id, processing_status);
