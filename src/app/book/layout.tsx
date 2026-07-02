import { SupabaseProvider } from '@/components/SupabaseProvider'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
