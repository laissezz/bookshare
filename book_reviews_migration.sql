-- book_reviews 테이블
CREATE TABLE IF NOT EXISTS book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  nickname text NOT NULL DEFAULT '익명 독자',
  content text NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='book_reviews' AND policyname='public read') THEN
    CREATE POLICY "public read" ON book_reviews FOR SELECT USING (is_deleted = false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='book_reviews' AND policyname='public insert') THEN
    CREATE POLICY "public insert" ON book_reviews FOR INSERT WITH CHECK (true);
  END IF;
END $$;
