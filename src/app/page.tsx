import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Book } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: books } = await supabase
    .from('books')
    .select('id, slug, title, subtitle, author, cover_url, description')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">책 읽기</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {!books?.length ? (
          <p className="text-center text-gray-400 py-20">아직 공개된 책이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {books.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function BookCard({ book }: { book: Pick<Book, 'id' | 'slug' | 'title' | 'subtitle' | 'author' | 'cover_url' | 'description'> }) {
  return (
    <Link href={`/books/${book.slug}`} className="group block">
      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
            <span className="text-4xl">📖</span>
          </div>
        )}
      </div>
      <h2 className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors leading-snug">
        {book.title}
      </h2>
      {book.subtitle && (
        <p className="text-sm text-gray-500 mt-0.5">{book.subtitle}</p>
      )}
      <p className="text-sm text-gray-400 mt-1">{book.author}</p>
      {book.description && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{book.description}</p>
      )}
    </Link>
  )
}
