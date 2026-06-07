import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function HighlightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('id, slug, title, author')
    .eq('slug', slug)
    .single()

  if (!book) notFound()

  // 하이라이트 많은 순으로 Top 20
  const { data: topHighlights } = await supabase
    .from('highlights')
    .select('sentence_id')
    .eq('book_id', book.id)

  if (!topHighlights?.length) {
    return (
      <div className="min-h-screen bg-white">
        <Header book={book} />
        <main className="max-w-2xl mx-auto px-6 py-12">
          <p className="text-center text-gray-400 py-20">아직 하이라이트된 문장이 없습니다.</p>
        </main>
      </div>
    )
  }

  // 집계
  const countMap: Record<string, number> = {}
  for (const h of topHighlights) {
    countMap[h.sentence_id] = (countMap[h.sentence_id] ?? 0) + 1
  }
  const top20Ids = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id)

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, content, chapter_id')
    .in('id', top20Ids)

  const chapterIds = [...new Set(sentences?.map(s => s.chapter_id) ?? [])]
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, slug, title')
    .in('id', chapterIds)

  const chapterMap = Object.fromEntries((chapters ?? []).map(c => [c.id, c]))

  const sorted = (sentences ?? [])
    .map(s => ({ ...s, count: countMap[s.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="min-h-screen bg-white">
      <Header book={book} />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="text-lg font-semibold text-gray-900 mb-8">인기 문장 Top {sorted.length}</h2>
        <div className="space-y-6">
          {sorted.map((s, i) => {
            const chapter = chapterMap[s.chapter_id]
            return (
              <Link
                key={s.id}
                href={`/books/${slug}/${chapter?.slug}#${s.id}`}
                className="block group"
              >
                <div className="flex gap-4">
                  <span className="text-2xl font-bold text-gray-100 w-8 shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-gray-900 leading-relaxed group-hover:text-amber-700 transition-colors">
                      {s.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{chapter?.title}</span>
                      <span className="text-xs text-amber-500 font-medium">💛 {s.count}명</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

function Header({ book }: { book: { slug: string; title: string } }) {
  return (
    <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <Link href={`/books/${book.slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
        ← {book.title}
      </Link>
      <span className="text-sm text-gray-400">인기 문장</span>
    </header>
  )
}
