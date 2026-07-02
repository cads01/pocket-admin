import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: 'admin' | 'cleaner' | 'customer'
  avatar_url: string | null
  created_at: string
}

export type Cleaner = {
  id: string
  profile_id: string
  business: string | null
  bio: string | null
  services: string[]
  hourly_rate: number
  is_verified: boolean
  status: 'active' | 'suspended'
  rating: number
  total_jobs: number
  total_earnings: number
  stripe_account_id: string | null
  created_at: string
}

export type Customer = {
  id: string
  profile_id: string
  default_address: string | null
  notes: string | null
  total_jobs: number
  total_spent: number
  created_at: string
}

export type Booking = {
  id: string
  cleaner_id: string
  customer_id: string
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'reviewed' | 'cancelled'
  service_type: string
  scheduled_date: string
  scheduled_time: string
  amount: number
  platform_fee: number
  cleaner_payout: number
  address: string | null
  notes: string | null
  created_at: string
}

export type Review = {
  id: string
  booking_id: string
  customer_id: string
  cleaner_id: string
  rating: number
  comment: string | null
  created_at: string
}

export type Payout = {
  id: string
  cleaner_id: string
  amount: number
  period: string | null
  status: 'pending' | 'paid'
  paid_at: string | null
  created_at: string
}
