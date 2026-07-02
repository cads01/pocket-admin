'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupabaseProvider, useSupabase } from '@/components/SupabaseProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import Link from 'next/link'

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard', href: '/' },
  { icon: '📅', label: 'Bookings', href: '/bookings' },
  { icon: '🧹', label: 'Cleaners', href: '/cleaners' },
  { icon: '👥', label: 'Clients', href: '/clients' },
  { icon: '🔍', label: 'Inspections', href: '/inspections' },
  { icon: '⚖️', label: 'Disputes', href: '/disputes' },
  { icon: '💰', label: 'Invoices', href: '/invoices' },
  { icon: '⭐', label: 'Reviews', href: '/reviews' },
  { icon: '🎥', label: 'Videos', href: '/videos' },
  { icon: '💸', label: 'Payouts', href: '/payouts' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
]

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } bg-[#0d0d0d] border-r border-[#161616] flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        <div className="p-5 border-b border-[#161616]">
          <Link href="/" className="no-underline">
            <h1 className={`font-bold tracking-tight ${collapsed ? 'text-center text-lg' : 'text-xl'}`}>
              {collapsed ? (
                <span className="text-[#00d28e]">P</span>
              ) : (
                <>
                  Pocket <span className="text-[#00d28e]">Admin</span>
                </>
              )}
            </h1>
          </Link>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors no-underline ${
                  isActive
                    ? 'text-[#00d28e] bg-[rgba(0,210,142,0.08)] border-r-2 border-[#00d28e]'
                    : 'text-[#888] hover:text-white hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <span className="text-lg w-6 text-center">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#161616] p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-2 px-3 text-xs text-[#555] hover:text-[#888] transition-colors cursor-pointer"
          >
            {collapsed ? '→' : 'Collapse'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 text-xs text-[#555] hover:text-[#ff5050] transition-colors cursor-pointer"
          >
            {collapsed ? '🚪' : 'Sign out'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <DashboardShell>{children}</DashboardShell>
    </SupabaseProvider>
  )
}
