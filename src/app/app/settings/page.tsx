'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { RefreshCw, Save } from 'lucide-react'

export default function SettingsPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user) { router.push('/login'); return }
    load()
  }, [user, loading])

  async function load() {
    if (!supabase) return
    setPageLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()
    if (data) {
      setName(data.name || '')
      setPhone(data.phone || '')
    }
    setPageLoading(false)
  }

  async function save() {
    if (!supabase) return
    setSaving(true)
    await supabase.from('profiles').update({ name, phone }).eq('id', user!.id)
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      {pageLoading ? (
        <LoadingSkeleton type="card" />
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Settings</h2>
            <p className="text-sm text-muted">Platform configuration</p>
          </div>

          <Card padding="lg" className="animate-fade-in">
            <h3 className="font-semibold mb-4 text-accent">Your Profile</h3>
            <div className="space-y-3">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
              />
              <Button onClick={save} disabled={saving} loading={saving} icon={Save}>
                Save
              </Button>
            </div>
          </Card>

          <Card padding="lg" className="animate-fade-in">
            <h3 className="font-semibold mb-4 text-warning">Data</h3>
            <div className="flex gap-3">
              <Button onClick={() => router.refresh()} variant="secondary" icon={RefreshCw}>
                Refresh
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
