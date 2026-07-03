import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const bookingId = formData.get('booking_id') as string
    const taskId = formData.get('task_id') as string | null
    const photoType = formData.get('photo_type') as 'before' | 'after'

    if (!file || !bookingId || !photoType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!UUID_REGEX.test(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 })
    }

    if (!['before', 'after'].includes(photoType)) {
      return NextResponse.json({ error: 'Invalid photo type' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 })
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, managed_client_id, employee_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

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
