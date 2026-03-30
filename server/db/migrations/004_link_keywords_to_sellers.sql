-- Migration 004: keywords 테이블의 seller_id를 sellers 테이블에 FK 연결
-- 001에서 sellers 테이블 없이 생성되었으므로 후속 연결

ALTER TABLE keywords
  ADD CONSTRAINT fk_keywords_seller
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE;
