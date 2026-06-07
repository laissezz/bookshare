import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

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

  // 글자 수가 충분한 첫 챕터로 시작 (300자 미만은 TOC·제목 페이지로 간주)
  const firstChapter = chapters?.find(c => (c.char_count ?? 0) >= 300) ?? chapters?.[0]

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← 홈으로
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* 표지 */}
        <div className="flex justify-center mb-8">
          <div className="w-full aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden relative shadow-lg">
            {book.cover_url ? (
              <Image src={book.cover_url} alt={book.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
                <span className="text-5xl">📖</span>
              </div>
            )}
          </div>
        </div>

        {/* 책 정보 */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 leading-snug">{book.title}</h1>
          {book.subtitle && (
            <p className="text-gray-500 mt-1">{book.subtitle}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">{book.author}</p>
          {book.description && (
            <p className="text-gray-600 text-sm mt-4 leading-relaxed max-w-md mx-auto">{book.description}</p>
          )}
        </div>

        {/* 읽기 시작 버튼 */}
        {firstChapter && (
          <Link
            href={`/books/${slug}/${firstChapter.slug}`}
            className="block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors mb-3"
          >
            읽기 시작
          </Link>
        )}

        {/* 게시판 버튼 */}
        {book.board_name && (
          <Link
            href={`/books/${slug}/reviews`}
            className="block w-full text-center text-sm text-gray-600 hover:text-gray-900 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors mb-3"
          >
            ✏️ {book.board_name}
          </Link>
        )}

        {/* 인기 문장 / 내 기록 버튼 */}
        <div className="flex gap-3 mb-10">
          <Link
            href={`/books/${slug}/highlights`}
            className="flex-1 text-center text-sm text-amber-600 hover:text-amber-700 py-3 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
          >
            💛 인기 문장 보기
          </Link>
          <Link
            href={`/books/${slug}/mine`}
            className="flex-1 text-center text-sm text-gray-600 hover:text-gray-900 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            📌 내 기록 보기
          </Link>
        </div>

        {/* 목차 */}
        {chapters && chapters.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">목차</h2>
            <div className="space-y-0">
              {chapters.filter(c => (c.level ?? 1) === 1 || (c.char_count ?? 0) >= 100).map((chapter) => {
                const minutes = chapter.char_count
                  ? Math.max(1, Math.round(chapter.char_count / 500))
                  : null
                const isSection = (chapter.level ?? 1) > 1

                if (!isSection) {
                  // 장: 굵고 크게, 구분선
                  return (
                    <div key={chapter.id}>
                      <Link
                        href={`/books/${slug}/${chapter.slug}`}
                        className="flex items-center justify-between py-3 mt-4 first:mt-0 group"
                      >
                        <span className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                          {chapter.title}
                        </span>
                        {/* 장은 직접 본문이 있을 때만 읽기 시간 표시 */}
                        {minutes && (chapter.char_count ?? 0) >= 100 && (
                          <span className="text-xs text-gray-300">약 {minutes}분</span>
                        )}
                      </Link>
                      <div className="w-full border-t border-gray-200" />
                    </div>
                  )
                }

                // 절: 들여쓰기, 작은 글씨
                return (
                  <Link
                    key={chapter.id}
                    href={`/books/${slug}/${chapter.slug}`}
                    className="flex items-center justify-between py-2.5 pl-4 border-b border-gray-50 group"
                  >
                    <span className="text-sm text-gray-600 group-hover:text-amber-700 transition-colors">
                      {chapter.title}
                    </span>
                    {minutes && (
                      <span className="text-xs text-gray-300">약 {minutes}분</span>
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
