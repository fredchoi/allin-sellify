import { Container } from '../ui/Container'
import { LogoWhite } from '../common/Logo'

const columns = [
  {
    title: '서비스',
    links: ['기능 소개', '요금제', '업데이트 노트'],
  },
  {
    title: '회사',
    links: ['회사 소개', '채용', '블로그'],
  },
  {
    title: '법적 고지',
    links: ['이용약관', '개인정보처리방침', '환불 정책'],
  },
  {
    title: '고객 지원',
    links: ['help@sellify.kr', '카카오톡 채널', '운영시간 10-18'],
  },
]

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <LogoWhite height={32} />
            <p className="mt-3 text-sm leading-relaxed">
              상품 소싱부터 정산까지,
              <br />
              AI가 전부 해드립니다.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-white">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 text-xs">
          <p>&copy; 2026 Sellify. All rights reserved.</p>
          <p className="mt-1">
            사업자등록번호: XXX-XX-XXXXX | 통신판매업신고:
            제XXXX-서울XX-XXXX호
          </p>
        </div>
      </Container>
    </footer>
  )
}
