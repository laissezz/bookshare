import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { readerId } = await req.json()
  if (!readerId) return NextResponse.json({ error: 'readerId required' }, { status: 400 })

  const admin = createAdminClient()

  // readers 테이블에서 삭제 (auth.users는 Supabase Admin Auth API로 삭제)
  await admin.from('readers').delete().eq('id', readerId)

  // Supabase Auth 계정 삭제
  const { error } = await admin.auth.admin.deleteUser(readerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
