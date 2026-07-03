'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!supabase) return

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/app'
  }

  async function handleGoogleLogin() {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Pocket <span className="text-[#00d28e]">Admin</span>
          </h1>
          <p className="text-[#888] text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm font-medium hover:bg-[#2a2a2a] transition-colors mb-4 cursor-pointer"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="text-[#555] text-xs">or</span>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
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
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <p className="text-[#ff5050] text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00d28e] text-[#0a0a0a] font-bold rounded-lg text-sm hover:bg-[#00e89c] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[#555] mt-4">
            Don't have an account?{' '}
            <a href="/signup" className="text-[#00d28e] hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
