'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  children: React.ReactNode
  // contentKey: 레이아웃에 영향을 주는 값만 포함 (챕터 ID 목록 + 폰트/크기 설정)
  // highlight 토글, popup, tocOpen 등 레이아웃과 무관한 상태 변화는 제외
  // → calcPageOffsets가 꼭 필요할 때만 실행되어 성능 문제 해결
  contentKey: string
  spread: 1 | 2
  bgColor: string
  chapterIndex: number
  totalChapters: number
  onNextChapter?: () => void
  hasNextChapter?: boolean
  /** 이어읽기용: 외부에서 특정 문장으로 점프할 수 있도록 함수를 이 ref에 할당 */
  goToSentenceRef?: React.MutableRefObject<((sentenceId: string) => void) | null>
  /** 페이지 넘김 시 호출 (이어읽기 토스트 자동 닫기용) */
  onPageTurn?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// 전략: measureRef를 쓰지 않는다.
// 대신 실제 표시될 contentRef(full-height, no clip)를 직접 측정한다.
// 렌더 단계:
//   1) "measure phase": contentRef를 height:auto, opacity:0 으로 놓고 offsetTop 측정
//   2) "display phase": 측정 완료 후 clip + translateY 적용
// ─────────────────────────────────────────────────────────────────────────────

/** 단락 단위 페이지 브레이크 오프셋 계산
 *  getBoundingClientRect 기반: DOM 트리 순회 없이 단일 레이아웃 패스로 처리 */
function calcPageOffsets(container: HTMLElement, pageH: number): number[] {
  const offsets: number[] = [0]
  let pageStart = 0
  const blocks = Array.from(container.querySelectorAll('p, h2, h3')) as HTMLElement[]

  // 컨테이너 기준점을 한 번만 읽음 (이후 각 블록은 getBoundingClientRect 사용)
  const containerTop = container.getBoundingClientRect().top

  for (const block of blocks) {
    const rect = block.getBoundingClientRect()
    const top = rect.top - containerTop
    const bot = top + rect.height
    if (bot > pageStart + pageH && top > pageStart + 4) {
      pageStart = top
      offsets.push(pageStart)
    }
  }
  return offsets
}

export default function PageView({
  children, contentKey, spread, bgColor,
  chapterIndex, totalChapters,
  onNextChapter, hasNextChapter,
  goToSentenceRef, onPageTurn,
}: Props) {
  const outerRef   = useRef<HTMLDivElement>(null) // 표시 영역 (overflow:hidden)
  const contentRef = useRef<HTMLDivElement>(null) // 실제 콘텐츠 (측정 + 표시 겸용)

  const PADDING_TOP = 52 // 헤더와 본문 사이 여백 (px) — 모바일 가독성 확보

  const [pageHeight,  setPageHeight]  = useState(0)
  const [pageOffsets, setPageOffsets] = useState<number[]>([0])
  const [currentPage, setCurrentPage] = useState(0)
  const [measured,    setMeasured]    = useState(false)
  const hasInitRef = useRef(false)

  const totalPages   = pageOffsets.length
  const totalSpreads = Math.ceil(totalPages / spread)
  const currentSpread = Math.floor(currentPage / spread)

  // ── 표시 영역 높이 측정 ───────────────────────────────────────────────────
  useEffect(() => {
    function measure() {
      if (!outerRef.current) return
      const h = outerRef.current.clientHeight
      if (h > 0) setPageHeight(h - PADDING_TOP)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (outerRef.current) ro.observe(outerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── spread 변경 시 리셋 ───────────────────────────────────────────────────
  useEffect(() => {
    hasInitRef.current = false
    setMeasured(false)
    setCurrentPage(0)
  }, [spread])

  // ── 콘텐츠 측정 ────────────────────────────────────────────────────────────
  // • 초기 렌더: double RAF → 첫 화면을 빠르게 표시
  // • 추가 챕터 로드: requestIdleCallback → 페이지 넘김 중 메인 스레드 차단 방지
  useEffect(() => {
    if (!pageHeight || !contentRef.current) return

    function doMeasure() {
      if (!contentRef.current) return
      const offsets = calcPageOffsets(contentRef.current, pageHeight)
      setPageOffsets(offsets)
      if (!hasInitRef.current) {
        setCurrentPage(0)
        hasInitRef.current = true
      }
      setMeasured(true)
    }

    const isInitial = !hasInitRef.current

    if (isInitial) {
      // 초기: 빠른 double RAF로 첫 화면 즉시 표시
      let id2: number
      const id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(doMeasure)
      })
      return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
    } else {
      // 추가 챕터 로드: requestIdleCallback으로 메인 스레드 양보
      // → 사용자가 페이지를 빠르게 넘겨도 멈춤 없이 백그라운드에서 처리
      if (typeof requestIdleCallback !== 'undefined') {
        const handle = requestIdleCallback(doMeasure, { timeout: 800 })
        return () => cancelIdleCallback(handle)
      } else {
        // requestIdleCallback 미지원 환경 폴백 (IE, 구형 Safari)
        const t = setTimeout(doMeasure, 100)
        return () => clearTimeout(t)
      }
    }
  }, [contentKey, pageHeight, spread])

  // ── 이어읽기 점프 함수를 외부 ref에 할당 ─────────────────────────────────────
  // measured=true 이후, pageOffsets가 갱신될 때마다 최신 함수로 교체
  useEffect(() => {
    if (!goToSentenceRef) return
    goToSentenceRef.current = (sentenceId: string) => {
      if (!contentRef.current || pageOffsets.length === 0) return
      const el = contentRef.current.querySelector(`[data-sentence-id="${sentenceId}"]`) as HTMLElement | null
      if (!el) return
      const containerTop = contentRef.current.getBoundingClientRect().top
      const elTop = el.getBoundingClientRect().top - containerTop
      // elTop이 속한 페이지 찾기 (pageOffsets[i] <= elTop 인 마지막 i)
      let targetPage = 0
      for (let i = pageOffsets.length - 1; i >= 0; i--) {
        if (pageOffsets[i] <= elTop + 4) { targetPage = i; break }
      }
      // spread=2 이면 짝수 페이지로 맞춤 (스프레드 단위 이동)
      if (spread === 2 && targetPage % 2 !== 0) targetPage -= 1
      setCurrentPage(targetPage)
    }
  }, [measured, pageOffsets, spread, goToSentenceRef])

  // ── 프리로드: 마지막 5페이지 이내 or 페이지 수가 적으면 즉시 ────────────────
  useEffect(() => {
    if (!hasNextChapter) return
    const nearEnd = spread === 2
      ? currentSpread >= totalSpreads - 5
      : currentPage  >= totalPages  - 5
    if (nearEnd || totalPages <= 3) onNextChapter?.()
  }, [currentPage, currentSpread, totalPages, totalSpreads, hasNextChapter])

  // ── 이동 ─────────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentPage(p => {
      const next = spread === 2
        ? (currentSpread + 1 < totalSpreads ? p + 2 : p)
        : (p + 1 < totalPages ? p + 1 : p)
      if (next !== p) onPageTurn?.()
      return next
    })
  }, [spread, currentSpread, totalSpreads, totalPages, onPageTurn])

  const goPrev = useCallback(() => {
    setCurrentPage(p => {
      const next = spread === 2
        ? (currentSpread > 0 ? p - 2 : p)
        : (p > 0 ? p - 1 : p)
      if (next !== p) onPageTurn?.()
      return next
    })
  }, [spread, currentSpread, onPageTurn])

  // ── 키보드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [goNext, goPrev])

  // ── 터치 ─────────────────────────────────────────────────────────────────
  const tx = useRef(0), ty = useRef(0)
  const onTouchStart = (e: React.TouchEvent) => {
    tx.current = e.touches[0].clientX
    ty.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = tx.current - e.changedTouches[0].clientX
    const dy = ty.current - e.changedTouches[0].clientY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) dx > 0 ? goNext() : goPrev()
  }

  // ── 진도 ─────────────────────────────────────────────────────────────────
  const pageProgress   = totalSpreads > 1 ? currentSpread / (totalSpreads - 1) : 1
  const chapterBase    = totalChapters > 1 ? chapterIndex / (totalChapters - 1) : 1
  const chapterStep    = totalChapters > 1 ? 1 / (totalChapters - 1) : 1
  const overallProgress = Math.min(100, Math.round((chapterBase + pageProgress * chapterStep) * 100))

  const isFirst = spread === 2 ? currentSpread === 0 : currentPage === 0
  const atEnd   = spread === 2 ? currentSpread + 1 >= totalSpreads : currentPage + 1 >= totalPages
  const isLast  = atEnd && !hasNextChapter

  // ── 페이지별 렌더 함수 ───────────────────────────────────────────────────
  // measured=true 일 때만 clip 적용. false이면 투명하게 펼쳐두고 측정 중.
  function renderPage(pageIdx: number, containerStyle?: React.CSSProperties) {
    if (!measured || pageHeight === 0) return null
    const offset = pageOffsets[pageIdx] ?? 0
    // 이 페이지가 보여줄 콘텐츠 높이: 다음 페이지 시작점까지
    const nextOffset = pageOffsets[pageIdx + 1] ?? (offset + pageHeight)
    const visibleH   = Math.min(nextOffset - offset, pageHeight)
    const clipBottom = Math.max(0, pageHeight - visibleH)

    return (
      <div
        style={{
          ...containerStyle,
          height: `${pageHeight}px`,
          overflow: 'hidden',
          position: 'relative',
          clipPath: clipBottom > 0 ? `inset(0 0 ${clipBottom}px 0)` : undefined,
        }}
      >
        {/* contentRef와 동일한 children을 translateY로 이동 */}
        <div style={{ paddingTop: `${PADDING_TOP}px`, transform: `translateY(${-offset}px)` }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* 표시 영역 */}
      <div
        ref={outerRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* ── 측정용 콘텐츠 (항상 렌더, 측정 전에는 투명) ── */}
        {pageHeight > 0 && (
          <div
            ref={contentRef}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              paddingTop: `${PADDING_TOP}px`,
              // 2페이지 모드: 절반 너비로 측정 (실제 표시 컬럼과 동일한 너비)
              width: spread === 2 ? '50%' : '100%',
              // 측정 단계: 가시화 안 함 / 표시 단계: 완전히 숨김 (실제 표시는 renderPage가 담당)
              visibility: 'hidden',
              pointerEvents: 'none',
              zIndex: -1,
            }}
          >
            {children}
          </div>
        )}

        {/* ── 실제 표시 (measured 후) ── */}
        {measured && pageHeight > 0 && (
          spread === 2 ? (
            <div style={{ display: 'flex', height: `${pageHeight}px`, width: '100%' }}>
              {/* 책 접힘선 */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: '50%', transform: 'translateX(-1px)',
                width: '2px', zIndex: 10, pointerEvents: 'none',
                background: 'linear-gradient(to right,rgba(0,0,0,0.08),rgba(0,0,0,0.03),rgba(0,0,0,0.08))',
              }} />
              {/* 왼쪽 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderPage(currentSpread * 2)}
              </div>
              {/* 오른쪽 */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {currentSpread * 2 + 1 < totalPages
                  ? renderPage(currentSpread * 2 + 1)
                  : <div style={{ height: pageHeight }} />}
              </div>
            </div>
          ) : (
            renderPage(currentPage, { width: '100%' })
          )
        )}

        {/* 클릭 영역 */}
        <button onClick={goPrev}
          className="absolute left-0 top-0 w-[15%] h-full opacity-0 hover:opacity-100 flex items-center justify-start pl-3 transition-opacity z-20"
          aria-label="이전 페이지">
          <span className="text-3xl text-gray-300">‹</span>
        </button>
        <button onClick={goNext}
          className="absolute right-0 top-0 w-[15%] h-full opacity-0 hover:opacity-100 flex items-center justify-end pr-3 transition-opacity z-20"
          aria-label="다음 페이지">
          <span className="text-3xl text-gray-300">›</span>
        </button>
      </div>

      {/* 진도 바 */}
      <div className="flex items-center h-11 px-4 gap-3 shrink-0">
        <button onClick={goPrev} disabled={isFirst}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xl transition-colors shrink-0 w-6 text-center">‹</button>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(128,128,128,0.2)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%`, background: 'rgba(180,180,180,0.7)' }} />
          </div>
          <span className="text-xs tabular-nums shrink-0"
            style={{ color: 'rgba(150,150,150,0.8)', minWidth: '32px', textAlign: 'right' }}>
            {overallProgress}%
          </span>
        </div>
        <button onClick={goNext} disabled={isLast}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xl transition-colors shrink-0 w-6 text-center">›</button>
      </div>
    </div>
  )
}
