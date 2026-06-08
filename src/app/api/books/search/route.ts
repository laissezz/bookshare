import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get('bookId')
  const query = searchParams.get('q')

  if (!bookId || !query?.trim()) {
    return NextResponse.json({ results: [] })
  }

  const admin = createAdminClient()

  const { data: sentences, error } = await admin
    .from('sentences')
    .select('id, content, chapter_id')
    .eq('book_id', bookId)
    .ilike('content', `%${query}%`)
    .limit(20)

  if (error || !sentences?.length) {
    return NextResponse.json({ results: [] })
  }

  const chapterIds = [...new Set(sentences.map(s => s.chapter_id))]
  const { data: chapters } = await admin
    .from('chapters')
    .select('id, slug, title')
    .in('id', chapterIds)

  const chapterMap = Object.fromEntries((chapters ?? []).map(c => [c.id, c]))

  const results = sentences.map(s => ({
    id: s.id,
    content: s.content,
    chapter_id: s.chapter_id,
    chapterSlug: chapterMap[s.chapter_id]?.slug ?? '',
    chapterTitle: chapterMap[s.chapter_id]?.title ?? '',
  }))

  return NextResponse.json({ results })
}
