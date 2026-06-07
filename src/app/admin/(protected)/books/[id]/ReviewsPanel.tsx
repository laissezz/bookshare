'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Review {
  id: string
  nickname: string
  content: string
  rating: number | null
  is_deleted: boolean
  created_at: string
}

function Stars({ value }: { value: number | null }) {
  if (!value) return null
  return (
    <span className="text-xs text-amber-400">
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  )
}

export default function ReviewsPanel({ reviews }: { reviews: Review[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set())

  async function deleteReview(id: string) {
    setDeleting(id)
    const res = await fetch('/api/admin/reviews/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId: id }),
    })
    if (res.ok) {
      setLocalDeleted(prev => new Set([...prev, id]))
      router.refresh()
    }
    setDeleting(null)
  }

  const visible = reviews.filter(r => !r.is_deleted && !localDeleted.has(r.id))
  const deleted = reviews.filter(r => r.is_deleted || localDeleted.has(r.id))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {!reviews.length ? (
        <p className="text-sm text-gray-400 text-center py-8">등록된 후기가 없습니다.</p>
      ) : (
        <>
          {visible.length > 0 && (
            <div className="divide-y divide-gray-100">
              {visible.map(r => (
                <div key={r.id} className="flex items-start justify-between px-5 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{r.nickname}</span>
                      <Stars value={r.rating} />
                      <span className="text-xs text-gray-300">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  </div>
                  <button
                    onClick={() => deleteReview(r.id)}
                    disabled={deleting === r.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {deleting === r.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {deleted.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-300">삭제된 후기 {deleted.length}개</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
