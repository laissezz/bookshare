# 프로젝트: 온라인 이북 리더 플랫폼

## 프로젝트 개요

여러 권의 책을 올릴 수 있는 **온라인 이북 리더 플랫폼**을 만든다. 관리자가 책을 등록하면 독자는 가입 없이 읽을 수 있고, 문장을 탭/클릭해서 하이라이트하거나 비슷한 경험을 댓글로 남길 수 있다. 아마존 Kindle 웹 리더 + 소셜 독서 플랫폼 콘셉트.

**1호 책:** '딸깍'하지 않은 생각들 — AI와 함께 일하며 변하는 감각들 (저자: 성준)

---

## 기술 스택

- **Frontend:** Next.js (App Router)
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **배포:** Vercel
- **스타일링:** Tailwind CSS

---

## URL 구조

```
/                          ← 홈 (책 목록)
/books/[slug]              ← 책 표지 + 소개 페이지
/books/[slug]/[chapter]         ← 독자 읽기 페이지
/books/[slug]/highlights        ← 인기 문장 모아보기
/admin                          ← 관리자 대시보드
/admin/books               ← 책 목록 관리
/admin/books/[id]          ← 책 상세 편집
/admin/books/[id]/comments ← 댓글 관리
```

**접속 예시:**
```
dalkkak.com/books/dalkkak          ← 딸깍하지 않은 생각들
dalkkak.com/books/perfcoach        ← 다음 책
```

---

## 데이터베이스 스키마 (Supabase)

### `books` 테이블
```sql
CREATE TABLE books (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,        -- URL용 식별자 (예: "dalkkak")
  title       TEXT NOT NULL,
  subtitle    TEXT,
  author      TEXT NOT NULL,
  cover_url   TEXT,                        -- Supabase Storage URL
  description TEXT,                        -- 책 소개 (홈 카드에 표시)
  published   BOOLEAN DEFAULT false,       -- false = 비공개 (독자에게 안 보임)
  version     INTEGER DEFAULT 1,           -- 내용 수정 시 increment
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
```

### `chapters` 테이블
```sql
CREATE TABLE chapters (
  id          TEXT PRIMARY KEY,            -- 예: "dalkkak_ch01"
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,               -- URL용 (예: "ch01")
  title       TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  UNIQUE(book_id, slug)
);
```

### `sentences` 테이블 (읽기 전용 — 책 원문)
```sql
CREATE TABLE sentences (
  id          TEXT PRIMARY KEY,            -- 예: "dalkkak_ch01_s001"
  chapter_id  TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  version     INTEGER DEFAULT 1            -- books.version과 동기화
);
```

### `highlights` 테이블
```sql
CREATE TABLE highlights (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,               -- 익명 사용자 UUID (localStorage)
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### `comments` 테이블
```sql
CREATE TABLE comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentence_id TEXT REFERENCES sentences(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  nickname    TEXT DEFAULT '익명 독자',
  content     TEXT NOT NULL,
  is_deleted  BOOLEAN DEFAULT false,       -- 관리자 삭제 (소프트 딜리트)
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 집계 뷰 (성능용)
```sql
CREATE VIEW sentence_stats AS
SELECT
  sentence_id,
  COUNT(DISTINCT session_id) AS highlight_count,
  (SELECT COUNT(*) FROM comments c WHERE c.sentence_id = s.sentence_id AND c.is_deleted = false) AS comment_count
FROM highlights s
GROUP BY sentence_id;
```

---

## RLS (Row Level Security) 정책

```sql
-- books: 공개 책만 독자에게 노출
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON books FOR SELECT USING (published = true);

-- sentences: 공개 책의 문장만 읽기 가능, 쓰기 불가
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON sentences FOR SELECT USING (
  EXISTS (SELECT 1 FROM books WHERE id = sentences.book_id AND published = true)
);

-- highlights: 누구나 읽기, 본인 session_id만 쓰기
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON highlights FOR SELECT USING (true);
CREATE POLICY "insert_own" ON highlights FOR INSERT WITH CHECK (true);

-- comments: 누구나 읽기, 스팸 방지 (동일 session_id + sentence_id 하루 3회 제한은 앱 레이어에서 처리)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "insert_own" ON comments FOR INSERT WITH CHECK (true);
```

---

## 핵심 기능 명세

### 1. 홈페이지 (`/`)
- 공개된 책 카드 그리드 (표지 이미지, 제목, 저자, 소개 한 줄)
- 책 카드 클릭 → `/books/[slug]`로 이동

### 2. 책 소개 페이지 (`/books/[slug]`)
- 표지 이미지, 제목, 부제, 저자, 소개글
- 목차 리스트
- "읽기 시작" 버튼 → 첫 챕터로 이동

### 3. 독자 읽기 페이지 (`/books/[slug]/[chapter]`)

**레이아웃:**
```
[데스크탑]
┌────────────────────────────────────────┐
│ 헤더: 책 제목 | 목차 드롭다운 | ⚙설정  │
├───────────┬────────────────────────────┤
│ 목차      │ 본문 (max-width: 680px)    │
│ 사이드바  │ 문장들                     │
└───────────┴────────────────────────────┘

[모바일]
┌──────────────────┐
│ 헤더 + ⚙설정     │
│                  │
│ 본문 (full width)│
│ padding: 20px    │
│                  │
│ [하단 목차 탭]   │
└──────────────────┘
```

**문장 인터랙션:**
- 책 텍스트를 문장 단위로 파싱하여 `<span data-sentence-id="...">` 태그로 렌더링
- **데스크탑:** 문장 클릭 → 하이라이트 토글
- **모바일/아이패드:** 문장 탭 한 번 → 하이라이트 토글 (드래그 없음)
- 하이라이트된 문장 배경색 (인기도에 따라):
  - 1~4명: `#FFF9C4` (연한 노랑)
  - 5~14명: `#FFF176` (중간 노랑)
  - 15명 이상: `#FFEE58` (진한 노랑, popular highlight)
- 하이라이트 클릭 시 팝업:
  - "💛 n명이 이 문장에 공감했어요"
  - "경험 남기기 →" 버튼
  - 기존 댓글 목록

**댓글 입력:**
- 입력창 placeholder: "이 문장에서 비슷한 경험이 있으신가요?"
- 닉네임 입력 (선택, 기본값: "익명 독자")
- 동일 session_id + sentence_id 하루 3회 이상 댓글 불가 (앱 레이어 체크)

**읽기 진도 저장:**
- 독자가 읽다가 이탈한 마지막 sentence_id를 localStorage에 저장
- 재방문 시 해당 위치로 자동 스크롤 + "여기서 이어 읽으시겠어요?" 토스트 표시
- localStorage key: `reading_progress_[slug]` (JSON: { chapterSlug, sentenceId })

### 4. 읽기 설정 컨트롤 패널 (⚙)
헤더 우측 설정 아이콘 클릭 시 슬라이드다운 (모바일은 하단 시트)

**UI:**
```
[ 테마     ]  [라이트 ●] [세피아 ○] [다크 ○]
[ 밝기     ]  🌙 ──●────────── ☀  85
[ 글자 크기]  [A-]  18px  [A+]
[ 줄 간격  ]  [ - ]  1.9  [ + ]
[ 글자 간격]  [ - ]  0px  [ + ]
[ 본문 너비]  [좁게] [보통] [넓게]
[ 폰트     ]  [명조 ●] [고딕 ○]
               [ 초기화 ]
```

**조절 항목:**

| 항목 | 범위 | 기본값 | 단계 |
|------|------|--------|------|
| 테마 | 라이트 / 세피아 / 다크 | 라이트 | 3가지 |
| 밝기 | 60~100 | 100 | 슬라이더 |
| 글자 크기 | 14px~24px | 모바일 18px / 데스크탑 20px | 2px |
| 줄 간격 | 1.6~2.4 | 1.9 | 0.1 |
| 글자 간격 | -0.5px~2px | 0px | 0.5px |
| 본문 너비 | 좁게/보통/넓게 | 보통 | 3단계 |
| 폰트 | 명조/고딕 | 명조 | 2가지 |

**테마 색상:**
- 라이트: 배경 `#ffffff`, 글씨 `#1a1a1a`
- 세피아: 배경 `#f5f0e8`, 글씨 `#3b2f1e`
- 다크: 배경 `#1a1a1a`, 글씨 `#e8e3d8` (선택 시 밝기 기본값 85로 자동 조정)

**기술 구현:**
- CSS custom properties (`--reader-font-size`, `--reader-line-height`, `--reader-letter-spacing`, `--reader-max-width`, `--reader-font-family`, `--reader-bg`, `--reader-text-color`)를 `.reader-content`에 동적 적용
- 밝기: `position: fixed`의 `.brightness-overlay` div에 `background: rgba(0,0,0,N)` 조절
- 설정값 localStorage key: `reader_settings` (JSON), 재방문 시 복원

### 5. 인기 문장 페이지 (`/books/[slug]/highlights`)
- 해당 책에서 가장 많이 하이라이트된 문장 Top 20 표시
- 문장 + 챕터명 + 하이라이트 수 + 댓글 수
- 문장 클릭 → 해당 챕터 읽기 페이지로 이동 (해당 문장으로 스크롤)
- SNS 공유 버튼 (카카오, 트위터/X) — 문장 텍스트 + 책 제목 + URL 포함
- 책 소개 페이지에 "이 책의 인기 문장 보기 →" 링크 제공

### 6. 관리자 페이지 (`/admin`)

**인증:** Supabase Auth 이메일+패스워드. 관리자 계정만 접근 가능 (middleware로 보호).

**기능:**

| 메뉴 | 기능 |
|------|------|
| 책 목록 | 등록된 책 전체 조회, 공개/비공개 토글 |
| 책 등록 | 제목, 부제, 저자, slug, 소개글, 표지 이미지 업로드 |
| 내용 업로드 | docx 또는 txt 파일 업로드 → 자동 파싱 → sentences 테이블 seed |
| 내용 수정 | 오탈자 등 문장 content 직접 수정 (sentence_id 유지) |
| 버전 관리 | 대규모 수정 시 version increment → 기존 highlights/comments 보존 |
| 독자 통계 | 책별 하이라이트 수, 댓글 수, 인기 문장 Top 10 |
| OG 태그 설정 | 책별 SNS 미리보기 제목, 설명, 이미지 설정 (Next.js generateMetadata 연동) |
| 댓글 관리 | 부적절한 댓글 소프트 딜리트 (is_deleted = true) |

---

## 책 내용 수정 정책

| 수정 유형 | 처리 방법 | 기존 데이터 영향 |
|----------|----------|----------------|
| 오탈자·표현 다듬기 | sentence content만 UPDATE (id 유지) | 없음 |
| 문장 추가·삭제·순서 변경 | version increment + 새 sentences insert | 기존 highlights/comments는 보존 (고아 데이터로 남음) |
| 챕터 전체 재작성 | 새 version으로 전체 re-seed | 기존 데이터 보존 (비활성화) |

---

## 반응형 브레이크포인트

| 기기 | 브레이크포인트 | 특이사항 |
|------|--------------|---------|
| 모바일 | < 768px | 하단 목차 탭, 설정은 bottom sheet |
| 아이패드 | 768px~1024px | 목차 사이드바 접힘 (토글) |
| 데스크탑 | > 1024px | 목차 사이드바 항상 표시 |

---

## 책 데이터 관리

책 데이터(챕터 목록, 문장)는 `scripts/seed_[slug].ts` 파일로 관리한다. 관리자 페이지에서 docx 파일을 업로드하면 자동으로 파싱하여 seed 파일을 생성하고 DB에 저장한다.

---

## 구현 순서 (우선순위)

### Phase 1: 기반 설계
1. Supabase 프로젝트 생성 + 전체 스키마 적용 + RLS 설정
2. Next.js 프로젝트 생성 (App Router)
3. Supabase 클라이언트 연결

### Phase 2: 책 데이터 세팅
4. docx → 문장 단위 파싱 스크립트 작성 (`scripts/seed.ts`)
5. 1호 책 'dalkkak' seed 실행 (books → chapters → sentences)

### Phase 3: 독자 읽기 MVP
6. 홈 페이지 — 책 카드 목록
7. 책 소개 페이지 (`/books/[slug]`)
8. 독자 읽기 페이지 (`/books/[slug]/[chapter]`) — 문장 렌더링
9. 탭/클릭 하이라이트 + Supabase 저장 + 카운트 실시간 표시
10. Vercel 배포 (MVP 확인)

### Phase 4: 소셜 기능
11. 하이라이트 팝업 + 댓글 입력/조회
12. 익명 session_id 관리 (localStorage UUID)
13. 스팸 방지 로직
14. 읽기 진도 저장 + 이어읽기 토스트
15. 인기 문장 페이지 (`/books/[slug]/highlights`) + SNS 공유 버튼
16. 독자 피드백 (별점 + 한 줄 감상) + 홈/소개 페이지에 평균 별점 표시

### Phase 5: 읽기 경험
17. 읽기 설정 컨트롤 패널 (테마, 밝기, 글자 크기, 줄 간격, 글자 간격, 본문 너비, 폰트)
18. 목차 네비게이션 (데스크탑 사이드바, 모바일 하단 탭)
19. 읽기 예상 시간 표시 (홈 카드, 책 소개, 챕터 상단)
20. 책 내 키워드 검색
21. 문장 공유 이미지 생성 (1:1, 1.91:1 카드)
22. 모바일/아이패드 UI 최적화

### Phase 6: 완성도
23. 404 페이지 + 에러 페이지 + 로딩 skeleton UI
24. 접근성 (키보드 네비게이션, 스크린리더, 색상 대비, 터치 타겟)

### Phase 7: 관리자
25. Supabase Auth 관리자 계정 설정
26. `/admin` 미들웨어 보호
27. 관리자 대시보드 (책 등록, 내용 업로드, 공개/비공개, 댓글/리뷰 관리, 통계)
28. OG 태그 설정 (책별 SNS 미리보기 메타데이터)

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # 서버사이드 seed 스크립트 전용, 클라이언트 노출 금지
```

---

## 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출 금지
- `sentences` 테이블은 RLS로 클라이언트에서 INSERT/UPDATE/DELETE 차단
- 관리자 페이지는 Next.js middleware로 비인증 접근 차단
- 표지 이미지는 Supabase Storage `book-covers` 버킷에 저장
- 책 slug는 영문 소문자 + 하이픈만 허용 (예: `dalkkak`, `perf-coach`)

---

## 추가 기능 명세

### 7. 책 내 검색
- 헤더 돋보기 아이콘(🔍) 클릭 시 검색창 표시
- 키워드 입력 → 해당 책의 sentences 테이블에서 content ILIKE 검색
- 결과: 매칭 문장 목록 + 챕터명 표시
- 결과 클릭 → 해당 챕터 페이지로 이동 + 해당 문장 하이라이트 + 스크롤
- 모바일: 전체화면 검색 모달
- 데스크탑: 헤더 인라인 검색창 (width 애니메이션)

### 8. 문장 공유 이미지 생성
- 하이라이트 팝업 또는 인기 문장 페이지에 "이미지로 공유" 버튼
- 문장 텍스트 + 책 제목 + 저자명을 카드 이미지로 렌더링
- 기술: `html2canvas` 또는 Next.js `/api/og` (Vercel OG Image Generation) 활용
- 카드 디자인: 책 테마 색상(세피아 계열), 문장 중앙 배치, 하단에 책 제목
- 출력: PNG 다운로드 + 카카오/인스타그램/트위터 공유 옵션
- 카드 비율: 1:1 (인스타그램), 1.91:1 (트위터/OG) 두 가지

### 9. 독자 피드백 (별점 + 한 줄 감상)

**DB 추가:**
```sql
CREATE TABLE reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  content     TEXT,                          -- 한 줄 감상 (선택)
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(book_id, session_id)                -- 1인 1리뷰
);
```

**독자 UI:**
- 마지막 챕터 끝에 "다 읽으셨나요?" 카드 표시
- 별점 1~5 선택 + 한 줄 감상 입력 (선택)
- 제출 후 "감사합니다 🙏" 메시지
- 동일 session_id 재방문 시 기존 평점 표시 (수정 가능)

**홈/책 소개 페이지:**
- 평균 별점 + 리뷰 수 표시 (예: ⭐ 4.8 · 127명)

**관리자:**
- 리뷰 목록 조회 + 부적절한 리뷰 삭제

### 10. 읽기 예상 시간
- 한국어 평균 읽기 속도 기준: 분당 500자
- 챕터별 전체 글자 수 ÷ 500 = 예상 분
- 표시 위치:
  - 책 소개 페이지 목차: 챕터명 옆에 "약 OO분"
  - 각 챕터 상단: "이 챕터 읽기 약 OO분"
  - 홈 책 카드: 전체 읽기 시간 "총 약 OO분"
- sentences 테이블 seed 시 챕터별 글자 수 자동 계산하여 chapters 테이블에 저장

**DB 추가 (chapters 테이블):**
```sql
ALTER TABLE chapters ADD COLUMN char_count INTEGER DEFAULT 0;
-- seed 시 각 챕터 sentences의 content 글자 수 합산하여 저장
```

### 11. 404 + 로딩 + 에러 처리

**404 페이지 (`app/not-found.tsx`):**
- 존재하지 않는 slug, chapter 접근 시
- 메시지: "찾을 수 없는 페이지예요"
- 홈으로 돌아가기 버튼

**로딩 상태:**
- 챕터 본문 로딩: 문장 skeleton UI (회색 줄 애니메이션)
- 하이라이트 카운트 로딩: 숫자 자리에 `-` 표시
- 댓글 로딩: 스피너

**에러 처리 (`app/error.tsx`):**
- Supabase 연결 실패 시: "잠시 연결이 원활하지 않아요. 새로고침 해주세요." + 새로고침 버튼
- 하이라이트 저장 실패 시: 토스트 "저장에 실패했어요. 다시 시도해주세요."
- 모든 Supabase 호출은 try/catch로 감싸고 사용자에게 친절한 한국어 메시지 표시

### 12. 접근성 (a11y)

**키보드 네비게이션:**
- Tab으로 문장 간 이동 가능 (`tabIndex={0}`)
- Enter/Space로 문장 하이라이트 토글
- Esc로 팝업/모달 닫기
- 목차 사이드바 키보드로 탐색 가능

**스크린리더:**
- 모든 이미지에 `alt` 속성 필수
- 하이라이트 상태: `aria-pressed="true/false"`
- 팝업: `role="dialog"`, `aria-modal="true"`, `aria-label`
- 하이라이트 카운트: `aria-label="n명이 이 문장에 공감했어요"`

**색상 대비:**
- 라이트 테마: 배경/글씨 대비율 WCAG AA 기준(4.5:1) 이상 보장
- 다크 테마 동일 기준 적용
- 하이라이트 노랑 배경 위 글씨: 검정 유지

**기타:**
- 폰트 크기 조절 시 레이아웃 깨지지 않도록 rem 단위 병행
- 모바일 터치 타겟 최소 44px × 44px (버튼, 탭 등)
