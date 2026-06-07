import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { reviewId } = await req.json()
  if (!reviewId) return NextResponse.json({ error: 'reviewId required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('book_reviews')
    .update({ is_deleted: true })
    .eq('id', reviewId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
