import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const slug = formData.get('slug') as string
  const file = formData.get('cover') as File

  if (!slug || !file) return NextResponse.json({ error: '필수 값 누락' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `covers/${slug}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from('bookshare')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('bookshare').getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl })
}
