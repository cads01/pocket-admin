import { loadStripe } from '@stripe/stripe-js'
import Stripe from 'stripe'

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
})

export const PLATFORM_COMMISSION = 0.15

export function calculateFees(amount: number) {
  const platformFee = Math.round(amount * PLATFORM_COMMISSION * 100) / 100
  const cleanerPayout = amount - platformFee
  return { platformFee, cleanerPayout }
}
