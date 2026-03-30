import type { PipelineStep } from '../types'

export const pipelineSteps: PipelineStep[] = [
  {
    number: 1,
    title: '수집',
    items: ['도매꾹', '도매토피아', '트렌드', '키워드'],
    badge: '자동 수집',
  },
  {
    number: 2,
    title: 'AI 가공',
    items: ['AI 제목', '후킹문구', '썸네일', '옵션정리'],
    badge: '4초 완료',
  },
  {
    number: 3,
    title: '등록',
    items: ['네이버', '쿠팡', '내 쇼핑몰', '통합몰'],
    badge: '동시 등록',
  },
  {
    number: 4,
    title: '자동화',
    items: ['재고', '주문', '배송', '정산'],
    badge: '24시간 운영',
  },
  {
    number: 5,
    title: '마케팅',
    items: ['블로그', 'SNS', '유튜브', 'AI 생성'],
    badge: '자동 콘텐츠',
  },
  {
    number: 6,
    title: '분석',
    items: ['키워드', '매출', '마진', '트렌드'],
    badge: '데이터 인사이트',
  },
]
