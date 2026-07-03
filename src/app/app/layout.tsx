'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { SupabaseProvider, useSupabase } from '@/components/SupabaseProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import Link from 'next/link'
import ToastProvider from '@/components/ui/ToastProvider'
import RouteLoader from '@/components/RouteLoader'


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
  Menu,
  X,
  Receipt,
  FileText,
  MessageSquare,
  Clock,
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app' },
  { icon: Calendar, label: 'Bookings', href: '/app/bookings' },
  { icon: Clock, label: 'Schedule', href: '/app/schedule' },
  { icon: Sparkles, label: 'Cleaners', href: '/app/cleaners' },
  { icon: Users, label: 'Clients', href: '/app/clients' },
  { icon: UserPlus, label: 'Employees', href: '/app/employees' },
  { icon: Wallet, label: 'Payroll', href: '/app/payroll' },
  { icon: ClipboardList, label: 'Assignments', href: '/app/assignments' },
  { icon: Search, label: 'Inspections', href: '/app/inspections' },
  { icon: Scale, label: 'Disputes', href: '/app/disputes' },
  { icon: Banknote, label: 'Invoices', href: '/app/invoices' },
  { icon: Receipt, label: 'Expenses', href: '/app/expenses' },
  { icon: FileText, label: 'Tax Center', href: '/app/tax' },
  { icon: Star, label: 'Reviews', href: '/app/reviews' },
  { icon: Video, label: 'Videos', href: '/app/videos' },
  { icon: DollarSign, label: 'Payouts', href: '/app/payouts' },
  { icon: MessageSquare, label: 'Templates', href: '/app/templates' },
  { icon: Settings, label: 'Settings', href: '/app/settings' },
]

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''

  function closeMobile() {
    setMobileOpen(false)
  }

  function NavContent() {
    return (
      <>
        <div className="p-5 border-b border-card-border">
          <Link href="/app" className="no-underline" onClick={closeMobile}>
            <h1 className={`font-bold tracking-tight ${collapsed ? 'text-center text-lg' : 'text-xl bg-gradient-to-r from-[#00d28e] to-[#00b8d4] bg-clip-text text-transparent'}`}>
              {collapsed ? (
                <span className="text-accent">P</span>
              ) : (
                'Pocket Admin'
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
                onClick={closeMobile}
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
            className="hidden md:flex w-full items-center gap-3 py-2 px-3 text-xs text-muted-foreground hover:text-muted transition-colors cursor-pointer"
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
      </>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in"
          onClick={closeMobile}
        />
      )}

      {/* Mobile sidebar (overlay) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-card-border flex flex-col transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <span className="font-bold text-lg bg-gradient-to-r from-[#00d28e] to-[#00b8d4] bg-clip-text text-transparent">
            Pocket Admin
          </span>
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors no-underline ${
                  isActive
                    ? 'text-accent bg-accent-dim border-r-2 border-accent'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-6 flex items-center justify-center">
                  <item.icon size={18} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-card-border p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-2.5 px-3 text-sm text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${
          collapsed ? 'w-16' : 'w-56'
        } bg-surface border-r border-card-border flex-col transition-all duration-200 flex-shrink-0`}
      >
        <NavContent />
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 md:hidden flex items-center gap-3 px-4 py-3 bg-background border-b border-card-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm bg-gradient-to-r from-[#00d28e] to-[#00b8d4] bg-clip-text text-transparent">
            Pocket Admin
          </span>
        </div>

        <Suspense fallback={null}>
          <RouteLoader />
        </Suspense>
        <div className="p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
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
