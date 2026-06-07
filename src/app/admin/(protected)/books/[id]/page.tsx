import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import BookEditForm from './BookEditForm'
import DocxReupload from './DocxReupload'
import CommentsPanel from './CommentsPanel'
import ReviewsPanel from './ReviewsPanel'
import StatsPanel from './StatsPanel'

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: book } = await admin.from('books').select('*').eq('id', id).single()
  if (!book) notFound()

  const { data: chapters } = await admin
    .from('chapters')
    .select('id, slug, title, order_index, char_count')
    .eq('book_id', id)
    .order('order_index')

  const { data: comments } = await admin
    .from('comments')
    .select('id, nickname, content, is_deleted, created_at, sentence_id')
    .eq('book_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // 통계
  const { count: highlightCount } = await admin
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)

  const { count: commentCount } = await admin
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id)
    .eq('is_deleted', false)

  const { data: reviews } = await admin
    .from('book_reviews')
    .select('id, nickname, content, rating, is_deleted, created_at')
    .eq('book_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">{book.title}</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${book.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {book.published ? '공개' : '비공개'}
        </span>
      </div>

      {/* 기본 정보 편집 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">책 정보</h2>
        <BookEditForm book={book} />
      </section>

      {/* 원고 재업로드 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">원고 재업로드</h2>
        <DocxReupload bookId={id} chapterCount={chapters?.length ?? 0} />
      </section>

      {/* 통계 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">통계</h2>
        <StatsPanel
          bookId={id}
          bookSlug={book.slug}
          highlightCount={highlightCount ?? 0}
          commentCount={commentCount ?? 0}
          chapters={chapters ?? []}
        />
      </section>

      {/* 댓글 관리 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">공감글 관리</h2>
        <CommentsPanel comments={comments ?? []} />
      </section>

      {/* 독서 후기 관리 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">독서 후기 관리</h2>
        <ReviewsPanel reviews={reviews ?? []} />
      </section>
    </div>
  )
}
