import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReviewClient from './ReviewClient'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('id, slug, title, author')
    .eq('slug', slug)
    .single()

  if (!book) notFound()

  const { data: reviews } = await supabase
    .from('book_reviews')
    .select('id, nickname, content, rating, created_at')
    .eq('book_id', book.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <Link href={`/books/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← {book.title}
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">독서 후기</h1>
          <p className="text-sm text-gray-400 mt-1">{book.title} · {book.author}</p>
        </div>

        <ReviewClient bookId={book.id} initialReviews={reviews ?? []} />
      </main>
    </div>
  )
}
