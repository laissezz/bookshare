export interface Book {
  id: string
  slug: string
  title: string
  subtitle: string | null
  author: string
  cover_url: string | null
  description: string | null
  published: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  book_id: string
  slug: string
  title: string
  order_index: number
  char_count: number
}

export interface Sentence {
  id: string
  chapter_id: string
  book_id: string
  order_index: number
  content: string
  paragraph_index: number
  is_html: boolean
  version: number
}

export interface Highlight {
  id: string
  sentence_id: string
  book_id: string
  session_id: string
  created_at: string
}

export interface Comment {
  id: string
  sentence_id: string
  book_id: string
  session_id: string
  nickname: string
  content: string
  is_deleted: boolean
  created_at: string
}

export interface Review {
  id: string
  book_id: string
  session_id: string
  rating: number
  content: string | null
  created_at: string
}

export interface SentenceStats {
  sentence_id: string
  highlight_count: number
  comment_count: number
}
