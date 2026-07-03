'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import { Star, MapPin, Shield } from 'lucide-react'

export default function CustomerBookPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [cleaners, setCleaners] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [date, setDate] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'browse' | 'book' | 'done'>('browse')
  const [bookingId, setBookingId] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    loadCleaners()
  }, [user, loading])

  async function loadCleaners() {
    if (!supabase) return
    const { data } = await supabase
      .from('employees')
      .select('*, profile:profiles!employees_profile_id_fkey(name, avatar_url)')
      .eq('verified', true)
      .eq('active', true)
    if (data) setCleaners(data)
  }

  const rate = selected?.hourly_rate || 50
  const total = rate * hours
  const fee = total * 0.15
  const cleanerCut = total - fee

  async function book() {
    if (!supabase) return
    if (!selected || !date || !address) return
    setSubmitting(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user!.id)
      .single()

    if (!profile) return

    const { data: managedClient } = await supabase
      .from('managed_clients')
      .select('id')
      .eq('profile_id', user!.id)
      .maybeSingle()

    let managedClientId = managedClient?.id
    if (!managedClientId) {
      const { data: newC } = await supabase
        .from('managed_clients')
        .insert({ profile_id: user!.id })
        .select('id')
        .single()
      if (newC) managedClientId = newC.id
    }

    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        managed_client_id: managedClientId,
        employee_id: selected.id,
        scheduled_date: date,
        duration: hours,
        amount: Math.round(total),
        platform_fee: Math.round(fee),
        cleaner_amount: Math.round(cleanerCut),
        address,
        status: 'requested',
      })
      .select('id')
      .single()

    if (booking) {
      setBookingId(booking.id)
      setStep('done')
    }
    setSubmitting(false)
  }

  if (step === 'done') return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold mb-2">Booking Requested!</h1>
        <p className="text-sm text-[#888] mb-4">We&apos;ll notify you when {selected?.profile?.name || 'the cleaner'} confirms.</p>
        <p className="text-xs text-[#555] mb-6">Booking ID: {bookingId.slice(0, 8)}</p>
        <button onClick={() => router.push('/book')} className="px-6 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">
          Book Another
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 bg-[#0a0a0a] border-b border-[#1a1a1a] px-4 py-3 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-bold">{step === 'book' ? 'Book Cleaner' : 'Find a Cleaner'}</h1>
          {user && (
            <button onClick={() => router.push('/login')} className="text-xs text-[#888] cursor-pointer">Sign Out</button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-12">
        {step === 'browse' && (
          <>
            <div className="relative mb-4">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                placeholder="Enter your address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
              />
            </div>

            {cleaners.length === 0 ? (
              <div className="text-center py-20 text-[#555]">
                <div className="text-4xl mb-3 opacity-30">🧹</div>
                <p className="text-sm">No cleaners available right now</p>
              </div>
            ) : (
              cleaners.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelected(c); setStep('book') }}
                  className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-3 hover:border-[#2a2a2a] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center text-lg font-bold text-[#00d28e] flex-shrink-0">
                      {c.profile?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{c.profile?.name || 'Cleaner'}</h3>
                      <div className="flex items-center gap-1 text-sm text-[#ffd700]">
                        <Star size={12} fill="#ffd700" />
                        <span className="text-[#ccc]">{c.rating || '5.0'}</span>
                        <span className="text-[#555]">· {c.completed_jobs || 0} jobs</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#00d28e]">${c.hourly_rate}/hr</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-[#888]">
                    <Shield size={12} />
                    <span>Verified</span>
                    <span className="text-[#333]">·</span>
                    <span>{c.experience || 'Experienced'}</span>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {step === 'book' && selected && (
          <div>
            <button onClick={() => setStep('browse')} className="text-sm text-[#888] mb-4 hover:text-white cursor-pointer">
              ← Back
            </button>

            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
              <h3 className="font-semibold">{selected.profile?.name || 'Cleaner'}</h3>
              <div className="flex items-center gap-1 text-sm text-[#ffd700] mt-1">
                <Star size={12} fill="#ffd700" />
                <span className="text-[#ccc]">{selected.rating || '5.0'}</span>
              </div>
              <p className="text-sm text-[#888] mt-1">{selected.bio || 'Professional cleaner'}</p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  placeholder="123 Main St"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#aaa] block mb-1">Duration</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      onClick={() => setHours(h)}
                      className={`flex-1 py-2 rounded-lg text-sm border cursor-pointer ${
                        hours === h
                          ? 'bg-[#00d28e] text-[#0a0a0a] border-[#00d28e] font-semibold'
                          : 'bg-[#1a1a1a] text-[#888] border-[#2a2a2a] hover:border-[#00d28e]'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 mb-4">
              <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Price Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#888]">{hours}h × ${rate}/hr</span>
                  <span>${total}</span>
                </div>
                <div className="flex justify-between text-[#ffd700]">
                  <span>Platform fee (15%)</span>
                  <span>-${fee.toFixed(0)}</span>
                </div>
                <div className="border-t border-[#1a1a1a] pt-1 flex justify-between font-bold">
                  <span className="text-[#00d28e">Cleaner receives</span>
                  <span className="text-[#00d28e]">${cleanerCut.toFixed(0)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={book}
              disabled={submitting || !date || !address}
              className="w-full py-3 bg-[#00d28e] text-[#0a0a0a] font-bold rounded-xl text-sm hover:bg-[#00e89c] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Booking...' : 'Book Now'}
            </button>
            <p className="text-xs text-[#555] text-center mt-2">Pay when service is complete</p>
          </div>
        )}
      </main>
    </div>
  )
}
