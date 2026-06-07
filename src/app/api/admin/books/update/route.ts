import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookId, title, subtitle, author, description, published, board_name } = await req.json()
  if (!bookId) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('books')
    .update({ title, subtitle: subtitle || null, author, description: description || null, published, board_name: board_name || null })
    .eq('id', bookId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
