import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function AdminDashboard() {
  const admin = createAdminClient()

  const [
    { count: bookCount },
    { count: readerCount },
    { count: highlightCount },
    { count: commentCount },
    { count: reviewCount },
    { data: recentReaders },
    { data: recentComments },
  ] = await Promise.all([
    admin.from('books').select('*', { count: 'exact', head: true }).eq('published', true),
    admin.from('readers').select('*', { count: 'exact', head: true }),
    admin.from('highlights').select('*', { count: 'exact', head: true }),
    admin.from('comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    admin.from('book_reviews').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    admin.from('readers').select('nickname, email, created_at').order('created_at', { ascending: false }).limit(5),
    admin.from('comments').select('nickname, content, created_at').eq('is_deleted', false).order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: '공개 중인 책', value: bookCount ?? 0, href: '/admin/books' },
    { label: '가입 독자', value: readerCount ?? 0, href: '/admin/readers' },
    { label: '하이라이트', value: highlightCount ?? 0, href: null },
    { label: '공감글', value: commentCount ?? 0, href: null },
    { label: '독서 후기', value: reviewCount ?? 0, href: null },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            {s.href && (
              <Link href={s.href} className="text-xs text-amber-600 hover:underline mt-2 inline-block">
                관리 →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* 최근 가입 독자 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">최근 가입 독자</h2>
          <Link href="/admin/readers" className="text-xs text-gray-400 hover:text-gray-700">전체 보기 →</Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {recentReaders?.length ? recentReaders.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <span className="text-sm font-medium text-gray-900">{r.nickname}</span>
                <span className="text-xs text-gray-400 ml-2">{r.email}</span>
              </div>
              <span className="text-xs text-gray-300">
                {new Date(r.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )) : (
            <p className="px-5 py-4 text-sm text-gray-400">아직 가입한 독자가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 최근 공감글 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">최근 공감글</h2>
          <Link href="/admin/books" className="text-xs text-gray-400 hover:text-gray-700">책별 관리 →</Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {recentComments?.length ? recentComments.map((c, i) => (
            <div key={i} className="px-5 py-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-900">{c.nickname}</span>
                <span className="text-xs text-gray-300">
                  {new Date(c.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <p className="text-sm text-gray-500 line-clamp-1">{c.content}</p>
            </div>
          )) : (
            <p className="px-5 py-4 text-sm text-gray-400">아직 공감글이 없습니다.</p>
          )}
        </div>
      </section>
    </div>
  )
}
