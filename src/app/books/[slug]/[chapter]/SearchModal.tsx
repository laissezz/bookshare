'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Result {
  id: string
  content: string
  chapter_id: string
  chapterSlug: string
  chapterTitle: string
}

interface Props {
  bookId: string
  bookSlug: string
  onClose: () => void
}

export default function SearchModal({ bookId, bookSlug, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    inputRef.current?.focus()
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data: sentences } = await supabase
        .from('sentences')
        .select('id, content, chapter_id')
        .eq('book_id', bookId)
        .ilike('content', `%${query}%`)
        .limit(20)

      if (!sentences?.length) { setResults([]); setLoading(false); return }

      const chapterIds = [...new Set(sentences.map(s => s.chapter_id))]
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, slug, title')
        .in('id', chapterIds)

      const chapterMap = Object.fromEntries((chapters ?? []).map(c => [c.id, c]))

      setResults(sentences.map(s => ({
        ...s,
        chapterSlug: chapterMap[s.chapter_id]?.slug ?? '',
        chapterTitle: chapterMap[s.chapter_id]?.title ?? '',
      })))
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, bookId])

  function go(result: Result) {
    onClose()
    router.push(`/books/${bookSlug}/${result.chapterSlug}#${result.id}`)
  }

  function highlight(text: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-200 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="책 안에서 검색..."
            className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-sm text-gray-400">검색 중...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">검색 결과가 없습니다.</div>
          )}
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => go(r)}
              className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <p className="text-sm text-gray-900 leading-relaxed">{highlight(r.content)}</p>
              <p className="text-xs text-gray-400 mt-1">{r.chapterTitle}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
