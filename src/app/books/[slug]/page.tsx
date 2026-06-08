import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: book } = await supabase.from('books').select('title, author, description').eq('slug', slug).single()
  if (!book) return {}
  return {
    title: book.author ? `${book.title} — ${book.author}` : book.title,
    description: book.description ?? undefined,
  }
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!book) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, slug, title, order_index, char_count, level')
    .eq('book_id', book.id)
    .order('order_index')

  const firstChapter = chapters?.find(c => (c.char_count ?? 0) >= 300) ?? chapters?.[0]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }} className="px-6 py-4">
        <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-3)' }}>
          ← 홈으로
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* 표지 — 그림자만, 테두리 없음 */}
        <div className="flex justify-center mb-10">
          <div
            className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative"
            style={{
              maxWidth: '280px',
              boxShadow: '0 6px 32px oklch(0.18 0.01 80 / 0.18)',
              background: 'var(--bg-muted)',
            }}
          >
            {book.cover_url ? (
              <Image src={book.cover_url} alt={book.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--brand-bg)' }}>
                <span className="text-5xl">📖</span>
              </div>
            )}
          </div>
        </div>

        {/* 책 정보 */}
        <div className="text-center mb-10">
          <h1
            className="text-2xl font-semibold leading-snug mb-1"
            style={{ color: 'var(--text)', fontFamily: 'var(--font-serif)' }}
          >
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="text-base mt-1" style={{ color: 'var(--text-2)' }}>{book.subtitle}</p>
          )}
          <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>{book.author}</p>
          {book.description && (
            <p className="text-sm mt-5 leading-relaxed max-w-md mx-auto" style={{ color: 'var(--text-2)' }}>
              {book.description}
            </p>
          )}
        </div>

        {/* 읽기 시작 버튼 */}
        {firstChapter && (
          <Link
            href={`/books/${slug}/${firstChapter.slug}`}
            className="block w-full text-center py-3 rounded-xl font-medium text-sm transition-colors mb-3"
            style={{ background: 'var(--ink)', color: 'white' }}
          >
            읽기 시작하기
          </Link>
        )}

        {/* 게시판 버튼 */}
        {book.board_name && (
          <Link
            href={`/books/${slug}/reviews`}
            className="block w-full text-center text-sm py-3 rounded-xl transition-colors mb-3"
            style={{ border: '1px solid var(--border-2)', color: 'var(--text-2)', background: 'transparent' }}
          >
            ✏️ {book.board_name}
          </Link>
        )}

        {/* 보조 링크 */}
        <div className="flex gap-3 mb-12">
          <Link
            href={`/books/${slug}/highlights`}
            className="flex-1 text-center text-sm py-3 rounded-xl transition-colors"
            style={{ border: '1px solid var(--brand-bg)', color: 'var(--brand-dark)', background: 'var(--brand-bg)' }}
          >
            💛 인기 문장
          </Link>
          <Link
            href={`/books/${slug}/mine`}
            className="flex-1 text-center text-sm py-3 rounded-xl transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'transparent' }}
          >
            📌 내 기록
          </Link>
        </div>

        {/* 목차 — 대문자 아이브로우 제거, 자연스러운 섹션 제목으로 */}
        {chapters && chapters.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-3)' }}>목차</p>
            <div>
              {chapters.filter(c => (c.level ?? 1) === 1 || (c.char_count ?? 0) >= 100).map((chapter) => {
                const minutes = chapter.char_count
                  ? Math.max(1, Math.round(chapter.char_count / 500))
                  : null
                const isSection = (chapter.level ?? 1) > 1

                if (!isSection) {
                  return (
                    <div key={chapter.id}>
                      <Link
                        href={`/books/${slug}/${chapter.slug}`}
                        className="flex items-center justify-between py-3 mt-4 first:mt-0 group"
                      >
                        <span
                          className="font-semibold transition-colors duration-200"
                          style={{ color: 'var(--text)', fontFamily: 'var(--font-serif)' }}
                        >
                          {chapter.title}
                        </span>
                        {minutes && (chapter.char_count ?? 0) >= 100 && (
                          <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>약 {minutes}분</span>
                        )}
                      </Link>
                      <div style={{ borderTop: '1px solid var(--border)' }} />
                    </div>
                  )
                }

                return (
                  <Link
                    key={chapter.id}
                    href={`/books/${slug}/${chapter.slug}`}
                    className="flex items-center justify-between py-2.5 pl-4 group"
                    style={{ borderBottom: '1px solid var(--bg-subtle)' }}
                  >
                    <span className="text-sm transition-colors duration-200" style={{ color: 'var(--text-2)' }}>
                      {chapter.title}
                    </span>
                    {minutes && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>약 {minutes}분</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
