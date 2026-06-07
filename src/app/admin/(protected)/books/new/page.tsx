'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewBookPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    author: '',
    slug: '',
    description: '',
    board_name: '',
  })
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [step, setStep] = useState<'idle' | 'saving' | 'uploading' | 'done'>('idle')
  const [result, setResult] = useState<{ chapters: number; sentences: number } | null>(null)
  const [error, setError] = useState('')

  function handleField(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))

    // 제목 입력 시 slug 자동 생성
    if (name === 'title' && !form.slug) {
      const auto = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
      setForm(f => ({ ...f, slug: auto }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!docxFile) { setError('docx 파일을 선택해주세요.'); return }
    if (!form.slug.match(/^[a-z0-9-]+$/)) {
      setError('slug는 영문 소문자, 숫자, 하이픈만 가능합니다.')
      return
    }

    setError('')
    setStep('saving')

    // 1. 표지 이미지 업로드 (선택)
    let cover_url: string | null = null
    if (coverFile) {
      const fd = new FormData()
      fd.append('slug', form.slug)
      fd.append('cover', coverFile)
      const res = await fetch('/api/admin/books/cover', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(`표지 업로드 실패: ${data.error}`)
        setStep('idle')
        return
      }
      cover_url = data.url
    }

    // 2. books 테이블에 책 insert (API route 통해 admin client 사용)
    const res = await fetch('/api/admin/books/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cover_url }),
    })

    const bookData = await res.json()
    if (!res.ok) {
      setError(bookData.error || '책 저장 실패')
      setStep('idle')
      return
    }

    // 3. docx 업로드 + 파싱
    setStep('uploading')
    const fd = new FormData()
    fd.append('bookId', bookData.id)
    fd.append('docx', docxFile)

    const uploadRes = await fetch('/api/admin/books/upload', { method: 'POST', body: fd })
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      setError(uploadData.error || 'docx 처리 실패')
      setStep('idle')
      return
    }

    setResult({ chapters: uploadData.chapters, sentences: uploadData.sentences })
    setStep('done')
  }

  if (step === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">책 등록 완료!</h2>
        <p className="text-gray-500 mb-1">{result.chapters}개 챕터</p>
        <p className="text-gray-500 mb-6">{result.sentences}개 문장</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            대시보드로
          </button>
          <button
            onClick={() => { setStep('idle'); setResult(null); setForm({ title: '', subtitle: '', author: '', slug: '', description: '' }); setDocxFile(null) }}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            다른 책 등록
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">새 책 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="제목 *">
          <input name="title" value={form.title} onChange={handleField} required
            placeholder="딸깍하지 않은 생각들"
            className={inputClass} />
        </Field>

        <Field label="부제">
          <input name="subtitle" value={form.subtitle} onChange={handleField}
            placeholder="AI와 함께 일하며 변하는 감각들"
            className={inputClass} />
        </Field>

        <Field label="저자 *">
          <input name="author" value={form.author} onChange={handleField} required
            placeholder="성준"
            className={inputClass} />
        </Field>

        <Field label="Slug (URL용) *" hint="영문 소문자, 숫자, 하이픈만 가능. 예: dalkkak">
          <input name="slug" value={form.slug} onChange={handleField} required
            placeholder="dalkkak"
            pattern="^[a-z0-9-]+"
            className={inputClass} />
        </Field>

        <Field label="소개글">
          <textarea name="description" value={form.description} onChange={handleField}
            placeholder="책 소개를 입력하세요"
            rows={3}
            className={inputClass + ' resize-none'} />
        </Field>

        <Field label="게시판 이름" hint="책 소개 페이지의 후기 게시판 버튼 이름. 예: 독자 후기, 한마디 남기기">
          <input name="board_name" value={form.board_name} onChange={handleField}
            placeholder="독서 후기"
            className={inputClass} />
        </Field>

        <Field label="표지 이미지" hint="JPG, PNG, WebP">
          <input type="file" accept="image/*"
            onChange={e => setCoverFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm hover:file:bg-gray-200" />
        </Field>

        <Field label="원고 파일 (docx) *" hint="제목 1/2/3 스타일이 챕터 구분점이 됩니다">
          <input type="file" accept=".docx"
            onChange={e => setDocxFile(e.target.files?.[0] ?? null)}
            required
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm hover:file:bg-gray-200" />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={step !== 'idle'}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {step === 'saving' ? '책 저장 중...' : step === 'uploading' ? '원고 처리 중...' : '등록하기'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
