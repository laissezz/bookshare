'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <p className="text-5xl mb-6">⚠️</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">잠시 연결이 원활하지 않아요</h1>
        <p className="text-gray-400 text-sm mb-8">새로고침하면 대부분 해결됩니다.</p>
        <button
          onClick={reset}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}
