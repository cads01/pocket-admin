'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Dispute, DisputeMessage } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { Send, Scale } from 'lucide-react'

export default function DisputesPage() {
  const { supabase, user, loading } = useSupabase()
  const router = useRouter()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [selected, setSelected] = useState<Dispute | null>(null)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [resolution, setResolution] = useState('')
  const [partialCredit, setPartialCredit] = useState('')
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
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setDisputes(data)
    setPageLoading(false)
  }

  async function selectDispute(d: Dispute) {
    setSelected(d)
    setResolution('')
    setPartialCredit('')
    if (!supabase) return
    const { data: m } = await supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', d.id)
      .order('created_at', { ascending: true })
    if (m) setMessages(m)
  }

  async function sendMessage() {
    if (!supabase || !selected || !newMsg.trim()) return
    await supabase.from('dispute_messages').insert({
      dispute_id: selected.id,
      sender_id: user!.id,
      message: newMsg,
    })
    setNewMsg('')
    selectDispute(selected)
  }

  async function resolveDispute(status: 'resolved' | 'dismissed') {
    if (!supabase || !selected) return
    await supabase
      .from('disputes')
      .update({
        status,
        resolution,
        partial_credit: partialCredit ? parseFloat(partialCredit) : null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', selected.id)

    if (status === 'resolved' && partialCredit) {
      await supabase
        .from('bookings')
        .update({
          escrow_status: 'disputed',
          status: 'reviewed',
        })
        .eq('id', selected.booking_id)
    }

    selectDispute(selected)
    load()
  }

  return (
    <div className="p-8">
      {pageLoading ? (
        <div className="space-y-6">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-bold text-foreground">Disputes</h2>
            <p className="text-sm text-muted">Scope creep, quality issues, and service recovery</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatsCard label="Open" value={disputes.filter(d => d.status === 'open').length} accent="danger" />
            <StatsCard label="In Review" value={disputes.filter(d => d.status === 'in_review').length} accent="warning" />
            <StatsCard label="Resolved" value={disputes.filter(d => d.status === 'resolved').length} accent="accent" />
          </div>

          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2">
              <Card padding="sm" className="p-0 overflow-hidden animate-fade-in">
                {disputes.length === 0 ? (
                  <EmptyState
                    icon={<Scale size={24} />}
                    title="No disputes"
                    description=""
                  />
                ) : (
                  <div className="divide-y divide-card-border">
                    {disputes.map(d => (
                      <button
                        key={d.id}
                        onClick={() => selectDispute(d)}
                        className={`w-full text-left p-3 hover:bg-surface-hover cursor-pointer ${selected?.id === d.id ? 'bg-surface-hover border-l-2 border-accent' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted">{d.id.slice(0, 8)}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-warning capitalize">{d.dispute_type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="col-span-3">
              <Card padding="md" className="animate-fade-in">
                {!selected ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    <Scale size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Select a dispute</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground capitalize">{selected.dispute_type.replace(/_/g, ' ')}</h3>
                        <p className="text-xs text-muted">Booking {selected.booking_id.slice(0, 8)} · Raised {fmtDate(selected.created_at)}</p>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>

                    <div className="bg-surface rounded-lg p-3 mb-3 text-sm">
                      <p className="text-muted text-xs mb-1">Description</p>
                      <p className="text-foreground">{selected.description}</p>
                    </div>

                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Conversation</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
                        {messages.map(m => (
                          <div key={m.id} className={`text-xs p-2 rounded ${m.sender_id === user?.id ? 'bg-accent-dim ml-6' : 'bg-surface mr-6'}`}>
                            <p className="text-foreground">{m.message}</p>
                            <p className="text-muted-foreground mt-0.5">{fmtDate(m.created_at)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newMsg}
                          onChange={(e) => setNewMsg(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} icon={Send}>Send</Button>
                      </div>
                    </div>

                    {selected.status !== 'resolved' && selected.status !== 'dismissed' && (
                      <div className="border-t border-card-border pt-3 space-y-2">
                        <div>
                          <label className="text-xs font-medium text-muted block mb-1">Resolution Notes</label>
                          <textarea
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-input border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:border-input-focus placeholder:text-muted-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted block mb-1">Partial Credit ($)</label>
                          <Input
                            type="number"
                            value={partialCredit}
                            onChange={(e) => setPartialCredit(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => resolveDispute('resolved')} variant="primary" className="flex-1">Resolve</Button>
                          <Button onClick={() => resolveDispute('dismissed')} variant="secondary" className="flex-1">Dismiss</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
