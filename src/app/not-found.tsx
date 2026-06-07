import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-6xl mb-6">📭</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">찾을 수 없는 페이지예요</h1>
        <p className="text-gray-400 text-sm mb-8">주소가 잘못됐거나 삭제된 페이지입니다.</p>
        <Link
          href="/"
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
