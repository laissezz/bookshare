import mammoth from 'mammoth'

export interface ParsedSentence {
  content: string
  paragraphIndex: number
  isHtml?: boolean  // 테이블/이미지 등 HTML 블록 여부
}

export interface ParsedChapter {
  title: string
  level: number  // 1 = 장, 2 = 절
  sentences: ParsedSentence[]
  charCount: number
}

function splitSentences(paragraph: string): string[] {
  const raw = paragraph
    .split(/(?<=[.!?…]["']?\)?\s*)(?=[^\s])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

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

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, c => {
    const map: Record<string, string> = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
      '&nbsp;': ' ', '&hellip;': '…',
    }
    return map[c] ?? ' '
  }).trim()
}

export async function parseDocxBuffer(buffer: Buffer): Promise<ParsedChapter[]> {
  // 한국어/영어 Word 제목 스타일 모두 매핑
  const styleMap = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='heading 1'] => h1:fresh",
    "p[style-name='heading 2'] => h2:fresh",
    "p[style-name='heading 3'] => h3:fresh",
    "p[style-name='제목 1'] => h1:fresh",
    "p[style-name='제목 2'] => h2:fresh",
    "p[style-name='제목 3'] => h3:fresh",
    "p[style-name='표제 1'] => h1:fresh",
    "p[style-name='표제 2'] => h2:fresh",
  ]

  const result = await mammoth.convertToHtml({ buffer }, {
    styleMap,
    convertImage: mammoth.images.imgElement(image => {
      return image.read('base64').then(base64 => ({
        src: `data:${image.contentType};base64,${base64}`,
      }))
    }),
  })
  const html = result.value

  const levelMap: Record<string, number> = { h1: 1, h2: 2, h3: 3 }
  const chapters: ParsedChapter[] = []
  let currentTitle = ''
  let currentLevel = 1
  let currentSentences: ParsedSentence[] = []
  let paragraphIndex = 0

  function flush() {
    // 제목이 있으면 문장이 없어도 저장 (장이 절만 포함하는 경우)
    // 제목 없는 첫 번째 블록(Word TOC 등 사전 내용)은 무시
    if (!currentTitle) return
    const charCount = currentSentences.reduce((sum, s) => sum + (s.isHtml ? 0 : s.content.length), 0)
    chapters.push({ title: currentTitle, level: currentLevel, sentences: currentSentences, charCount })
  }

  // 최상위 태그 단위로 파싱 (p, h1-3, table, ul, ol)
  let pos = 0
  while (pos < html.length) {
    const tagStart = html.indexOf('<', pos)
    if (tagStart === -1) break

    const tagMatch = html.slice(tagStart).match(/^<(h[1-3]|p|table|ul|ol)(\s[^>]*)?>/)
    if (!tagMatch) {
      pos = tagStart + 1
      continue
    }

    const tagName = tagMatch[1]

    if (tagName === 'table') {
      // 테이블 전체를 HTML로 캡처
      const closeTag = '</table>'
      const endIdx = html.indexOf(closeTag, tagStart)
      if (endIdx === -1) { pos = tagStart + 1; continue }
      const tableHtml = html.slice(tagStart, endIdx + closeTag.length)
      currentSentences.push({ content: tableHtml, paragraphIndex, isHtml: true })
      paragraphIndex++
      pos = endIdx + closeTag.length

    } else if (tagName === 'ul' || tagName === 'ol') {
      // 리스트 전체를 HTML로 캡처 (불릿/번호 포함)
      const closeTag = `</${tagName}>`
      const endIdx = html.indexOf(closeTag, tagStart)
      if (endIdx === -1) { pos = tagStart + 1; continue }
      const listHtml = html.slice(tagStart, endIdx + closeTag.length)
      currentSentences.push({ content: listHtml, paragraphIndex, isHtml: true })
      paragraphIndex++
      pos = endIdx + closeTag.length

    } else if (tagName.startsWith('h')) {
      // 헤딩
      const closeTag = `</${tagName}>`
      const endIdx = html.indexOf(closeTag, tagStart)
      if (endIdx === -1) { pos = tagStart + 1; continue }
      const inner = html.slice(tagStart + tagMatch[0].length, endIdx)
      const text = stripHtml(inner)
      if (text) {
        flush()
        currentTitle = text
        currentLevel = levelMap[tagName] ?? 1
        currentSentences = []
        paragraphIndex = 0
      }
      pos = endIdx + closeTag.length

    } else {
      // <p> 태그
      const endIdx = html.indexOf('</p>', tagStart)
      if (endIdx === -1) { pos = tagStart + 1; continue }
      const inner = html.slice(tagStart + tagMatch[0].length, endIdx)

      if (inner.includes('<img')) {
        // 이미지 → HTML 블록
        currentSentences.push({ content: inner, paragraphIndex, isHtml: true })
        paragraphIndex++
      } else {
        const text = stripHtml(inner)
        if (text) {
          const sentences = splitSentences(text)
          for (const content of sentences) {
            currentSentences.push({ content, paragraphIndex })
          }
          paragraphIndex++
        }
      }
      pos = endIdx + '</p>'.length
    }
  }
  flush()

  return chapters
}
