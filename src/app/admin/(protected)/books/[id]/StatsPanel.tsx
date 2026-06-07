import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

interface Chapter {
  id: string
  slug: string
  title: string
  char_count: number
}

interface Props {
  bookId: string
  bookSlug: string
  highlightCount: number
  commentCount: number
  chapters: Chapter[]
}

export default async function StatsPanel({ bookId, bookSlug, highlightCount, commentCount, chapters }: Props) {
  const admin = createAdminClient()

  // 챕터별 하이라이트 수 집계
  const { data: highlights } = await admin
    .from('highlights')
    .select('sentence_id, sentences!inner(chapter_id)')
    .eq('book_id', bookId)

  const chapterHighlights: Record<string, number> = {}
  for (const h of highlights ?? []) {
    const chapId = (h.sentences as unknown as { chapter_id: string }).chapter_id
    chapterHighlights[chapId] = (chapterHighlights[chapId] ?? 0) + 1
  }

  const totalChars = chapters.reduce((sum, c) => sum + c.char_count, 0)
  const totalMinutes = Math.round(totalChars / 500)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="총 하이라이트" value={highlightCount.toLocaleString()} />
        <Stat label="총 댓글" value={commentCount.toLocaleString()} />
        <Stat label="예상 읽기 시간" value={`약 ${totalMinutes}분`} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 mb-3">챕터별 하이라이트</p>
        <div className="space-y-2">
          {chapters.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-40 truncate">{c.title}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{
                    width: highlightCount
                      ? `${Math.min(100, ((chapterHighlights[c.id] ?? 0) / highlightCount) * 100)}%`
                      : '0%'
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">{chapterHighlights[c.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href={`/books/${bookSlug}/highlights`}
          target="_blank"
          className="text-sm text-amber-600 hover:text-amber-700"
        >
          💛 인기 문장 페이지 보기 →
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}
