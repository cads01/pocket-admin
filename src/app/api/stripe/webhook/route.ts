import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any
    const bookingId = pi.metadata?.booking_id

    if (bookingId) {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed', payment_intent_id: pi.id })
        .eq('id', bookingId)

      if (error) console.error('Webhook: failed to update booking:', error)
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as any
    const bookingId = pi.metadata?.booking_id

    if (bookingId) {
      const { error } = await supabase
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', bookingId)

      if (error) console.error('Webhook: failed to update payment failure:', error)
    }
  }

  if (event.type === 'transfer.created') {
    const transfer = event.data.object as any
    console.log('Transfer created:', transfer.id)
  }

  return NextResponse.json({ received: true })
}
