import { createAdminClient } from '@/lib/supabase/admin'
import ReadersClient from './ReadersClient'

export const dynamic = 'force-dynamic'

export default async function ReadersPage() {
  const admin = createAdminClient()

  const { data: readers } = await admin
    .from('readers')
    .select('id, nickname, email, created_at')
    .order('created_at', { ascending: false })

  // 독자별 하이라이트·댓글 수
  const readerIds = (readers ?? []).map(r => r.id)

  const { data: hlCounts } = await admin
    .from('highlights')
    .select('session_id')
    .in('session_id', readerIds)

  const { data: cmCounts } = await admin
    .from('comments')
    .select('session_id')
    .in('session_id', readerIds)
    .eq('is_deleted', false)

  const hlMap: Record<string, number> = {}
  const cmMap: Record<string, number> = {}
  for (const h of hlCounts ?? []) hlMap[h.session_id] = (hlMap[h.session_id] ?? 0) + 1
  for (const c of cmCounts ?? []) cmMap[c.session_id] = (cmMap[c.session_id] ?? 0) + 1

  const enriched = (readers ?? []).map(r => ({
    ...r,
    highlightCount: hlMap[r.id] ?? 0,
    commentCount: cmMap[r.id] ?? 0,
  }))

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        독자 관리
        <span className="text-base font-normal text-gray-400 ml-3">{enriched.length}명</span>
      </h1>
      <ReadersClient readers={enriched} />
    </div>
  )
}
