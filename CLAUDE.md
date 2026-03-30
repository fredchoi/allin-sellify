# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

셀러 올인원 SaaS — 온라인 셀러가 상품 소싱부터 판매, 정산, 마케팅까지 하나의 플랫폼에서 처리하는 통합 운영 시스템. 도매 상품 자동 수집 → AI 가공 → 네이버/쿠팡/셀러 전용 쇼핑몰 동시 등록 → 재고/주문/정산 자동화.

> **"자사몰" 정의**: 셀러가 보유한 기존 쇼핑몰이 아닌, **셀러 올인원이 각 셀러에게 무료로 제공하는 전용 쇼핑몰**. 서브도메인(seller-a.sellify.kr) 또는 커스텀 도메인 지원. 통합몰에서 유입된 트래픽이 각 셀러의 전용 쇼핑몰로 자동 연결됨.

설계 문서: `docs/seller_saas_complete.docx`

## Target Tech Stack (from design doc)

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind (SaaS dashboard) |
| Storefront | Next.js App Router (SSR/ISR, headless commerce) |
| Chrome Extension | MV3 + WASM (collection agent + image processing) |
| Desktop | Tauri v2 + Rust (V2, power user local processing) |
| API Server | Node.js (Fastify) — modular monolith |
| Realtime | WebSocket (order/inventory push) |
| Job Queue | BullMQ + Redis |
| Database | PostgreSQL + TimescaleDB (time-series) + Elasticsearch (keyword search) |
| File Storage | Cloudflare R2 (image CDN) |
| AI | Claude API (Sonnet for titles/hooks, Haiku for option parsing fallback) |
| Crawling | Playwright + Python (wholesale/keyword collection) |
| Image Processing | rembg + Sharp (onnxruntime) |
| Edge | Cloudflare Workers + KV |
| Fallback | AWS Lambda + ECR (rembg container) |
| Korean NLP | Kiwi (Python, MIT) |
| Payments | Toss Payments |

## Architecture — 7 Modules

```
Module 01: 키워드 인텔리전스 — 네이버 API, ES, TimescaleDB (★★★★)
Module 02: 상품 수집 & AI 가공 — Playwright, Claude API, Sharp (★★★★★)
Module 03: 재고 동기화 — BullMQ, Redis, 폴링 (★★★)
Module 04: 주문 & 배송 — 마켓 API, Webhook, 발주 자동화 (★★★★)
Module 05: 정산 & 세무 — 마켓 정산 API, 손익 집계 (★★)
셀러 쇼핑몰: Headless Commerce — Next.js SSR, 토스페이먼츠 (★★★★)
블로그·SNS: 콘텐츠 발행 허브 — Claude API, Meta/X API (★★★)
```

## Core Data Flow

```
도매 수집 → AI 가공(제목/후킹/썸네일/옵션) → 멀티마켓 등록
     → 재고 동기화 → 주문 수집 → 도매 발주 → 배송 → 정산
     → 블로그/SNS 자동 발행
```

## Critical 3-Layer Product Data Structure

```
wholesale_products    (도매 원본)
    ↓
processed_products    (AI 가공본 — 셀러별)
    ↓
product_market_listings (마켓 등록본 — 마켓별)
```

이 3계층이 무너지면 재고/주문/정산이 모두 꼬임. processed_products.processing_checkpoints (JSONB)로 STEP별 독립 체크포인트 관리.

## Key Business Rules

- **도매 어댑터 패턴**: 모든 도매처를 WholesaleAdapter 인터페이스로 추상화. 업체 추가 시 어댑터만 구현
- **상품 핑거프린팅**: 상품명 형태소 분석 + 대표 이미지 perceptual hash, 코사인 유사도 > 0.85 = 중복
- **키워드 스코어링**: OPP_score = SV(0.35) + CGI(0.45) + TM(0.20). CGI가 가장 중요(수익성 직결)
- **재고 Tier 폴링**: Tier 1(재고 5개 이하) 10분, Tier 2(판매중) 30분, Tier 3(유휴) 6시간
- **주문 중복 방지**: DB UNIQUE(market, market_order_id) + Redis Lock(NX) 이중 방어
- **마진 계산**: 도매원가는 order_items.wholesale_price 스냅샷 사용 (현재 도매가 참조 X)
- **수수료 이력**: market_fee_rules.effective_from으로 주문 시점 수수료율 적용
- **이미지 처리 라우팅**: 로컬 에이전트 ONLINE → R2/KV Job Queue, OFFLINE → SQS → Lambda

## Supported Channels

- **판매**: 네이버 스마트스토어, 쿠팡 Wing, 셀러 전용 쇼핑몰(플랫폼 제공)
- **콘텐츠**: 자사 블로그, 페이스북, 인스타그램, 쓰레드, X
- **도매**: 도매꾹(API), 도매토피아(API), 오너클랜(크롤링)

## AI Content Generation (1 API call → all channels)

```
Master Content → Channel Transformer
  ├─ 블로그:    SEO 제목 + 마크다운 1000자
  ├─ 인스타그램: 감성 캡션 200자 + 해시태그
  ├─ 페이스북:  정보 중심 300자
  ├─ 쓰레드:   임팩트 150자
  └─ X:         핵심 220자 이내
```

## Development Roadmap (Vibe Coding, 24 weeks total)

| Phase | Period | Scope |
|-------|--------|-------|
| MVP | W1-W4 | 네이버 단일 + 도매꾹 1개 end-to-end |
| V1.0 | W5-W10 | 쿠팡 추가 + 크롬 익스텐션 + 구독 결제 |
| V1.5 | W11-W18 | 익스텐션 V2 + 자사몰 + 블로그 + SNS(쓰레드/X) |
| V2.0 | W19-W24 | Meta SNS + Tauri 앱 + 데이터 피드백 루프 + 통합몰 |

## MVP Scope (Phase 1)

- 마켓: 네이버 스마트스토어 단일
- 도매: 도매꾹 API 1개소
- AI 가공: 제목 + 후킹문구 + 썸네일(1장) + 옵션 정리
- 이미지: Remove.bg API → Lambda 전환 설계
- 재고: 도매꾹 API 폴링 30분
- 주문: 5분 폴링 + 발주서 생성 + 송장 수동 업로드
- 키워드: 네이버 광고 API + DataLab + 기본 스코어링
- 제외: 상세페이지 AI 생성, 쿠팡, 자사몰, 블로그, SNS, 익스텐션

## External Dependencies & Lead Times

- 네이버 광고 API: 계정당 일 1,000건 제한 → MVP에 3-5개 계정 필요
- Meta App Review: 2-4주 (FB/IG 발행에 필수)
- 토스페이먼츠 PG 심사: 실질 2주 (자사몰 포함 시 즉시 신청)
- Chrome Web Store 심사: 3-5일
- 도매꾹/도매토피아 파트너 API 제휴: 1-2주

## Conventions

- Korean UI/UX (Pretendard font stack)
- Adapter pattern for all external integrations (wholesale, marketplace, channel)
- JSONB for flexible data (credentials, routing rules, metadata, processing checkpoints)
- AES-256 encryption for stored tokens/credentials
- Presigned URL for agent image uploads (5분 유효, 특정 경로만 쓰기 허용)
