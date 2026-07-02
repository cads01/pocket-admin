'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import type { Dispute, DisputeMessage } from '@/lib/supabase'
import { fmtDate } from '@/lib/utils'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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
        <>
          <div className="mb-6">
        <h2 className="text-xl font-bold">Disputes</h2>
        <p className="text-sm text-[#888]">Scope creep, quality issues, and service recovery</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Open</div>
          <div className="text-2xl font-bold text-[#ff5050]">{disputes.filter(d => d.status === 'open').length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">In Review</div>
          <div className="text-2xl font-bold text-[#ffd700]">{disputes.filter(d => d.status === 'in_review').length}</div>
        </div>
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          <div className="text-xs text-[#888]">Resolved</div>
          <div className="text-2xl font-bold text-[#00d28e]">{disputes.filter(d => d.status === 'resolved').length}</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {disputes.length === 0 ? (
            <div className="text-center py-12 text-[#555] text-sm">
              <p>No disputes</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {disputes.map(d => (
                <button
                  key={d.id}
                  onClick={() => selectDispute(d)}
                  className={`w-full text-left p-3 hover:bg-[#0f0f0f] cursor-pointer ${selected?.id === d.id ? 'bg-[#0f0f0f] border-l-2 border-[#00d28e]' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#888]">{d.id.slice(0, 8)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      d.status === 'open' ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                      : d.status === 'in_review' ? 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                      : 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                    }`}>{d.status}</span>
                  </div>
                  <div className="text-xs mt-1">
                    <span className="text-[#ffd700]">{d.dispute_type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xs text-[#555] mt-0.5 truncate">{d.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-3 bg-[#111] border border-[#1a1a1a] rounded-xl p-4">
          {!selected ? (
            <div className="text-center py-16 text-[#555] text-sm">
              <p>Select a dispute</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm">{selected.dispute_type.replace(/_/g, ' ')}</h3>
                  <p className="text-xs text-[#888]">Booking {selected.booking_id.slice(0, 8)} · Raised {fmtDate(selected.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-semibold ${
                  selected.status === 'open' ? 'bg-[rgba(255,80,80,0.12)] text-[#ff5050]'
                  : selected.status === 'in_review' ? 'bg-[rgba(255,215,0,0.12)] text-[#ffd700]'
                  : 'bg-[rgba(0,210,142,0.12)] text-[#00d28e]'
                }`}>{selected.status}</span>
              </div>

              <div className="bg-[#0d0d0d] rounded-lg p-3 mb-3 text-sm">
                <p className="text-[#888] text-xs mb-1">Description</p>
                <p>{selected.description}</p>
              </div>

              {/* Messages */}
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wide mb-2">Conversation</h4>
                <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
                  {messages.map(m => (
                    <div key={m.id} className={`text-xs p-2 rounded ${m.sender_id === user?.id ? 'bg-[rgba(0,210,142,0.08)] ml-6' : 'bg-[#0d0d0d] mr-6'}`}>
                      <p>{m.message}</p>
                      <p className="text-[#555] mt-0.5">{fmtDate(m.created_at)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                  />
                  <button onClick={sendMessage} className="px-3 py-2 bg-[#00d28e] text-[#0a0a0a] text-sm rounded-lg font-semibold cursor-pointer">Send</button>
                </div>
              </div>

              {/* Resolve */}
              {selected.status !== 'resolved' && selected.status !== 'dismissed' && (
                <div className="border-t border-[#1a1a1a] pt-3 space-y-2">
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Resolution Notes</label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#aaa] block mb-1">Partial Credit ($)</label>
                    <input
                      type="number"
                      value={partialCredit}
                      onChange={(e) => setPartialCredit(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d28e]"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resolveDispute('resolved')} className="flex-1 py-2 bg-[#00d28e] text-[#0a0a0a] font-semibold rounded-lg text-sm cursor-pointer">Resolve</button>
                    <button onClick={() => resolveDispute('dismissed')} className="flex-1 py-2 bg-[#1a1a1a] text-[#888] rounded-lg text-sm cursor-pointer">Dismiss</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
