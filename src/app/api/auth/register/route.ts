import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, nickname, email } = await req.json()
  if (!userId || !nickname || !email) {
    return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })
  }

  const admin = createAdminClient()

  // service role로 RLS 우회하여 readers 테이블에 저장 (upsert로 중복 방지)
  const { error } = await admin.from('readers').upsert({
    id: userId,
    nickname: nickname.trim(),
    email: email.toLowerCase(),
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
