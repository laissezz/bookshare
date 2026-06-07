import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MineClient from './MineClient'

export const dynamic = 'force-dynamic'

export default async function MinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: book } = await supabase
    .from('books')
    .select('id, slug, title')
    .eq('slug', slug)
    .single()

  if (!book) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, slug, title, order_index')
    .eq('book_id', book.id)
    .order('order_index')

  return <MineClient book={book} chapters={chapters ?? []} />
}
