'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupabaseProvider, useSupabase } from '@/components/SupabaseProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import Link from 'next/link'
import ToastProvider from '@/components/ui/ToastProvider'
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  Users,
  UserPlus,
  Wallet,
  ClipboardList,
  Search,
  Scale,
  Star,
  Video,
  Settings,
  LogOut,
  Banknote,
  DollarSign,
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app' },
  { icon: Calendar, label: 'Bookings', href: '/app/bookings' },
  { icon: Sparkles, label: 'Cleaners', href: '/app/cleaners' },
  { icon: Users, label: 'Clients', href: '/app/clients' },
  { icon: UserPlus, label: 'Employees', href: '/app/employees' },
  { icon: Wallet, label: 'Payroll', href: '/app/payroll' },
  { icon: ClipboardList, label: 'Assignments', href: '/app/assignments' },
  { icon: Search, label: 'Inspections', href: '/app/inspections' },
  { icon: Scale, label: 'Disputes', href: '/app/disputes' },
  { icon: Banknote, label: 'Invoices', href: '/app/invoices' },
  { icon: Star, label: 'Reviews', href: '/app/reviews' },
  { icon: Video, label: 'Videos', href: '/app/videos' },
  { icon: DollarSign, label: 'Payouts', href: '/app/payouts' },
  { icon: Settings, label: 'Settings', href: '/app/settings' },
]

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } bg-surface border-r border-card-border flex flex-col transition-all duration-200 flex-shrink-0`}
      >
        <div className="p-5 border-b border-card-border">
          <Link href="/app" className="no-underline">
            <h1 className={`font-bold tracking-tight ${collapsed ? 'text-center text-lg' : 'text-xl'}`}>
              {collapsed ? (
                <span className="text-accent">P</span>
              ) : (
                <>
                  Pocket <span className="text-accent">Admin</span>
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
                    ? 'text-accent bg-accent-dim border-r-2 border-accent'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-6 flex items-center justify-center flex-shrink-0">
                  <item.icon size={18} />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-card-border p-3 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 py-2 px-3 text-xs text-muted-foreground hover:text-muted transition-colors cursor-pointer"
          >
            {collapsed ? (
              <span className="w-6 flex items-center justify-center">→</span>
            ) : (
              'Collapse'
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2 px-3 text-xs text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
          >
            {collapsed ? (
              <span className="w-6 flex items-center justify-center">
                <LogOut size={14} />
              </span>
            ) : (
              <>
                <LogOut size={14} />
                Sign out
              </>
            )}
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
      <ToastProvider>
        <DashboardShell>{children}</DashboardShell>
      </ToastProvider>
    </SupabaseProvider>
  )
}
