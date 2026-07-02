import { SupabaseProvider } from '@/components/SupabaseProvider'

export default function CleanerLayout({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
