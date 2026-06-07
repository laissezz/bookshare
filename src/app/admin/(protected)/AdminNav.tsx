'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const linkClass = (href: string) =>
    `text-sm px-3 py-1.5 rounded-md transition-colors ${
      pathname === href
        ? 'bg-gray-900 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-gray-900 mr-4">관리자</span>
          <Link href="/admin" className={linkClass('/admin')}>대시보드</Link>
          <Link href="/admin/books" className={linkClass('/admin/books')}>책 관리</Link>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </nav>
  )
}
