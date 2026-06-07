import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import PublishToggle from './PublishToggle'
import DeleteBookButton from './DeleteBookButton'

export default async function BooksPage() {
  const admin = createAdminClient()

  const { data: books } = await admin
    .from('books')
    .select('id, slug, title, author, published, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">책 관리</h1>
        <Link
          href="/admin/books/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + 새 책 등록
        </Link>
      </div>

      {!books?.length ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">등록된 책이 없습니다</p>
          <Link href="/admin/books/new" className="text-sm text-gray-600 underline">
            첫 번째 책을 등록하세요
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {books.map(book => (
            <div key={book.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <Link
                  href={`/admin/books/${book.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {book.title}
                </Link>
                <p className="text-sm text-gray-400 mt-0.5">{book.author} · /books/{book.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <PublishToggle bookId={book.id} published={book.published} />
                <Link
                  href={`/admin/books/${book.id}`}
                  className="text-sm text-gray-500 hover:text-gray-900"
                >
                  편집
                </Link>
                <DeleteBookButton bookId={book.id} title={book.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
