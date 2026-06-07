'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSessionId } from '@/lib/session'
import HighlightPopup from './HighlightPopup'
import SettingsPanel from './SettingsPanel'
import SearchModal from './SearchModal'
import { loadSettings, THEMES, WIDTH_MAP, type ReaderSettings } from '@/lib/readerSettings'
import PageView from './PageView'
import WelcomeModal from './WelcomeModal'
import AuthModal from './AuthModal'

interface Sentence {
  id: string
  content: string
  order_index: number
  paragraph_index: number | null
  is_html?: boolean
}

interface Chapter {
  id: string
  slug: string
  title: string
  order_index: number
  level?: number
}

interface Book {
  id: string
  slug: string
  title: string
}

interface Props {
  book: Book
  chapter: Chapter
  sentences: Sentence[]
  allChapters: Chapter[]
  initialHighlightCounts: Record<string, number>
}

interface PopupState {
  sentenceId: string
  content: string
  x: number
  y: number
}

// 로드된 챕터 단위
interface LoadedChapter {
  chapter: Chapter
  sentences: Sentence[]
}

function groupByParagraph(sentences: Sentence[]): Sentence[][] {
  if (!sentences.length) return []
  const groups: Sentence[][] = []
  let current: Sentence[] = []
  let lastPara = sentences[0].paragraph_index ?? 0
  for (const s of sentences) {
    const para = s.paragraph_index ?? 0
    if (para !== lastPara) {
      if (current.length) groups.push(current)
      current = []
      lastPara = para
    }
    current.push(s)
  }
  if (current.length) groups.push(current)
  return groups
}

function highlightColor(count: number, theme: 'light' | 'sepia' | 'dark'): string {
  if (theme === 'dark') {
    // 다크: 노란색 계열이 배경에 묻히므로 금빛/호박색 계열 사용
    if (count >= 15) return 'rgba(251,191,36,0.55)'   // amber-400 진하게
    if (count >= 5)  return 'rgba(251,191,36,0.38)'
    if (count >= 1)  return 'rgba(251,191,36,0.22)'
    return 'transparent'
  }
  if (theme === 'sepia') {
    // 세피아: 따뜻한 황색 계열
    if (count >= 15) return 'rgba(245,158,11,0.45)'
    if (count >= 5)  return 'rgba(245,158,11,0.28)'
    if (count >= 1)  return 'rgba(245,158,11,0.16)'
    return 'transparent'
  }
  // light
  if (count >= 15) return '#FFEE58'
  if (count >= 5)  return '#FFF176'
  if (count >= 1)  return '#FFF9C4'
  return 'transparent'
}

export default function ReaderClient({
  book, chapter, sentences, allChapters, initialHighlightCounts,
}: Props) {
  const [highlightCounts, setHighlightCounts] = useState(initialHighlightCounts)
  const [myHighlights, setMyHighlights] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [resumeToast, setResumeToast] = useState(false)
  const [reader, setReader] = useState<{ id: string; nickname: string } | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingSentenceId, setPendingSentenceId] = useState<string | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings)
  const resumeSentenceId = useRef<string | null>(null)

  // 페이지 뷰 전용: 이어서 로드된 챕터 목록
  const [loadedChapters, setLoadedChapters] = useState<LoadedChapter[]>([
    { chapter, sentences },
  ])
  // 현재 마지막으로 로드된 챕터의 order_index
  const lastLoadedOrderRef = useRef(chapter.order_index)
  // 로드 중 여부 (중복 방지)
  const loadingRef = useRef(false)

  const router = useRouter()
  const supabase = createClient()

  // 로그인 상태 확인
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: r } = await supabase
        .from('readers')
        .select('nickname')
        .eq('id', user.id)
        .single()
      setReader({ id: user.id, nickname: r?.nickname ?? '독자' })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 페이지 뷰 모드일 때 브라우저 스크롤 차단
  useEffect(() => {
    if (settings.viewMode === 'page') {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [settings.viewMode])

  // 내 하이라이트 초기 로드 (로그인 상태일 때만)
  useEffect(() => {
    if (!reader) return
    const sentenceIds = sentences.map(s => s.id)
    if (!sentenceIds.length) return
    supabase
      .from('highlights')
      .select('sentence_id')
      .eq('session_id', reader.id)
      .in('sentence_id', sentenceIds)
      .then(({ data }) => {
        if (data) setMyHighlights(new Set(data.map(h => h.sentence_id)))
      })
  }, [chapter.id, reader?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 이어읽기 저장
  useEffect(() => {
    const saved = localStorage.getItem(`reading_progress_${book.slug}`)
    if (!saved) return
    try {
      const { chapterSlug, sentenceId } = JSON.parse(saved)
      if (chapterSlug === chapter.slug && sentenceId) {
        resumeSentenceId.current = sentenceId
        setResumeToast(true)
      }
    } catch {}
  }, [book.slug, chapter.slug])

  useEffect(() => {
    const handler = () => {
      const els = document.querySelectorAll('[data-sentence-id]')
      let lastVisible: string | null = null
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.6) lastVisible = el.getAttribute('data-sentence-id')
      }
      if (lastVisible) {
        localStorage.setItem(
          `reading_progress_${book.slug}`,
          JSON.stringify({ chapterSlug: chapter.slug, sentenceId: lastVisible })
        )
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [book.slug, chapter.slug])

  function scrollToSentence(sentenceId: string) {
    document.querySelector(`[data-sentence-id="${sentenceId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setResumeToast(false)
  }

  // 다음 챕터를 동적으로 이어 붙이기 (페이지 뷰 전용)
  const loadNextChapter = useCallback(async () => {
    if (loadingRef.current) return
    const nextOrderIndex = lastLoadedOrderRef.current + 1
    const nextChap = allChapters.find(c => c.order_index === nextOrderIndex)
    if (!nextChap) return  // 마지막 챕터

    loadingRef.current = true
    try {
      // 문장 가져오기
      const { data: newSentences } = await supabase
        .from('sentences')
        .select('id, content, order_index, paragraph_index, is_html')
        .eq('chapter_id', nextChap.id)
        .order('order_index')

      // 빈 챕터(장 구분자 등)는 제목만 추가하고 다음 챕터로 계속 진행
      if (!newSentences?.length) {
        setLoadedChapters(prev => [...prev, { chapter: nextChap, sentences: [] }])
        lastLoadedOrderRef.current = nextOrderIndex
        // finally에서 loadingRef=false 처리 후 다음 챕터 로드
        setTimeout(() => loadNextChapter(), 0)
        return
      }

      // 하이라이트 카운트 가져오기
      const ids = newSentences.map(s => s.id)
      const { data: hlData } = await supabase
        .from('highlights')
        .select('sentence_id')
        .in('sentence_id', ids)
      const newCounts: Record<string, number> = {}
      for (const h of hlData ?? []) {
        newCounts[h.sentence_id] = (newCounts[h.sentence_id] ?? 0) + 1
      }

      // 내 하이라이트 가져오기 (로그인 상태일 때만)
      const { data: myHlData } = reader ? await supabase
        .from('highlights')
        .select('sentence_id')
        .eq('session_id', reader.id)
        .in('sentence_id', ids) : { data: [] }
      const myNew = new Set((myHlData ?? []).map(h => h.sentence_id))

      // 상태 업데이트
      setLoadedChapters(prev => [...prev, { chapter: nextChap, sentences: newSentences }])
      setHighlightCounts(prev => ({ ...prev, ...newCounts }))
      setMyHighlights(prev => new Set([...prev, ...myNew]))
      lastLoadedOrderRef.current = nextOrderIndex
    } finally {
      loadingRef.current = false
    }
  }, [allChapters, sessionId])

  // 페이지뷰 모드: 마운트 즉시 다음 챕터 백그라운드 프리로드
  useEffect(() => {
    if (settings.viewMode !== 'page') return
    const lastOrderIndex = allChapters[allChapters.length - 1]?.order_index ?? 0
    if (lastLoadedOrderRef.current < lastOrderIndex) {
      loadNextChapter()
    }
  }, [settings.viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSentenceClick = useCallback((sentence: Sentence, e: React.MouseEvent) => {
    // 로그인 안 된 경우 → 가입 모달
    if (!reader) {
      setPendingSentenceId(sentence.id)
      setShowAuthModal(true)
      return
    }
    const isHighlighted = myHighlights.has(sentence.id)
    const x = e.clientX
    const y = e.clientY

    if (isHighlighted) {
      setPopup({ sentenceId: sentence.id, content: sentence.content, x, y })
    } else {
      toggleHighlight(sentence.id)
      setPopup({ sentenceId: sentence.id, content: sentence.content, x, y })
    }
  }, [myHighlights, highlightCounts, showAll, reader])

  const toggleHighlight = useCallback(async (sentenceId: string) => {
    if (!reader) return
    const isHighlighted = myHighlights.has(sentenceId)
    setMyHighlights(prev => {
      const next = new Set(prev)
      isHighlighted ? next.delete(sentenceId) : next.add(sentenceId)
      return next
    })
    setHighlightCounts(prev => ({
      ...prev,
      [sentenceId]: Math.max(0, (prev[sentenceId] ?? 0) + (isHighlighted ? -1 : 1)),
    }))
    if (isHighlighted) {
      await supabase.from('highlights').delete()
        .eq('sentence_id', sentenceId).eq('session_id', reader.id)
    } else {
      await supabase.from('highlights').insert({
        sentence_id: sentenceId, book_id: book.id, session_id: reader.id,
      })
    }
  }, [myHighlights, book.id, reader])

  // 한 챕터의 문장을 렌더링
  function renderSentencesFor(sents: Sentence[]) {
    return groupByParagraph(sents).map((para, pi) => {
      if (para.length === 1 && para[0].is_html) {
        const s = para[0]
        return (
          <div
            key={s.id}
            data-sentence-id={s.id}
            className="reader-content my-6 overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: s.content }}
          />
        )
      }
      return (
        <p key={`${sents[0]?.id}-p${pi}`} className="mb-6">
          {para.map(sentence => {
            const count = highlightCounts[sentence.id] ?? 0
            const isHighlighted = myHighlights.has(sentence.id)
            const bgColor = isHighlighted
              ? highlightColor(Math.max(count, 1), settings.theme)
              : showAll ? highlightColor(count, settings.theme) : 'transparent'
            return (
              <span
                key={sentence.id}
                data-sentence-id={sentence.id}
                role="button"
                tabIndex={0}
                aria-pressed={isHighlighted}
                onClick={e => handleSentenceClick(sentence, e)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') toggleHighlight(sentence.id)
                  if (e.key === 'Escape') setPopup(null)
                }}
                className="cursor-pointer rounded px-0.5 transition-colors duration-200 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                style={{ backgroundColor: bgColor }}
              >
                {sentence.content}{' '}
              </span>
            )
          })}
        </p>
      )
    })
  }

  // 절 제목 렌더링 (level에 따라 크기 다르게)
  function renderChapterTitle(ch: Chapter, textColor: string) {
    const isSection = (ch.level ?? 1) > 1  // level 2 = 절
    if (isSection) {
      // 절: 라벨 없이 큰 제목만
      return (
        <div className="mt-16 mb-8 pb-4 border-b" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
          <h3 className="font-semibold leading-snug" style={{ fontSize: '1.75rem', color: textColor }}>
            {ch.title}
          </h3>
        </div>
      )
    }
    // 장: 라벨 없이 굵고 크게
    return (
      <div className="mt-20 mb-10 pb-6 border-b-2" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
        <h2 className="font-bold leading-snug" style={{ fontSize: '2.25rem', color: textColor }}>
          {ch.title}
        </h2>
      </div>
    )
  }

  // 전체 이어지는 콘텐츠 (페이지 뷰용)
  function renderAllContent(textColor: string) {
    return loadedChapters.map(({ chapter: ch, sentences: sents }, idx) => (
      <div key={ch.id}>
        {renderChapterTitle(ch, textColor)}
        {renderSentencesFor(sents)}
        {/* 마지막 로드 챕터이고 다음이 있으면 로딩 트리거 */}
        {idx === loadedChapters.length - 1 && null}
      </div>
    ))
  }

  const prevChapter = allChapters.find(c => c.order_index === chapter.order_index - 1)
  const nextChapterMeta = allChapters.find(c => c.order_index === chapter.order_index + 1)
  const theme = THEMES[settings.theme]
  const brightnessOverlay = 1 - settings.brightness / 100
  const fontStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    letterSpacing: `${settings.letterSpacing}px`,
    fontFamily: settings.fontFamily === 'serif'
      ? '"Noto Serif KR", "나눔명조", Georgia, serif'
      : '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif',
    color: theme.text,
  }

  const isPageMode = settings.viewMode === 'page'

  return (
    <div
      className="relative"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        // 페이지 뷰: 뷰포트에 완전히 고정 (스크롤 불가)
        // 스크롤 뷰: 자연스러운 문서 흐름
        ...(isPageMode
          ? { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }
          : { minHeight: '100vh' }
        ),
      }}
    >
      <WelcomeModal />
      {brightnessOverlay > 0 && (
        <div className="fixed inset-0 z-50 pointer-events-none"
          style={{ background: `rgba(0,0,0,${brightnessOverlay.toFixed(2)})` }} />
      )}

      {/* 헤더 */}
      <header
        className="z-10 border-b px-4 h-12 flex items-center justify-between shrink-0"
        style={{ backgroundColor: theme.bg, borderColor: settings.theme === 'dark' ? '#333' : '#f3f4f6' }}
      >
        <Link
          href={`/books/${book.slug}`}
          className="text-sm truncate max-w-[35%] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: theme.text }}
        >
          {book.title}
        </Link>

        <div className="flex items-center gap-3 relative">
          {/* 로그인 상태 표시 */}
          {reader ? (
            <span className="text-xs opacity-50" style={{ color: theme.text }}>
              {reader.nickname}
            </span>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs px-2.5 py-1 rounded-full border border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors"
            >
              로그인
            </button>
          )}
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              showAll
                ? 'bg-amber-400 border-amber-400 text-white'
                : 'border-gray-200 opacity-60 hover:opacity-100'
            }`}
            style={{ color: showAll ? 'white' : theme.text }}
            title={showAll ? '내 하이라이트만 보기' : '모든 하이라이트 보기'}
          >
            👥 {showAll ? '전체' : '나만'}
          </button>
          <Link
            href={`/books/${book.slug}/mine`}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.text }} title="내 기록 보기"
          >📌</Link>
          <button onClick={() => setSearchOpen(true)}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.text }} aria-label="검색">🔍</button>
          <button onClick={() => setTocOpen(v => !v)}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.text }}>목차 ▾</button>
          <button onClick={() => setSettingsOpen(v => !v)}
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: theme.text }} aria-label="읽기 설정">⚙</button>
          {settingsOpen && (
            <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
          )}
        </div>
      </header>

      {/* 목차 드롭다운 */}
      {tocOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setTocOpen(false)}>
          <div className="absolute top-12 right-4 bg-white border border-gray-200 rounded-xl shadow-lg py-2 w-64 max-h-80 overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {allChapters.map(c => {
              const isSection = (c.level ?? 1) > 1
              const isActive = c.id === chapter.id
              return (
                <Link key={c.id} href={`/books/${book.slug}/${c.slug}`}
                  onClick={() => setTocOpen(false)}
                  className={`block transition-colors hover:bg-gray-50 ${
                    isSection
                      ? 'px-7 py-1.5 text-xs'   // 절: 들여쓰기
                      : 'px-4 py-2 text-sm font-semibold mt-1' // 장: 굵게
                  } ${isActive ? 'text-amber-600' : isSection ? 'text-gray-400' : 'text-gray-700'}`}>
                  {isSection && <span className="mr-1 text-gray-300">└</span>}
                  {c.title}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 본문 */}
      {settings.viewMode === 'page' ? (
        /* ── 페이지 뷰: flex-1로 헤더 제외 나머지 영역 꽉 채움 ── */
        <div className="flex-1 min-h-0">
          <PageView
            spread={settings.pageSpread}
            bgColor={theme.bg}
            chapterIndex={chapter.order_index}
            totalChapters={allChapters.length}
            onNextChapter={loadNextChapter}
            hasNextChapter={lastLoadedOrderRef.current < (allChapters[allChapters.length - 1]?.order_index ?? 0)}
          >
            <div className="reader-content px-10" style={fontStyle}>
              {renderAllContent(theme.text)}
              <div className="h-20" />
            </div>
          </PageView>
        </div>
      ) : (
        /* ── 스크롤 뷰: URL 기반 챕터별 이동 ── */
        <main className="mx-auto px-6 py-10" style={{ maxWidth: WIDTH_MAP[settings.contentWidth] }}>
          {renderChapterTitle(chapter, theme.text)}
          <div className="reader-content" style={fontStyle}>
            {renderSentencesFor(sentences)}
          </div>

          <div className="flex justify-between mt-16 pt-8 border-t border-gray-100">
            {prevChapter
              ? <Link href={`/books/${book.slug}/${prevChapter.slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← {prevChapter.title}</Link>
              : <div />}
            {nextChapterMeta
              ? <Link href={`/books/${book.slug}/${nextChapterMeta.slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{nextChapterMeta.title} →</Link>
              : <div />}
          </div>
        </main>
      )}

      {searchOpen && <SearchModal bookId={book.id} bookSlug={book.slug} onClose={() => setSearchOpen(false)} />}

      {popup && (
        <HighlightPopup
          sentenceId={popup.sentenceId} bookId={book.id} content={popup.content}
          highlightCount={highlightCounts[popup.sentenceId] ?? 0}
          isMyHighlight={myHighlights.has(popup.sentenceId)}
          onClose={() => setPopup(null)}
          onRemoveHighlight={() => toggleHighlight(popup.sentenceId)}
          mouseX={popup.x} mouseY={popup.y}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onSuccess={(userId, nickname) => {
            setReader({ id: userId, nickname })
            setShowAuthModal(false)
            if (pendingSentenceId) {
              toggleHighlight(pendingSentenceId)
              setPendingSentenceId(null)
            }
          }}
          onClose={() => { setShowAuthModal(false); setPendingSentenceId(null) }}
        />
      )}

      {resumeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white text-sm rounded-full px-5 py-3 flex items-center gap-3 shadow-lg">
          <span>여기서 이어 읽으시겠어요?</span>
          <button onClick={() => scrollToSentence(resumeSentenceId.current!)}
            className="underline font-medium hover:text-amber-300 transition-colors">이동</button>
          <button onClick={() => setResumeToast(false)} className="text-gray-400 hover:text-white ml-1">✕</button>
        </div>
      )}
    </div>
  )
}
