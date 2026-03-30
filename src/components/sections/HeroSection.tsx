import { useState, useEffect } from 'react'
import { Container } from '../ui/Container'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X } from '../icons'

export function HeroSection() {
  const [videoOpen, setVideoOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = videoOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [videoOpen])

  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent" />

      <Container className="relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-600 ring-1 ring-orange-200">
            🔥 얼리버드 100명 한정 — 현재 73명 참여 중
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-tight">
            상품 찾고, 올리고, 홍보까지 —
            <br />
            <span className="text-primary">AI가 다 해줍니다.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 lg:text-xl">
            위탁판매 셀러의 하루 8시간 수작업을 단 몇 번의 클릭으로 끝내세요.
            <br className="hidden sm:block" />
            도매 소싱부터 스마트스토어·쿠팡 등록, 인스타그램 콘텐츠까지 완전 자동화.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" href="#pricing" className="bg-orange-500 hover:bg-orange-600 text-white">
              얼리버드 40% 할인으로 시작하기 →
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setVideoOpen(true)}>
              <Play className="mr-2 h-4 w-4" />
              3분 데모 영상 보기
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Badge withCheck variant="success">설정 없이 3분 만에 시작</Badge>
            <Badge withCheck variant="success">신용카드 불필요</Badge>
            <Badge withCheck variant="success">베타 참여자 327명 대기 중</Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <img
              src="/images/hero-dashboard.png"
              alt="allin-sellify 대시보드"
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </Container>

      {/* 영상 모달 */}
      <AnimatePresence>
        {videoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setVideoOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-5xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setVideoOpen(false)}
                className="absolute -top-12 right-0 flex items-center gap-2 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <span className="text-sm">닫기</span>
                <X className="h-6 w-6" />
              </button>
              <div className="overflow-hidden rounded-xl bg-black shadow-2xl">
                <video
                  src="/demo.mp4"
                  controls
                  autoPlay
                  className="w-full h-auto"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
