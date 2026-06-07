'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Book {
  id: string
  title: string
  subtitle: string | null
  author: string
  slug: string
  description: string | null
  published: boolean
}

export default function BookEditForm({ book }: { book: Book }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: book.title,
    subtitle: book.subtitle ?? '',
    author: book.author,
    description: book.description ?? '',
    published: book.published,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/books/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id, ...form }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">제목</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">저자</label>
          <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} required className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">부제</label>
        <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">소개글</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputClass + ' resize-none'} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="published"
          checked={form.published}
          onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
          className="accent-green-500"
        />
        <label htmlFor="published" className="text-sm text-gray-700">공개 (독자에게 노출)</label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {saved ? '저장됨 ✓' : saving ? '저장 중...' : '저장'}
      </button>
    </form>
  )
}
