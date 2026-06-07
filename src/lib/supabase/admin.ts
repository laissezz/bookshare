import { createClient } from '@supabase/supabase-js'

// 서버사이드 전용 — 클라이언트 코드에서 절대 import 금지
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
