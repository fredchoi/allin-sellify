import type { ComparisonRow } from '../types'

export const comparisons: ComparisonRow[] = [
  {
    label: '상품 찾기',
    before: '도매사이트 돌아다니며 상품 찾기 (1시간)',
    after: '트렌드 상품 자동 추천 (실시간 알림)',
  },
  {
    label: '상품 가공',
    before: '제목·이미지 수동 제작 (40분/상품)',
    after: 'AI 자동 가공 (4초)',
  },
  {
    label: '마켓 등록',
    before: '네이버·쿠팡 각각 등록 (각 20분)',
    after: '원클릭 동시 등록 + 내 쇼핑몰 자동 개설',
  },
  {
    label: '재고 관리',
    before: '재고 수동 확인 (품절 사고 위험)',
    after: '자동 동기화 + 비노출',
  },
  {
    label: '손익 파악',
    before: '엑셀로 손익 계산 (월말에 모아서)',
    after: '실시간 마진 자동 집계',
  },
  {
    label: '마케팅',
    before: '블로그·SNS·영상 별도 작성 (시간 없어서 안 함)',
    after: 'AI 생성 + 유튜브 쇼츠/롱폼 + 예약 발행',
  },
]

export const summary = {
  before: { daily: '하루 상품 처리: 5-8개', scale: '월 매출: 본인 한계' },
  after: { daily: '하루 상품 처리: 30+개', scale: '월 매출: 스케일 가능' },
}
