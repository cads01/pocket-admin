import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
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
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { booking_id } = await req.json()
    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()
    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.escrow_status !== 'held') {
      return NextResponse.json({ error: 'Escrow is not in held status' }, { status: 400 })
    }
    if (booking.inspection_status !== 'approved') {
      return NextResponse.json({ error: 'Inspection not approved' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.amount * 100),
      currency: 'usd',
      metadata: { booking_id, type: 'escrow_release' },
      automatic_payment_methods: { enabled: true },
    })

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('stripe_account_id')
      .eq('id', booking.cleaner_id)
      .single()

    if (!cleaner?.stripe_account_id) {
      return NextResponse.json({ error: 'Cleaner has no Stripe account' }, { status: 400 })
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(booking.cleaner_amount * 100),
      currency: 'usd',
      destination: cleaner.stripe_account_id,
      transfer_group: booking_id,
      metadata: { booking_id, payment_intent_id: paymentIntent.id },
    })

    await supabase
      .from('bookings')
      .update({
        escrow_status: 'released',
        payment_status: 'completed',
        status: 'completed',
        payment_intent_id: paymentIntent.id,
      })
      .eq('id', booking_id)

    await supabase.from('escrow_transactions').insert({
      booking_id,
      amount: booking.cleaner_amount,
      status: 'released',
      stripe_transfer_id: transfer.id,
      released_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Escrow release error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
