'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteBookButton({ bookId, title }: { bookId: string; title: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?\n챕터, 문장, 하이라이트, 댓글이 모두 삭제됩니다.`)) return

    setLoading(true)
    const res = await fetch('/api/admin/books/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      alert('삭제에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
    >
      {loading ? '삭제 중...' : '삭제'}
    </button>
  )
}
