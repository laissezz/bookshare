'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSessionId } from '@/lib/session'

interface Review {
  id: string
  nickname: string
  content: string
  rating: number | null
  created_at: string
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={`text-2xl transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${
            n <= value ? 'text-amber-400' : 'text-gray-200'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

export default function ReviewClient({ bookId, initialReviews }: { bookId: string; initialReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [showForm, setShowForm] = useState(false)
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()
  const sessionId = getSessionId()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    // 같은 브라우저에서 같은 책에 후기를 이미 썼는지 확인
    const key = `review_submitted_${bookId}`
    if (localStorage.getItem(key)) {
      setError('이미 이 책에 후기를 남기셨습니다.')
      return
    }

    setSubmitting(true)
    setError('')

    const { data, error: err } = await supabase
      .from('book_reviews')
      .insert({
        book_id: bookId,
        session_id: sessionId,
        nickname: nickname.trim() || '익명 독자',
        content: content.trim(),
        rating,
      })
      .select('id, nickname, content, rating, created_at')
      .single()

    if (err) {
      setError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } else if (data) {
      setReviews(prev => [data, ...prev])
      localStorage.setItem(key, '1')
      setContent('')
      setNickname('')
      setShowForm(false)
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  return (
    <div>
      {/* 후기 작성 버튼 / 완료 메시지 */}
      {submitted ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-amber-700 font-medium">후기를 남겨주셔서 감사합니다 🙏</p>
          <p className="text-sm text-amber-600 mt-1">다른 독자들에게 큰 도움이 됩니다.</p>
        </div>
      ) : !showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-8 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors text-sm font-medium"
        >
          ✏️ 독서 후기 쓰기
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mb-8 bg-gray-50 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">후기 남기기</h3>

          {/* 별점 */}
          <div>
            <label className="text-sm text-gray-500 mb-1 block">별점</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* 닉네임 */}
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="닉네임 (선택, 기본: 익명 독자)"
            maxLength={20}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          {/* 본문 */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="책을 읽고 어떤 생각이 드셨나요? 자유롭게 남겨주세요."
            required
            rows={5}
            maxLength={1000}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="text-right text-xs text-gray-300">{content.length}/1000</div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? '저장 중...' : '후기 등록'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* 후기 목록 */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm">아직 후기가 없습니다. 첫 번째 후기를 남겨보세요!</p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">{reviews.length}개의 후기</p>
          {reviews.map(r => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-800 text-sm">{r.nickname}</span>
                  <span className="text-xs text-gray-300 ml-2">{timeAgo(r.created_at)}</span>
                </div>
                {r.rating && <StarRating value={r.rating} />}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
