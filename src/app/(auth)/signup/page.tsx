'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'cleaner' | 'customer'>('cleaner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!supabase) return

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        name,
        role,
      })

      if (role === 'cleaner') {
        await supabase.from('cleaners').insert({
          profile_id: authData.user.id,
          business: name + "'s Cleaning",
          services: ['standard'],
        })
      } else {
        await supabase.from('customers').insert({
          profile_id: authData.user.id,
        })
      }
    }

    router.push('/app')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Pocket <span className="text-[#00d28e]">Admin</span>
          </h1>
          <p className="text-[#888] text-sm mt-2">Create your account</p>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                placeholder="Sarah Johnson"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                placeholder="you@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#aaa] mb-1">
                I am a...
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('cleaner')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    role === 'cleaner'
                      ? 'bg-[#00d28e] text-[#0a0a0a]'
                      : 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]'
                  }`}
                >
                  Cleaner
                </button>
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    role === 'customer'
                      ? 'bg-[#00d28e] text-[#0a0a0a]'
                      : 'bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]'
                  }`}
                >
                  Customer
                </button>
              </div>
            </div>

            {error && <p className="text-[#ff5050] text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00d28e] text-[#0a0a0a] font-bold rounded-lg text-sm hover:bg-[#00e89c] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#555] mt-4">
            Already have an account?{' '}
            <a href="/login" className="text-[#00d28e] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
