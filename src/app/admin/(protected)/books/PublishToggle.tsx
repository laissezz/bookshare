'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PublishToggle({
  bookId,
  published,
}: {
  bookId: string
  published: boolean
}) {
  const [value, setValue] = useState(published)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    // admin client가 필요하므로 서버 액션 호출
    const res = await fetch('/api/admin/books/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, published: !value }),
    })
    if (res.ok) setValue(v => !v)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
        value
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {value ? '공개' : '비공개'}
    </button>
  )
}
