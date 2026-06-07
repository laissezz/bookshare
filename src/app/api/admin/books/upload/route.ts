import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { parseDocxBuffer } from '@/lib/parseDocx'

export async function POST(req: NextRequest) {
  // 인증 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const bookId = formData.get('bookId') as string
  const file = formData.get('docx') as File

  if (!bookId || !file) {
    return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 책 정보 조회
  const { data: book } = await admin
    .from('books')
    .select('id, slug, version')
    .eq('id', bookId)
    .single()

  if (!book) return NextResponse.json({ error: '책을 찾을 수 없습니다' }, { status: 404 })

  // docx 파싱
  const buffer = Buffer.from(await file.arrayBuffer())
  const chapters = await parseDocxBuffer(buffer)

  if (!chapters.length) {
    return NextResponse.json({ error: '파싱된 챕터가 없습니다. docx 구조를 확인하세요.' }, { status: 400 })
  }

  // 기존 챕터/문장 삭제
  await admin.from('chapters').delete().eq('book_id', bookId)

  // 챕터 + 문장 insert
  for (let ci = 0; ci < chapters.length; ci++) {
    const chap = chapters[ci]
    const chapterSlug = `ch${String(ci + 1).padStart(2, '0')}`
    const chapterId = `${book.slug}_${chapterSlug}`

    const { error: chapErr } = await admin.from('chapters').insert({
      id: chapterId,
      book_id: bookId,
      slug: chapterSlug,
      title: chap.title,
      order_index: ci,
      char_count: chap.charCount,
      level: chap.level,
    })

    if (chapErr) {
      return NextResponse.json({ error: `챕터 저장 실패: ${chapErr.message}` }, { status: 500 })
    }

    const sentenceRows = chap.sentences.map((s, si) => ({
      id: `${chapterId}_s${String(si + 1).padStart(3, '0')}`,
      chapter_id: chapterId,
      book_id: bookId,
      order_index: si,
      content: s.content,
      paragraph_index: s.paragraphIndex,
      is_html: s.isHtml ?? false,
      version: book.version,
    }))

    for (let i = 0; i < sentenceRows.length; i += 100) {
      const { error: sentErr } = await admin
        .from('sentences')
        .insert(sentenceRows.slice(i, i + 100))
      if (sentErr) {
        return NextResponse.json({ error: `문장 저장 실패: ${sentErr.message}` }, { status: 500 })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    chapters: chapters.length,
    sentences: chapters.reduce((sum, c) => sum + c.sentences.length, 0),
  })
}
