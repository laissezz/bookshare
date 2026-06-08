'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSessionId } from '@/lib/session'

interface Comment {
  id: string
  nickname: string
  content: string
  created_at: string
}

interface Props {
  sentenceId: string
  bookId: string
  content: string
  highlightCount: number
  isMyHighlight?: boolean
  onClose: () => void
  onRemoveHighlight?: () => void
  mouseX: number
  mouseY: number
}

export default function HighlightPopup({
  sentenceId,
  bookId,
  content,
  highlightCount,
  isMyHighlight,
  onClose,
  onRemoveHighlight,
  mouseX,
  mouseY,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [nickname, setNickname] = useState('')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const sessionId = getSessionId()

  useEffect(() => {
    supabase
      .from('comments')
      .select('id, nickname, content, created_at')
      .eq('sentence_id', sentenceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []))
  }, [sentenceId])

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 0)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Esc 닫기
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return

    // 스팸 방지: 오늘 같은 문장에 3회 이상 댓글 불가
    const todayKey = `comment_count_${sentenceId}_${new Date().toDateString()}`
    const count = parseInt(localStorage.getItem(todayKey) ?? '0')
    if (count >= 3) {
      alert('오늘 이 문장에 댓글을 더 이상 남길 수 없습니다.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        sentence_id: sentenceId,
        book_id: bookId,
        session_id: sessionId,
        nickname: nickname.trim() || '익명 독자',
        content: commentText.trim(),
      })
      .select('id, nickname, content, created_at')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data])
      localStorage.setItem(todayKey, String(count + 1))
      setCommentText('')
      setNickname('')
      setShowForm(false)
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  // 팝업 위치: 렌더 후 실제 높이를 측정해서 결정
  // - 아래 공간이 부족하면 클릭 위치 위쪽에 표시 (flip)
  // - showForm·comments 변경으로 팝업 크기가 바뀔 때도 재계산
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!popupRef.current) return
    const { width, height } = popupRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const MARGIN = 12

    // 수평: 클릭 X 기준 좌우 균등, 뷰포트 안에 클램프
    const left = Math.max(MARGIN, Math.min(mouseX - width / 2, vw - width - MARGIN))

    // 수직: 기본은 클릭 아래, 공간 부족하면 위쪽으로 뒤집기
    let top = mouseY + MARGIN
    if (top + height > vh - MARGIN) {
      top = mouseY - height - MARGIN
    }
    // 위쪽도 잘리면 상단 고정
    top = Math.max(MARGIN, top)

    setPos({ top, left })
  }, [mouseX, mouseY, showForm, comments.length, submitted])

  return (
    <div
      ref={popupRef}
      role="dialog"
      aria-modal="true"
      aria-label="문장 공감 및 댓글"
      className="fixed z-30 bg-white border border-gray-200 rounded-2xl shadow-xl w-80 max-h-[70vh] overflow-y-auto"
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        // 위치 계산 전까지 숨겨서 잘못된 위치에 잠깐 보이는 현상 방지
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <div className="p-4">
        {/* 문장 미리보기 */}
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">{content}</p>

        {/* 공감 수 */}
        <p className="text-sm font-medium text-amber-600 mb-3" aria-label={`${highlightCount}명이 이 문장에 공감했어요`}>
          💛 {highlightCount > 0 ? `${highlightCount}명이 이 문장에 공감했어요` : '첫 번째로 공감해보세요'}
        </p>

        {/* 댓글 목록 */}
        {comments.length > 0 && (
          <div className="space-y-3 mb-3 border-t border-gray-100 pt-3">
            {comments.map(c => (
              <div key={c.id}>
                <span className="text-xs font-medium text-gray-600">{c.nickname}</span>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* 하이라이트 취소 */}
        {isMyHighlight && onRemoveHighlight && (
          <button
            onClick={() => { onRemoveHighlight(); onClose() }}
            className="w-full text-sm font-medium text-red-400 hover:text-white hover:bg-red-400 border border-red-200 hover:border-red-400 rounded-lg py-2 mb-3 transition-colors"
          >
            ✕ 하이라이트 취소
          </button>
        )}

        {/* 공감글 남기기 버튼 / 폼 */}
        {submitted ? (
          <p className="text-sm text-center text-gray-400 py-2">공감글을 남겨주셔서 감사합니다 🙏</p>
        ) : showForm ? (
          <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-3 space-y-2">
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임 (선택, 기본: 익명 독자)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="이 문장에서 비슷한 경험이 있으신가요?"
              required
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-amber-400 text-white text-sm py-2 rounded-lg font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {submitting ? '저장 중...' : '남기기'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-400 px-3 hover:text-gray-600"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium py-2 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
          >
            이 문장에 공감글 남기기 →
          </button>
        )}
      </div>
    </div>
  )
}
