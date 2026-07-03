'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupabaseProvider, useSupabase } from '@/components/SupabaseProvider'

function LandingContent() {
  const { supabase, loading } = useSupabase()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [teamSize, setTeamSize] = useState(1)
  const [painPoint, setPainPoint] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    supabase?.auth.getUser().then(({ data: { user } }) => {
      if (user) { window.location.href = '/app'; return }
      setChecking(false)
    })
  }, [loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !supabase) return
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('waitlist_signups').insert({
      name, business, email, phone, team_size: teamSize, pain_point: painPoint,
    })

    if (err) {
      if (err.message?.includes('row-level security')) {
        setError('Server configuration issue — please try again later.')
      } else {
        setError(err.message)
      }
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  if (checking) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-[#555]">Loading...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-[#161616] px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-xl font-bold">Pocket <span className="text-[#00d28e]">Admin</span></h1>
        <div className="flex gap-4">
          <a href="/login" className="text-sm text-[#888] hover:text-white transition-colors no-underline">Sign in</a>
          <a href="/signup" className="text-sm px-4 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#00e89c] transition-colors no-underline">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h2 className="text-5xl font-bold tracking-tight mb-4">
          You clean.<br />
          <span className="text-[#00d28e]">We do everything else.</span>
        </h2>
        <p className="text-lg text-[#888] max-w-xl mx-auto mb-8">
          Pocket Admin handles scheduling, invoicing, payments, reviews, and client management — so you can focus on cleaning.
        </p>
        <div className="flex justify-center gap-3">
          <a href="/signup" className="px-6 py-3 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-xl no-underline">Join the waitlist</a>
          <a href="/login" className="px-6 py-3 bg-[#111] border border-[#222] rounded-xl text-sm no-underline">Sign in →</a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: '📅', title: 'Smart Scheduling', desc: 'Automated booking, reminders, and route optimization' },
            { icon: '💰', title: 'Payment Processing', desc: 'Stripe integration with escrow, invoicing, and transfer' },
            { icon: '📊', title: 'Ops Dashboard', desc: 'Waitlist, client management, analytics, and checklists' },
            { icon: '🧹', title: 'Task Management', desc: 'Room-by-room checklists with before/after photos' },
            { icon: '⭐', title: 'Review System', desc: 'Automated review requests and reputation management' },
            { icon: '📱', title: 'Mobile Apps', desc: 'Cleaner and client apps for job management on the go' },
          ].map(f => (
            <div key={f.title} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-[#888]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist Form */}
      <section className="max-w-xl mx-auto px-6 pb-24">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-2 text-center">Get early access</h3>
          <p className="text-[#888] text-sm text-center mb-6">Join the waitlist — we'll onboard you when we launch in your area.</p>

          {submitted ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-[#00d28e] font-semibold">You're on the list!</p>
              <p className="text-sm text-[#888] mt-1">We'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#888] block mb-1">Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} required
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                </div>
                <div>
                  <label className="text-xs text-[#888] block mb-1">Business</label>
                  <input value={business} onChange={e => setBusiness(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#888] block mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
              </div>
              <div>
                <label className="text-xs text-[#888] block mb-1">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#888] block mb-1">Team size</label>
                  <select value={teamSize} onChange={e => setTeamSize(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'solo operator' : 'person team'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#888] block mb-1">Biggest pain point</label>
                  <select value={painPoint} onChange={e => setPainPoint(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]">
                    <option value="">Select...</option>
                    <option value="finding_clients">Finding clients</option>
                    <option value="scheduling">Scheduling/route planning</option>
                    <option value="payments">Getting paid on time</option>
                    <option value="invoicing">Invoicing/bookkeeping</option>
                    <option value="reviews">Customer reviews</option>
                    <option value="other">Something else</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-[#ff5050]">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-xl cursor-pointer disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Join the waitlist'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#161616] py-8 text-center text-sm text-[#555]">
        Pocket Admin — You clean. We do everything else.
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return (
    <SupabaseProvider>
      <LandingContent />
    </SupabaseProvider>
  )
}
