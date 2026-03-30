import { useState, useEffect } from 'react'
import { Menu, X } from '../icons'
import { Container } from '../ui/Container'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { Logo } from '../common/Logo'

const navItems = [
  { label: '기능', href: '#features' },
  { label: '요금제', href: '#pricing' },
  { label: '고객후기', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'bg-white/95 shadow-sm backdrop-blur-sm'
          : 'bg-transparent'
      )}
    >
      <Container>
        <nav className="flex h-16 items-center justify-between lg:h-20">
          <a href="#" className="flex items-center" aria-label="Sellify 홈">
            <Logo height={32} />
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" href="#login">
              로그인
            </Button>
            <Button size="sm" href="#pricing">
              얼리버드 신청 →
            </Button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-600"
            aria-label="메뉴"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>
      </Container>

      {menuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-white md:hidden">
          <Container className="flex flex-col gap-4 pt-8">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-lg font-medium text-slate-700 border-b border-slate-100"
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              <Button variant="secondary" fullWidth href="#login">
                로그인
              </Button>
              <Button fullWidth href="#pricing">
                얼리버드 신청하기 →
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
