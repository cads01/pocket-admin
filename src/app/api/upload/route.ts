import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const bookingId = formData.get('booking_id') as string
    const taskId = formData.get('task_id') as string | null
    const photoType = formData.get('photo_type') as 'before' | 'after'

    if (!file || !bookingId || !photoType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${bookingId}/${photoType}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('task-photos')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('task-photos')
      .getPublicUrl(fileName)

    const { data: photo, error: dbError } = await supabase
      .from('task_photos')
      .insert({
        booking_id: bookingId,
        task_id: taskId,
        photo_type: photoType,
        url: publicUrl,
        uploaded_by: user.id,
      })
      .select('id, url, photo_type')
      .single()

    if (dbError) throw dbError

    return NextResponse.json(photo)
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
