import { SupabaseProvider } from '@/components/SupabaseProvider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
