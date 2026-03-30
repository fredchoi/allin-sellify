-- Migration 003: 전체 7모듈 핵심 스키마
-- 공통(sellers, credentials) + 3계층 상품 + 재고 + 주문 + 정산 + 셀러몰 + 콘텐츠

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COMMON: 셀러 & 마켓플레이스 자격증명
-- ============================================================

CREATE TABLE sellers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  business_name   TEXT,
  business_number TEXT,
  phone           TEXT,
  plan            TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter', 'pro', 'business')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'withdrawn')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sellers_email ON sellers(email);
CREATE INDEX idx_sellers_status ON sellers(status);

CREATE TABLE marketplace_credentials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  marketplace     TEXT NOT NULL
                  CHECK (marketplace IN ('naver', 'coupang', 'store')),
  credentials_enc BYTEA NOT NULL,        -- AES-256 encrypted JSON
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'revoked')),
  last_verified_at TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, marketplace)
);

-- ============================================================
-- 3-LAYER PRODUCT DATA (CRITICAL)
-- ============================================================

-- Layer 1: 도매 원본
CREATE TABLE wholesale_products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source            TEXT NOT NULL
                    CHECK (source IN ('domeggook', 'dometopia', 'ownerclan')),
  source_product_id TEXT NOT NULL,
  name              TEXT NOT NULL,
  price             INTEGER NOT NULL,
  category          TEXT,
  options           JSONB DEFAULT '[]',
  images            JSONB DEFAULT '[]',
  detail_html       TEXT,
  supply_status     TEXT NOT NULL DEFAULT 'available'
                    CHECK (supply_status IN ('available', 'soldout', 'discontinued')),
  stock_quantity    INTEGER,
  fingerprint_text  TEXT,               -- 형태소 분석 결과
  fingerprint_hash  TEXT,               -- 대표 이미지 perceptual hash
  raw_data          JSONB DEFAULT '{}',
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, source_product_id)
);

CREATE INDEX idx_wp_source ON wholesale_products(source);
CREATE INDEX idx_wp_supply_status ON wholesale_products(supply_status);
CREATE INDEX idx_wp_fingerprint ON wholesale_products(fingerprint_hash);

-- Layer 2: AI 가공본 (셀러별)
CREATE TABLE processed_products (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id               UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  wholesale_product_id    UUID NOT NULL REFERENCES wholesale_products(id) ON DELETE CASCADE,
  title                   TEXT,
  hooking_text            TEXT,
  description             TEXT,
  processed_images        JSONB DEFAULT '[]',
  processed_options       JSONB DEFAULT '[]',
  selling_price           INTEGER,
  margin_rate             NUMERIC(5,2),
  processing_status       TEXT NOT NULL DEFAULT 'pending'
                          CHECK (processing_status IN (
                            'pending', 'title_done', 'image_done',
                            'option_done', 'completed', 'failed'
                          )),
  processing_checkpoints  JSONB DEFAULT '{}',  -- STEP별 독립 체크포인트
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, wholesale_product_id)
);

CREATE INDEX idx_pp_seller ON processed_products(seller_id);
CREATE INDEX idx_pp_status ON processed_products(processing_status);

-- Layer 3: 마켓 등록본 (마켓별)
CREATE TABLE product_market_listings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processed_product_id  UUID NOT NULL REFERENCES processed_products(id) ON DELETE CASCADE,
  seller_id             UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  marketplace           TEXT NOT NULL
                        CHECK (marketplace IN ('naver', 'coupang', 'store')),
  market_product_id     TEXT,            -- 마켓에서 부여한 상품 ID
  listing_status        TEXT NOT NULL DEFAULT 'draft'
                        CHECK (listing_status IN (
                          'draft', 'pending', 'active',
                          'paused', 'rejected', 'deleted'
                        )),
  listing_url           TEXT,
  listing_data          JSONB DEFAULT '{}',  -- 마켓별 추가 필드
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(processed_product_id, marketplace)
);

CREATE INDEX idx_pml_seller ON product_market_listings(seller_id);
CREATE INDEX idx_pml_marketplace ON product_market_listings(marketplace, listing_status);

-- ============================================================
-- MODULE 03: 재고 동기화
-- ============================================================

CREATE TABLE inventory_sync_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wholesale_product_id UUID NOT NULL REFERENCES wholesale_products(id) ON DELETE CASCADE,
  tier              TEXT NOT NULL DEFAULT 'tier3'
                    CHECK (tier IN ('tier1', 'tier2', 'tier3')),
  -- tier1: 재고 5개 이하 → 10분, tier2: 판매중 → 30분, tier3: 유휴 → 6시간
  last_polled_at    TIMESTAMPTZ,
  next_poll_at      TIMESTAMPTZ,
  poll_count        INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'error')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_isj_next_poll ON inventory_sync_jobs(next_poll_at)
  WHERE status = 'active';

CREATE TABLE inventory_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wholesale_product_id UUID NOT NULL REFERENCES wholesale_products(id) ON DELETE CASCADE,
  quantity            INTEGER NOT NULL,
  price               INTEGER,
  supply_status       TEXT,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_is_product_time ON inventory_snapshots(wholesale_product_id, recorded_at DESC);
-- TimescaleDB 전환 시: SELECT create_hypertable('inventory_snapshots', 'recorded_at');

-- ============================================================
-- MODULE 04: 주문 & 배송
-- ============================================================

CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id         UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  marketplace       TEXT NOT NULL
                    CHECK (marketplace IN ('naver', 'coupang', 'store')),
  market_order_id   TEXT NOT NULL,
  order_status      TEXT NOT NULL DEFAULT 'new'
                    CHECK (order_status IN (
                      'new', 'confirmed', 'preparing',
                      'shipping', 'delivered', 'cancelled',
                      'returned', 'exchanged'
                    )),
  buyer_name        TEXT,
  buyer_phone       TEXT,
  buyer_address     TEXT,
  total_amount      INTEGER NOT NULL DEFAULT 0,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  ordered_at        TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace, market_order_id)  -- 주문 중복 방지
);

CREATE INDEX idx_orders_seller ON orders(seller_id, ordered_at DESC);
CREATE INDEX idx_orders_status ON orders(order_status);

CREATE TABLE order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id            UUID REFERENCES product_market_listings(id) ON DELETE SET NULL,
  wholesale_product_id  UUID REFERENCES wholesale_products(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  option_name           TEXT,
  quantity              INTEGER NOT NULL DEFAULT 1,
  selling_price         INTEGER NOT NULL,
  wholesale_price       INTEGER NOT NULL,  -- 스냅샷: 주문 시점 도매원가
  commission_rate       NUMERIC(5,4),
  wholesale_order_id    TEXT,              -- 도매 발주 ID
  wholesale_order_status TEXT DEFAULT 'pending'
                        CHECK (wholesale_order_status IN (
                          'pending', 'ordered', 'confirmed',
                          'shipped', 'completed', 'failed'
                        )),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oi_order ON order_items(order_id);

CREATE TABLE shipments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier           TEXT,
  tracking_number   TEXT,
  shipment_status   TEXT NOT NULL DEFAULT 'preparing'
                    CHECK (shipment_status IN (
                      'preparing', 'shipped', 'in_transit',
                      'delivered', 'returned'
                    )),
  shipped_at        TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_tracking ON shipments(carrier, tracking_number);

-- ============================================================
-- MODULE 05: 정산 & 세무
-- ============================================================

CREATE TABLE market_fee_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marketplace     TEXT NOT NULL
                  CHECK (marketplace IN ('naver', 'coupang', 'store')),
  category        TEXT,
  fee_rate        NUMERIC(5,4) NOT NULL,
  fee_type        TEXT NOT NULL DEFAULT 'percentage'
                  CHECK (fee_type IN ('percentage', 'fixed')),
  effective_from  TIMESTAMPTZ NOT NULL,
  effective_to    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfr_marketplace ON market_fee_rules(marketplace, effective_from DESC);

CREATE TABLE settlements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id         UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  marketplace       TEXT NOT NULL
                    CHECK (marketplace IN ('naver', 'coupang', 'store')),
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  total_sales       INTEGER NOT NULL DEFAULT 0,
  total_commission  INTEGER NOT NULL DEFAULT 0,
  total_wholesale   INTEGER NOT NULL DEFAULT 0,
  net_profit        INTEGER NOT NULL DEFAULT 0,
  settlement_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (settlement_status IN (
                      'pending', 'confirmed', 'paid', 'disputed'
                    )),
  settled_at        TIMESTAMPTZ,
  details           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_settlements_seller ON settlements(seller_id, period_start DESC);

-- ============================================================
-- SELLER SHOPPING MALL (셀러 전용 쇼핑몰)
-- ============================================================

CREATE TABLE stores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE UNIQUE,
  store_name      TEXT NOT NULL,
  subdomain       TEXT NOT NULL UNIQUE,     -- seller-a.sellify.kr
  custom_domain   TEXT UNIQUE,              -- 커스텀 도메인
  logo_url        TEXT,
  theme_config    JSONB DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_subdomain ON stores(subdomain);

CREATE TABLE store_products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  listing_id      UUID NOT NULL REFERENCES product_market_listings(id) ON DELETE CASCADE,
  display_order   INTEGER NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, listing_id)
);

CREATE TABLE carts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,
  buyer_id        UUID,                     -- 회원 구매 시
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'converted', 'abandoned')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_session ON carts(session_id);

CREATE TABLE cart_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  store_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  option_data     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  payment_key     TEXT UNIQUE,              -- 토스페이먼츠 paymentKey
  method          TEXT NOT NULL
                  CHECK (method IN ('card', 'transfer', 'virtual_account', 'phone')),
  amount          INTEGER NOT NULL,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN (
                    'pending', 'approved', 'cancelled',
                    'failed', 'refunded', 'partial_refund'
                  )),
  approved_at     TIMESTAMPTZ,
  raw_response    JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_key ON payments(payment_key);

-- ============================================================
-- CONTENT: 블로그 & SNS 콘텐츠 발행
-- ============================================================

CREATE TABLE content_posts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id             UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  processed_product_id  UUID REFERENCES processed_products(id) ON DELETE SET NULL,
  master_title          TEXT NOT NULL,
  master_body           TEXT NOT NULL,
  master_images         JSONB DEFAULT '[]',
  keywords              JSONB DEFAULT '[]',
  post_status           TEXT NOT NULL DEFAULT 'draft'
                        CHECK (post_status IN (
                          'draft', 'generating', 'ready',
                          'publishing', 'published', 'failed'
                        )),
  scheduled_at          TIMESTAMPTZ,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_seller ON content_posts(seller_id);

CREATE TABLE content_channel_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_post_id UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL
                  CHECK (channel IN (
                    'blog', 'instagram', 'facebook',
                    'threads', 'x'
                  )),
  channel_title   TEXT,
  channel_body    TEXT NOT NULL,
  hashtags        JSONB DEFAULT '[]',
  publish_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (publish_status IN (
                    'pending', 'published', 'failed', 'deleted'
                  )),
  channel_post_id TEXT,                   -- 플랫폼에서 부여한 ID
  channel_url     TEXT,
  published_at    TIMESTAMPTZ,
  error_detail    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(content_post_id, channel)
);

CREATE INDEX idx_ccp_channel ON content_channel_posts(channel, publish_status);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sellers', 'marketplace_credentials',
      'wholesale_products', 'processed_products', 'product_market_listings',
      'inventory_sync_jobs',
      'orders', 'order_items', 'shipments',
      'settlements',
      'stores', 'store_products', 'carts', 'cart_items',
      'payments',
      'content_posts', 'content_channel_posts'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
