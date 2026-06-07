'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Reader {
  id: string
  nickname: string
  email: string
  created_at: string
  highlightCount: number
  commentCount: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1) return '오늘'
  if (d < 30) return `${d}일 전`
  const m = Math.floor(d / 30)
  if (m < 12) return `${m}달 전`
  return `${Math.floor(m / 12)}년 전`
}

export default function ReadersClient({ readers }: { readers: Reader[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<Reader | null>(null)

  const visible = readers.filter(r =>
    !localDeleted.has(r.id) &&
    (r.nickname.includes(search) || r.email.includes(search))
  )

  async function deleteReader(reader: Reader) {
    setDeleting(reader.id)
    const res = await fetch('/api/admin/readers/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readerId: reader.id }),
    })
    if (res.ok) {
      setLocalDeleted(prev => new Set([...prev, reader.id]))
      router.refresh()
    }
    setDeleting(null)
    setConfirm(null)
  }

  return (
    <>
      {/* 검색 */}
      <div className="mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="닉네임 또는 이메일 검색..."
          className="w-full max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {/* 목록 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">독자가 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-800 text-sm">{r.nickname}</span>
                    <span className="text-xs text-gray-400">{r.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span>💛 하이라이트 {r.highlightCount}</span>
                    <span>💬 공감글 {r.commentCount}</span>
                    <span>가입 {timeAgo(r.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirm(r)}
                  disabled={deleting === r.id}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0 transition-colors"
                >
                  {deleting === r.id ? '삭제 중...' : '계정 삭제'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {confirm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-900 mb-2">계정을 삭제할까요?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <strong>{confirm.nickname}</strong> ({confirm.email})
            </p>
            <p className="text-sm text-red-500 mb-5">
              이 계정의 하이라이트·공감글 등 모든 기록이 함께 삭제됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteReader(confirm)}
                disabled={deleting === confirm.id}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting === confirm.id ? '삭제 중...' : '삭제'}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
