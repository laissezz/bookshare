'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Chapter {
  id: string
  slug: string
  title: string
  order_index: number
}

interface Book {
  id: string
  slug: string
  title: string
}

interface HighlightItem {
  sentenceId: string
  content: string
  chapterSlug: string
  chapterTitle: string
}

interface CommentItem {
  id: string
  sentenceId: string
  content: string
  sentenceContent: string
  chapterSlug: string
  chapterTitle: string
  createdAt: string
}

export default function MineClient({ book, chapters }: { book: Book; chapters: Chapter[] }) {
  const [highlights, setHighlights] = useState<HighlightItem[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notLoggedIn, setNotLoggedIn] = useState(false)
  const [tab, setTab] = useState<'highlights' | 'comments'>('highlights')

  const supabase = createClient()
  const chapterMap = Object.fromEntries(chapters.map(c => [c.id, c]))

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); setNotLoggedIn(true); return }

      const sessionId = user.id

      // 내 하이라이트
      const { data: hl } = await supabase
        .from('highlights')
        .select('sentence_id, sentences(id, content, chapter_id)')
        .eq('book_id', book.id)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      const hlItems: HighlightItem[] = (hl ?? []).map((h: any) => {
        const s = h.sentences
        const chap = chapterMap[s?.chapter_id]
        return {
          sentenceId: s?.id ?? '',
          content: s?.content ?? '',
          chapterSlug: chap?.slug ?? '',
          chapterTitle: chap?.title ?? '',
        }
      }).filter((h: HighlightItem) => h.sentenceId)

      setHighlights(hlItems)

      // 내 댓글
      const { data: cm } = await supabase
        .from('comments')
        .select('id, content, created_at, sentence_id, sentences(id, content, chapter_id)')
        .eq('book_id', book.id)
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      const cmItems: CommentItem[] = (cm ?? []).map((c: any) => {
        const s = c.sentences
        const chap = chapterMap[s?.chapter_id]
        return {
          id: c.id,
          sentenceId: s?.id ?? '',
          content: c.content,
          sentenceContent: s?.content ?? '',
          chapterSlug: chap?.slug ?? '',
          chapterTitle: chap?.title ?? '',
          createdAt: c.created_at,
        }
      }).filter((c: CommentItem) => c.chapterSlug)

      setComments(cmItems)
      setLoading(false)
    }

    load()
  }, [book.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href={`/books/${book.slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← {book.title}
        </Link>
        <span className="text-sm text-gray-400">내 기록</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {notLoggedIn && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔐</p>
            <p className="text-gray-600 font-medium mb-2">로그인이 필요합니다</p>
            <p className="text-sm text-gray-400 mb-6">책을 읽으면서 문장을 하이라이트하면 여기에 기록됩니다.</p>
            <Link
              href={`/books/${book.slug}`}
              className="inline-block bg-gray-900 text-white text-sm px-6 py-2.5 rounded-xl hover:bg-gray-700 transition-colors"
            >
              ← 책으로 돌아가기
            </Link>
          </div>
        )}
        {!notLoggedIn && <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('highlights')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'highlights' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💛 하이라이트 {!loading && `(${highlights.length})`}
          </button>
          <button
            onClick={() => setTab('comments')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'comments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💬 댓글 {!loading && `(${comments.length})`}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : tab === 'highlights' ? (
          highlights.length === 0 ? (
            <EmptyState text="아직 하이라이트한 문장이 없어요" sub="문장을 클릭하면 하이라이트할 수 있어요" />
          ) : (
            <div className="space-y-3">
              {highlights.map(h => (
                <Link
                  key={h.sentenceId}
                  href={`/books/${book.slug}/${h.chapterSlug}#${h.sentenceId}`}
                  className="block bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors group"
                >
                  <p className="text-gray-900 text-sm leading-relaxed">{h.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{h.chapterTitle}</p>
                </Link>
              ))}
            </div>
          )
        ) : (
          comments.length === 0 ? (
            <EmptyState text="아직 남긴 댓글이 없어요" sub="하이라이트 팝업에서 경험을 남겨보세요" />
          ) : (
            <div className="space-y-4">
              {comments.map(c => (
                <Link
                  key={c.id}
                  href={`/books/${book.slug}/${c.chapterSlug}#${c.sentenceId}`}
                  className="block border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-xs text-gray-400 mb-1.5 line-clamp-1">"{c.sentenceContent}"</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{c.content}</p>
                  <p className="text-xs text-gray-300 mt-2">
                    {c.chapterTitle} · {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </Link>
              ))}
            </div>
          )
        )}
        </div>}
      </main>
    </div>
  )
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-500 font-medium mb-1">{text}</p>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  )
}
