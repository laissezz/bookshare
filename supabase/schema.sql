-- ============================================================
-- 온라인 이북 리더 플랫폼 스키마
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 실행하세요
-- ============================================================

-- books
CREATE TABLE books (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  author      TEXT NOT NULL,
  cover_url   TEXT,
  description TEXT,
  published   BOOLEAN DEFAULT false,
  version     INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- chapters
CREATE TABLE chapters (
  id          TEXT PRIMARY KEY,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  char_count  INTEGER DEFAULT 0,
  UNIQUE(book_id, slug)
);

-- sentences
CREATE TABLE sentences (
  id          TEXT PRIMARY KEY,
  chapter_id  TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  version     INTEGER DEFAULT 1
);

-- highlights
CREATE TABLE highlights (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sentence_id, session_id)
);

-- comments
CREATE TABLE comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  nickname    TEXT DEFAULT '익명 독자',
  content     TEXT NOT NULL,
  is_deleted  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- reviews
CREATE TABLE reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  content     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, session_id)
);

-- 집계 뷰
CREATE VIEW sentence_stats AS
SELECT
  h.sentence_id,
  COUNT(DISTINCT h.session_id) AS highlight_count,
  (
    SELECT COUNT(*) FROM comments c
    WHERE c.sentence_id = h.sentence_id AND c.is_deleted = false
  ) AS comment_count
FROM highlights h
GROUP BY h.sentence_id;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE books     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews   ENABLE ROW LEVEL SECURITY;

-- books: 공개된 책만 독자에게 노출
CREATE POLICY "public_read" ON books FOR SELECT USING (published = true);

-- chapters: 공개 책의 챕터만 읽기
CREATE POLICY "public_read" ON chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM books WHERE id = chapters.book_id AND published = true)
);

-- sentences: 공개 책의 문장만 읽기, 쓰기 차단
CREATE POLICY "public_read" ON sentences FOR SELECT USING (
  EXISTS (SELECT 1 FROM books WHERE id = sentences.book_id AND published = true)
);

-- highlights: 누구나 읽기 + 쓰기
CREATE POLICY "public_read"   ON highlights FOR SELECT USING (true);
CREATE POLICY "insert_own"    ON highlights FOR INSERT WITH CHECK (true);
CREATE POLICY "delete_own"    ON highlights FOR DELETE USING (true);

-- comments: 삭제되지 않은 것만 읽기, 누구나 쓰기
CREATE POLICY "public_read" ON comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "insert_own"  ON comments FOR INSERT WITH CHECK (true);

-- reviews: 누구나 읽기 + 쓰기 + 수정
CREATE POLICY "public_read"   ON reviews FOR SELECT USING (true);
CREATE POLICY "insert_own"    ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "update_own"    ON reviews FOR UPDATE USING (true);
