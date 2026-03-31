-- Migration 005: JWT 인증용 스키마
-- sellers.password_hash 컬럼 추가 + refresh_tokens 테이블 생성

-- ============================================================
-- sellers 테이블에 password_hash 컬럼 추가
-- ============================================================

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ============================================================
-- Refresh Token 테이블
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- SHA-256 해시 저장 (원본 토큰 비저장)
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_seller_id ON refresh_tokens(seller_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
