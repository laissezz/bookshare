import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, subtitle, author, slug, description, cover_url, board_name } = await req.json()
  if (!title || !author || !slug) {
    return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('books')
    .insert({ title, subtitle: subtitle || null, author, slug, description: description || null, cover_url, board_name: board_name || null, published: false })
    .select('id')
    .single()

  if (error) {
    const msg = error.code === '23505' ? `slug "${slug}"는 이미 사용 중입니다.` : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  return NextResponse.json({ id: data.id })
}
