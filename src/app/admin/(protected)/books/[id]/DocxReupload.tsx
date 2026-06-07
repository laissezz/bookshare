'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DocxReupload({ bookId, chapterCount }: { bookId: string; chapterCount: number }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [result, setResult] = useState<{ chapters: number; sentences: number } | null>(null)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    if (!confirm('기존 챕터와 문장이 모두 교체됩니다. 계속하시겠습니까?\n(하이라이트·댓글 데이터는 보존됩니다)')) return

    setStatus('uploading')
    setError('')

    const fd = new FormData()
    fd.append('bookId', bookId)
    fd.append('docx', file)

    const res = await fetch('/api/admin/books/upload', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? '업로드 실패')
      setStatus('idle')
      return
    }

    setResult({ chapters: data.chapters, sentences: data.sentences })
    setStatus('done')
    router.refresh()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-500 mb-4">
        현재 {chapterCount}개 챕터 등록됨. 새 docx를 올리면 챕터와 문장이 교체됩니다.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".docx"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm hover:file:bg-gray-200"
        />
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {status === 'uploading' ? '처리 중...' : '업로드'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      {status === 'done' && result && (
        <p className="text-sm text-green-600 mt-2">
          완료 — {result.chapters}챕터 / {result.sentences}문장 저장됨
        </p>
      )}
    </div>
  )
}
