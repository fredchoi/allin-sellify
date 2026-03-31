import { useState, useEffect, useCallback } from 'react'
import {
  useContentPosts,
  useContentPostDetail,
  useCreateContent,
  usePublishContent,
  type ContentPost,
  type ChannelPost,
  type Channel,
  type PostStatus,
} from '../hooks/useContentApi'

// Demo seller ID (실제 환경에서는 인증 컨텍스트에서 주입)
const DEMO_SELLER_ID = '00000000-0000-0000-0000-000000000001'

const CHANNEL_META: Record<Channel, { label: string; icon: string; color: string; maxLen: number }> = {
  blog:      { label: '블로그',      icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700',     maxLen: 1000 },
  instagram: { label: '인스타그램',  icon: '📸', color: 'bg-pink-50 border-pink-200 text-pink-700',     maxLen: 200  },
  facebook:  { label: '페이스북',    icon: '👥', color: 'bg-indigo-50 border-indigo-200 text-indigo-700', maxLen: 300 },
  threads:   { label: '쓰레드',      icon: '🧵', color: 'bg-slate-50 border-slate-300 text-slate-700',  maxLen: 150  },
  x:         { label: 'X',           icon: '𝕏',  color: 'bg-gray-50 border-gray-300 text-gray-700',    maxLen: 220  },
}

const STATUS_MAP: Record<PostStatus, { label: string; className: string }> = {
  draft:      { label: '초안',    className: 'bg-slate-100 text-slate-500 border-slate-200' },
  generating: { label: '생성중', className: 'bg-blue-50 text-blue-600 border-blue-200 animate-pulse' },
  ready:      { label: '발행준비', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  publishing: { label: '발행중', className: 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' },
  published:  { label: '발행완료', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  failed:     { label: '실패',    className: 'bg-red-50 text-red-600 border-red-200' },
}

// ── 상태 뱃지 ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex items-center text-xs px-1.5 py-0.5 rounded border font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

// ── 채널 카드 ────────────────────────────────────────────────────────────────

function ChannelCard({
  cp,
  selected,
  onToggle,
}: {
  cp: ChannelPost
  selected: boolean
  onToggle: () => void
}) {
  const meta = CHANNEL_META[cp.channel as Channel]
  const publishStatusColor =
    cp.publish_status === 'published' ? 'text-emerald-600' :
    cp.publish_status === 'failed'    ? 'text-red-500' :
    'text-slate-400'

  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-blue-400 ' + meta.color : 'border-slate-100 hover:border-slate-200 bg-white'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${publishStatusColor}`}>
            {cp.publish_status === 'published' ? '발행됨' :
             cp.publish_status === 'failed'    ? '실패' : '대기중'}
          </span>
          {cp.publish_status !== 'published' && (
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-500"
              checked={selected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>

      {cp.channel_title && (
        <p className="text-xs font-semibold text-slate-700 mb-1 truncate">{cp.channel_title}</p>
      )}
      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{cp.channel_body}</p>

      {cp.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {cp.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-xs text-blue-500">#{tag}</span>
          ))}
          {cp.hashtags.length > 5 && (
            <span className="text-xs text-slate-400">+{cp.hashtags.length - 5}</span>
          )}
        </div>
      )}

      {cp.channel_url && (
        <a
          href={cp.channel_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline mt-1 inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          발행된 게시글 보기 →
        </a>
      )}
    </div>
  )
}

// ── 콘텐츠 상세 패널 ─────────────────────────────────────────────────────────

function DetailPanel({
  post,
  onClose,
  onPublished,
}: {
  post: ContentPost
  onClose: () => void
  onPublished: () => void
}) {
  const { fetchDetail, post: detail } = useContentPostDetail()
  const { publish, loading: publishLoading, error: publishError } = usePublishContent()
  const [selectedChannels, setSelectedChannels] = useState<Set<Channel>>(new Set())
  const [publishResult, setPublishResult] = useState<{ published: number; failed: number } | null>(null)

  useEffect(() => {
    fetchDetail(post.id)
  }, [post.id, fetchDetail])

  // 생성중인 경우 폴링
  useEffect(() => {
    if (detail?.post_status !== 'generating') return
    const timer = setInterval(() => fetchDetail(post.id), 2000)
    return () => clearInterval(timer)
  }, [detail?.post_status, post.id, fetchDetail])

  const toggleChannel = useCallback((ch: Channel) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch)
      else next.add(ch)
      return next
    })
  }, [])

  const handlePublish = async () => {
    if (selectedChannels.size === 0) return
    const result = await publish(post.id, Array.from(selectedChannels))
    if (result) {
      setPublishResult(result)
      setSelectedChannels(new Set())
      onPublished()
      setTimeout(() => fetchDetail(post.id), 500)
    }
  }

  const current = detail ?? post

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={current.post_status as PostStatus} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-2">{current.master_title}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 마스터 본문 */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">마스터 본문</p>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{current.master_body}</p>
        </div>

        {/* 키워드 */}
        {current.keywords.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">키워드</p>
            <div className="flex flex-wrap gap-1">
              {current.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 채널별 콘텐츠 */}
        {current.post_status === 'generating' ? (
          <div className="text-center py-8 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Claude AI가 채널별 콘텐츠를 생성 중입니다...</p>
          </div>
        ) : current.channelPosts && current.channelPosts.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">채널별 콘텐츠</p>
            <div className="space-y-2">
              {current.channelPosts.map((cp) => (
                <ChannelCard
                  key={cp.channel}
                  cp={cp}
                  selected={selectedChannels.has(cp.channel as Channel)}
                  onToggle={() => toggleChannel(cp.channel as Channel)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 발행 액션 */}
      {current.post_status === 'ready' && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
          {publishResult && (
            <p className="text-xs text-emerald-600">
              발행 완료 {publishResult.published}건 / 실패 {publishResult.failed}건
            </p>
          )}
          {publishError && (
            <p className="text-xs text-red-500">{publishError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedChannels(
                new Set((current.channelPosts ?? [])
                  .filter(cp => cp.publish_status !== 'published')
                  .map(cp => cp.channel as Channel))
              )}
              className="text-xs text-blue-500 hover:underline"
            >
              전체 선택
            </button>
            <span className="text-slate-300 text-xs">|</span>
            <button
              onClick={() => setSelectedChannels(new Set())}
              className="text-xs text-slate-400 hover:underline"
            >
              해제
            </button>
            <div className="flex-1" />
            <button
              onClick={handlePublish}
              disabled={selectedChannels.size === 0 || publishLoading}
              className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors font-medium"
            >
              {publishLoading
                ? '발행 중...'
                : `${selectedChannels.size}개 채널 발행`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 콘텐츠 목록 카드 ─────────────────────────────────────────────────────────

function PostCard({
  post,
  onSelect,
  selected,
}: {
  post: ContentPost
  onSelect: (p: ContentPost) => void
  selected: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
        selected
          ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-200'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
      onClick={() => onSelect(post)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-slate-800 line-clamp-1 flex-1">{post.master_title}</p>
        <StatusBadge status={post.post_status as PostStatus} />
      </div>
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{post.master_body}</p>
      {post.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {post.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
              {kw}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">
        {new Date(post.created_at).toLocaleDateString('ko-KR', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  )
}

// ── 새 콘텐츠 폼 ─────────────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { create, loading, error } = useCreateContent()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !keywords.includes(kw)) {
      setKeywords((prev) => [...prev, kw])
    }
    setKeywordInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await create({
      sellerId: DEMO_SELLER_ID,
      masterTitle: title,
      masterBody: body,
      keywords,
    })
    if (id) {
      setTitle('')
      setBody('')
      setKeywords([])
      onCreated()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">새 콘텐츠 생성</h2>

      <div>
        <label className="text-xs text-slate-500 font-medium">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="콘텐츠 제목을 입력하세요"
          required
          className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 font-medium">본문 (마스터)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="홍보할 상품이나 서비스에 대한 내용을 입력하세요"
          required
          rows={4}
          className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-slate-500 font-medium">키워드</label>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
            placeholder="키워드 입력 후 Enter"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            추가
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => setKeywords((prev) => prev.filter((k) => k !== kw))}
                  className="text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !title || !body}
        className="w-full text-sm py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors font-medium"
      >
        {loading ? 'AI 생성 중...' : '✨ Claude AI로 채널별 콘텐츠 생성'}
      </button>
      <p className="text-xs text-slate-400 text-center">
        블로그 · 인스타 · 페이스북 · 쓰레드 · X — 1번의 AI 호출로 5개 채널 동시 변환
      </p>
    </form>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────

export function ContentDashboard() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<PostStatus | ''>('')
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { posts, total, loading, refetch } = useContentPosts({
    sellerId: DEMO_SELLER_ID,
    postStatus: filterStatus || undefined,
    page,
    pageSize: 20,
  })

  useEffect(() => {
    refetch()
  }, [refetch])

  // 생성중인 포스트가 있으면 폴링
  useEffect(() => {
    const hasGenerating = posts.some(
      (p) => p.post_status === 'generating' || p.post_status === 'publishing'
    )
    if (!hasGenerating) return
    const timer = setInterval(refetch, 3000)
    return () => clearInterval(timer)
  }, [posts, refetch])

  const handleCreated = () => {
    setShowCreateForm(false)
    setTimeout(refetch, 500)
  }

  const PAGE_SIZE = 20

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 h-14 flex items-center px-4 lg:px-6">
        <a href="/" className="text-lg font-bold text-slate-800 tracking-tight mr-6">
          allin<span className="text-blue-600">·</span>sellify
        </a>
        <nav className="flex items-center gap-1 text-sm">
          <a href="/dashboard/keywords" className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            키워드
          </a>
          <a href="/dashboard/products" className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            상품
          </a>
          <a href="/dashboard/settlements" className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            정산
          </a>
          <a href="/dashboard/content" className="px-3 py-1.5 text-blue-600 font-medium bg-blue-50 rounded-lg">
            콘텐츠
          </a>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* 페이지 타이틀 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">블로그·SNS 콘텐츠 허브</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Claude AI로 마스터 콘텐츠를 5개 채널용으로 자동 변환
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-1.5"
          >
            <span>+</span>
            <span>새 콘텐츠</span>
          </button>
        </div>

        {/* 채널 안내 */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {(Object.entries(CHANNEL_META) as [Channel, typeof CHANNEL_META[Channel]][]).map(([ch, meta]) => (
            <div key={ch} className={`rounded-xl border p-3 text-center ${meta.color}`}>
              <div className="text-xl mb-1">{meta.icon}</div>
              <div className="text-xs font-semibold">{meta.label}</div>
              <div className="text-xs opacity-70">{meta.maxLen}자</div>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-[1fr_400px] gap-6">
          {/* 왼쪽: 목록 */}
          <div className="space-y-4">
            {/* 생성 폼 */}
            {showCreateForm && <CreateForm onCreated={handleCreated} />}

            {/* 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">상태:</span>
              {(['', 'draft', 'generating', 'ready', 'publishing', 'published', 'failed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setPage(1) }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterStatus === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s === '' ? '전체' : STATUS_MAP[s]?.label ?? s}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400">총 {total}건</span>
            </div>

            {/* 목록 */}
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">로딩 중...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">콘텐츠가 없습니다.</p>
                <p className="text-xs mt-1">위 '새 콘텐츠' 버튼을 눌러 시작해보세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onSelect={setSelectedPost}
                    selected={selectedPost?.id === p.id}
                  />
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {total > PAGE_SIZE && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  이전
                </button>
                <span className="text-xs text-slate-500 px-2 py-1.5">
                  {page} / {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * PAGE_SIZE >= total}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}
          </div>

          {/* 오른쪽: 상세 패널 */}
          <div className="xl:sticky xl:top-[calc(3.5rem+1.5rem)] xl:self-start" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
            {selectedPost ? (
              <DetailPanel
                post={selectedPost}
                onClose={() => setSelectedPost(null)}
                onPublished={refetch}
              />
            ) : (
              <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-300">
                <div className="text-4xl mb-3">✍️</div>
                <p className="text-sm">콘텐츠를 선택하면<br />채널별 미리보기가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
