import type { Metric } from '../types'

export const metrics: Metric[] = [
  {
    value: 90,
    suffix: '%',
    label: '등록시간 절감',
    description: '40분 걸리던 등록 → 4분이면 끝',
  },
  {
    value: 0.9,
    prefix: '₩',
    decimal: 1,
    label: 'AI 가공비',
    description: 'AI 제목+후킹+썸네일+옵션 포함',
  },
  {
    value: 24,
    suffix: '시간',
    label: '무중단 자동운영',
    description: '재고·주문·배송 품절 사고 제로',
  },
  {
    value: 100,
    suffix: '%',
    label: '실마진 리포트',
    description: '수수료·원가·광고비 자동 반영',
  },
]
