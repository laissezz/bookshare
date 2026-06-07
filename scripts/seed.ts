/**
 * 사용법:
 *   npx tsx scripts/seed.ts <docx파일경로> <book-slug>
 *
 * 예시:
 *   npx tsx scripts/seed.ts "C:\Users\Sungjun\Downloads\dalkkak.docx" dalkkak
 *
 * docx 구조 약속:
 *   - Heading 1 또는 Heading 2 → 챕터 제목
 *   - 그 아래 본문 단락 → 문장들
 */

import * as fs from 'fs'
import * as path from 'path'
import mammoth from 'mammoth'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 문장 분리: 마침표/느낌표/물음표 뒤 공백 기준, 단 따옴표·괄호 닫힘 포함
function splitSentences(paragraph: string): string[] {
  const raw = paragraph
    .split(/(?<=[.!?…]["']?\s*)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 너무 짧은 조각은 앞 문장에 합치기 (10자 미만)
  const merged: string[] = []
  for (const s of raw) {
    if (merged.length > 0 && s.length < 10) {
      merged[merged.length - 1] += ' ' + s
    } else {
      merged.push(s)
    }
  }
  return merged
}

// 챕터 제목인지 판단
function isHeading(tag: string): boolean {
  return ['h1', 'h2', 'h3'].includes(tag)
}

interface ParsedChapter {
  title: string
  paragraphs: string[]
}

async function parseDocx(filePath: string): Promise<ParsedChapter[]> {
  const result = await mammoth.convertToHtml({ path: filePath })
  const html = result.value

  // HTML을 태그 단위로 파싱
  const tagPattern = /<(h[1-3]|p)[^>]*>([\s\S]*?)<\/\1>/g
  const chapters: ParsedChapter[] = []
  let current: ParsedChapter | null = null

  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(html)) !== null) {
    const tag = match[1]
    // HTML 태그 제거
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    if (!text) continue

    if (isHeading(tag)) {
      if (current) chapters.push(current)
      current = { title: text, paragraphs: [] }
    } else {
      if (!current) {
        // 챕터 제목 전 본문 → "서문" 챕터로 처리
        current = { title: '서문', paragraphs: [] }
      }
      current.paragraphs.push(text)
    }
  }
  if (current) chapters.push(current)

  return chapters
}

function toSlug(index: number): string {
  return `ch${String(index + 1).padStart(2, '0')}`
}

async function seed(docxPath: string, bookSlug: string) {
  console.log(`\n📖 파싱 시작: ${docxPath}`)

  // 1. books 테이블에서 해당 slug 조회
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, version')
    .eq('slug', bookSlug)
    .single()

  if (bookError || !book) {
    console.error(`❌ books 테이블에 slug="${bookSlug}" 가 없습니다.`)
    console.error('먼저 Supabase에서 책을 등록하거나 아래 SQL을 실행하세요:')
    console.error(`
INSERT INTO books (slug, title, author, published)
VALUES ('${bookSlug}', '제목을 입력하세요', '저자를 입력하세요', false);
    `)
    process.exit(1)
  }

  console.log(`✅ 책 확인: "${book.title}" (id: ${book.id}, version: ${book.version})`)

  // 2. docx 파싱
  const chapters = await parseDocx(docxPath)
  console.log(`📚 챕터 수: ${chapters.length}`)

  // 3. 기존 chapters/sentences 삭제 (재seed 시)
  await supabase.from('chapters').delete().eq('book_id', book.id)
  console.log('🗑️  기존 챕터/문장 삭제 완료')

  // 4. chapters + sentences insert
  let totalSentences = 0

  for (let ci = 0; ci < chapters.length; ci++) {
    const chap = chapters[ci]
    const chapterSlug = toSlug(ci)
    const chapterId = `${bookSlug}_${chapterSlug}`

    // 챕터 내 전체 문장 목록 생성
    const allSentences: string[] = []
    for (const para of chap.paragraphs) {
      const sentences = splitSentences(para)
      allSentences.push(...sentences)
    }

    const charCount = allSentences.reduce((sum, s) => sum + s.length, 0)

    // chapters insert
    const { error: chapError } = await supabase.from('chapters').insert({
      id: chapterId,
      book_id: book.id,
      slug: chapterSlug,
      title: chap.title,
      order_index: ci,
      char_count: charCount,
    })

    if (chapError) {
      console.error(`❌ 챕터 insert 실패 (${chapterId}):`, chapError.message)
      continue
    }

    // sentences insert (배치)
    const sentenceRows = allSentences.map((content, si) => ({
      id: `${chapterId}_s${String(si + 1).padStart(3, '0')}`,
      chapter_id: chapterId,
      book_id: book.id,
      order_index: si,
      content,
      version: book.version,
    }))

    // 100개씩 배치 insert
    for (let i = 0; i < sentenceRows.length; i += 100) {
      const batch = sentenceRows.slice(i, i + 100)
      const { error: sentError } = await supabase.from('sentences').insert(batch)
      if (sentError) {
        console.error(`❌ 문장 insert 실패 (챕터 ${chapterId}, 배치 ${i}):`, sentError.message)
      }
    }

    totalSentences += allSentences.length
    console.log(`  ✓ ${chap.title} — ${allSentences.length}문장 (${charCount}자)`)
  }

  console.log(`\n🎉 완료! 총 ${chapters.length}챕터, ${totalSentences}문장 저장됨`)
}

// CLI 실행
const [, , docxArg, slugArg] = process.argv
if (!docxArg || !slugArg) {
  console.error('사용법: npx tsx scripts/seed.ts <docx파일경로> <book-slug>')
  process.exit(1)
}

seed(path.resolve(docxArg), slugArg).catch(err => {
  console.error(err)
  process.exit(1)
})
