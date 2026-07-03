import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Business = {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export type Profile = {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: 'admin' | 'cleaner' | 'customer' | 'employee'
  avatar_url: string | null
  business_id: string | null
  created_at: string
}

export type ManagedClient = {
  id: string
  business_id: string | null
  name: string
  business: string | null
  email: string | null
  phone: string | null
  address: string | null
  schedule: string | null
  price_per_job: number
  since: string
  mrr: number
  status: 'active' | 'trial' | 'churned'
  notes: string | null
  total_jobs: number
  total_spent: number
  created_at: string
}

export type Employee = {
  id: string
  business_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  hourly_rate: number
  per_job_rate: number
  pay_type: 'hourly' | 'per_job' | 'both'
  status: 'active' | 'suspended' | 'terminated'
  hire_date: string
  rating: number
  completion_rate: number
  punctuality_score: number
  missed_jobs: number
  total_jobs: number
  skills: string[]
  certifications: string[]
  stripe_account_id: string | null
  notes: string | null
  created_at: string
}

export type Booking = {
  id: string
  customer_id: string | null        // deprecated — use managed_client_id
  cleaner_id: string | null         // deprecated — use employee_id
  managed_client_id: string | null
  employee_id: string | null
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'reviewed' | 'cancelled'
  scheduled_date: string
  duration: number
  amount: number
  platform_fee: number
  cleaner_amount: number
  address: string | null
  notes: string | null
  payment_intent_id: string | null
  payment_status: string
  escrow_status: 'held' | 'approved' | 'released' | 'disputed'
  inspection_status: 'pending' | 'approved' | 'flagged'
  recovery_deadline: string | null
  recovery_status: 'none' | 'requested' | 'in_progress' | 'resolved'
  created_at: string
}

export type BookingTask = {
  id: string
  booking_id: string
  room: string
  task: string
  is_completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
}

export type TaskPhoto = {
  id: string
  booking_id: string
  task_id: string | null
  photo_type: 'before' | 'after'
  url: string
  uploaded_by: string | null
  created_at: string
}

export type Review = {
  id: string
  booking_id: string
  customer_id: string | null       // deprecated
  cleaner_id: string | null        // deprecated
  managed_client_id: string | null
  employee_id: string | null
  rating: number
  comment: string | null
  created_at: string
}

export type ClockEvent = {
  id: string
  employee_id: string
  booking_id: string | null
  clock_in: string
  clock_out: string | null
  gps_lat: number | null
  gps_lng: number | null
  duration_minutes: number | null
}

export type EmployeeWarning = {
  id: string
  employee_id: string
  warning_type: 'low_rating' | 'high_missed' | 'low_punctuality' | 'attendance'
  message: string
  severity: 'yellow' | 'red'
  acknowledged: boolean
  created_at: string
  resolved_at: string | null
}

export type PayrollRecord = {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  hours_worked: number
  jobs_completed: number
  hourly_earnings: number
  per_job_earnings: number
  total_earnings: number
  status: 'pending' | 'paid'
  paid_at: string | null
  created_at: string
}

// Marketplace types (deprecated — kept for backward compat during migration)
export type Cleaner = {
  id: string
  profile_id: string
  business: string | null
  bio: string | null
  services: string[]
  hourly_rate: number
  verified: boolean
  active: boolean
  rating: number
  completed_jobs: number
  total_earnings: number
  stripe_account_id: string | null
  experience: string | null
  video_profile_url: string | null
  route_preferences: Record<string, any>
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

export type Payout = {
  id: string
  cleaner_id: string
  amount: number
  period: string | null
  status: 'pending' | 'paid'
  paid_at: string | null
  created_at: string
}

export type CleanerVideo = {
  id: string
  cleaner_id: string
  title: string | null
  url: string
  video_type: 'youtube' | 'tiktok' | 'upload'
  thumbnail_url: string | null
  is_published: boolean
  created_at: string
}

export type CleanerLocation = {
  id: string
  cleaner_id: string
  employee_id: string | null
  booking_id: string | null
  lat: number
  lng: number
  heading: number | null
  speed: number | null
  is_en_route: boolean
  updated_at: string
}

// Shared types
export type WaitlistSignup = {
  id: string
  name: string
  business: string | null
  email: string | null
  phone: string | null
  team_size: number
  pain_point: string | null
  signed_up_at: string
}

export type EscrowTransaction = {
  id: string
  booking_id: string
  amount: number
  status: 'held' | 'approved' | 'released' | 'refunded'
  stripe_transfer_id: string | null
  held_at: string
  released_at: string | null
  created_at: string
}

export type InspectionReport = {
  id: string
  booking_id: string
  client_approved: boolean
  flagged_areas: string[]
  client_notes: string | null
  reviewed_at: string | null
  created_at: string
}

export type Dispute = {
  id: string
  booking_id: string
  raised_by: string
  dispute_type: 'scope_creep' | 'missed_area' | 'quality' | 'other'
  description: string
  status: 'open' | 'in_review' | 'resolved' | 'dismissed'
  resolution: string | null
  partial_credit: number | null
  created_at: string
  resolved_at: string | null
}

export type DisputeMessage = {
  id: string
  dispute_id: string
  sender_id: string
  message: string
  created_at: string
}
