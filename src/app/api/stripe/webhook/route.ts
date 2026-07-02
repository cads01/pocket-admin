import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any
    const bookingId = pi.metadata?.booking_id

    if (bookingId) {
      await supabase
        .from('bookings')
        .update({ status: 'completed', payment_intent_id: pi.id })
        .eq('id', bookingId)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any
    const bookingId = pi.metadata?.booking_id

    if (bookingId) {
      await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', bookingId)
    }
  }

  if (event.type === 'transfer.created') {
    const transfer = event.data.object as any
    console.log('Transfer created:', transfer.id)
  }

  return NextResponse.json({ received: true })
}
