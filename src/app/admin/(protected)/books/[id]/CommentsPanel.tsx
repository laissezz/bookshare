'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Comment {
  id: string
  nickname: string
  content: string
  is_deleted: boolean
  created_at: string
  sentence_id: string
}

export default function CommentsPanel({ comments }: { comments: Comment[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set())

  async function deleteComment(id: string) {
    setDeleting(id)
    const res = await fetch('/api/admin/comments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: id }),
    })
    if (res.ok) {
      setLocalDeleted(prev => new Set([...prev, id]))
      router.refresh()
    }
    setDeleting(null)
  }

  const visible = comments.filter(c => !c.is_deleted && !localDeleted.has(c.id))
  const deleted = comments.filter(c => c.is_deleted || localDeleted.has(c.id))

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {!comments.length ? (
        <p className="text-sm text-gray-400 text-center py-8">등록된 댓글이 없습니다.</p>
      ) : (
        <>
          {visible.length > 0 && (
            <div className="divide-y divide-gray-100">
              {visible.map(c => (
                <div key={c.id} className="flex items-start justify-between px-5 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.nickname}</span>
                      <span className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>
                    <p className="text-xs text-gray-300 mt-1 truncate">문장: {c.sentence_id}</p>
                  </div>
                  <button
                    onClick={() => deleteComment(c.id)}
                    disabled={deleting === c.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0 transition-colors"
                  >
                    {deleting === c.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {deleted.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-300">삭제된 댓글 {deleted.length}개</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
