import type { PainPoint } from '../types'

export const painPoints: PainPoint[] = [
  {
    icon: 'ClockWarning',
    title: '상품 하나 등록하는 데 40분',
    description: '제목 짓고, 이미지 만들고, 옵션 정리하고... 하루에 몇 개나 올릴 수 있을까요?',
  },
  {
    icon: 'SplitMarket',
    title: '네이버·쿠팡 따로따로 올리기',
    description: '같은 상품인데 마켓마다 규격이 달라서 처음부터 다시 작업해야 합니다.',
  },
  {
    icon: 'OutOfStock',
    title: '재고 0인데 주문이 들어옴',
    description: '품절 확인을 놓쳐서 취소 처리하면 마켓 패널티까지. 악순환의 시작입니다.',
  },
  {
    icon: 'CalculatorConfused',
    title: '정산 끝나면 남는 게 있는 건지',
    description: '수수료, VAT, 반품 공제... 엑셀로 계산해도 정확한 마진을 모르겠습니다.',
  },
]
