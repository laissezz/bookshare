import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReaderClient from './ReaderClient'

export const dynamic = 'force-dynamic'

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>
}) {
  const { slug, chapter: chapterSlug } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('id, slug, title')
    .eq('slug', slug)
    .single()

  if (!book) notFound()

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, slug, title, order_index')
    .eq('book_id', book.id)
    .eq('slug', chapterSlug)
    .single()

  if (!chapter) notFound()

  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, content, order_index, paragraph_index, is_html')
    .eq('chapter_id', chapter.id)
    .order('order_index')

  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, slug, title, order_index, level, char_count')
    .eq('book_id', book.id)
    .order('order_index')

  // 하이라이트 카운트
  const sentenceIds = sentences?.map(s => s.id) ?? []
  const { data: highlights } = sentenceIds.length
    ? await supabase
        .from('highlights')
        .select('sentence_id')
        .in('sentence_id', sentenceIds)
    : { data: [] }

  const highlightCounts: Record<string, number> = {}
  for (const h of highlights ?? []) {
    highlightCounts[h.sentence_id] = (highlightCounts[h.sentence_id] ?? 0) + 1
  }

  return (
    <ReaderClient
      book={book}
      chapter={chapter}
      sentences={sentences ?? []}
      allChapters={allChapters ?? []}
      initialHighlightCounts={highlightCounts}
    />
  )
}
