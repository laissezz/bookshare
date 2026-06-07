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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }} className="px-6 py-4">
        <h1 className="text-base font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>
          책 읽기
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {!books?.length ? (
          <p className="text-center py-20" style={{ color: 'var(--text-3)' }}>아직 공개된 책이 없습니다.</p>
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
      {/* 표지 — 테두리 없이 그림자만 사용 (ghost card 패턴 제거) */}
      <div
        className="aspect-[3/4] rounded-xl overflow-hidden mb-3 relative"
        style={{ boxShadow: '0 2px 8px oklch(0.18 0.01 80 / 0.12)', background: 'var(--bg-muted)' }}
      >
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--brand-bg)' }}>
            <span className="text-4xl">📖</span>
          </div>
        )}
      </div>
      <h2
        className="font-semibold leading-snug transition-colors duration-200"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-serif)' }}
      >
        {book.title}
      </h2>
      {book.subtitle && (
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{book.subtitle}</p>
      )}
      <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{book.author}</p>
    </Link>
  )
}
