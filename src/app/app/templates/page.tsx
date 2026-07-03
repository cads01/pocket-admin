'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Edit3, Save } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/ToastProvider'

const DEFAULT_TEMPLATES = [
  { key: 'booking_confirmation', label: 'Booking Confirmation', body: 'Hi {customer}, your cleaning appointment is confirmed for {date} at {time}. We\'ll see you then! — {business}' },
  { key: 'reminder', label: 'Reminder', body: 'Reminder: {customer}, you have a cleaning scheduled for {date} at {time}. Reply to reschedule if needed. — {business}' },
  { key: 'follow_up', label: 'Follow-Up', body: 'Hi {customer}, thanks for choosing {business}! We hope you\'re happy with the cleaning. If you have a moment, we\'d love your feedback: {link}' },
  { key: 'invoice_notification', label: 'Invoice Notification', body: 'Hi {customer}, your invoice for ${amount} is ready. Due: {due_date}. Pay here: {link}. Thanks! — {business}' },
  { key: 'reschedule', label: 'Reschedule Notification', body: 'Hi {customer}, your cleaning has been rescheduled to {new_date} at {new_time}. Sorry for any inconvenience! — {business}' },
  { key: 'cancellation', label: 'Cancellation Confirmation', body: 'Hi {customer}, your cleaning on {date} has been cancelled as requested. Let us know if you\'d like to rebook. — {business}' },
]

interface Template {
  key: string
  label: string
  body: string
}

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('pocket_templates')
    if (saved) {
      try { setTemplates(JSON.parse(saved)) } catch { setTemplates(DEFAULT_TEMPLATES) }
    } else {
      setTemplates(DEFAULT_TEMPLATES)
    }
  }, [])

  function saveTemplates(updated: Template[]) {
    setTemplates(updated)
    localStorage.setItem('pocket_templates', JSON.stringify(updated))
  }

  function startEdit(key: string) {
    const t = templates.find(t => t.key === key)
    if (t) {
      setEditing(key)
      setEditBody(t.body)
    }
  }

  function saveEdit(key: string) {
    const updated = templates.map(t => t.key === key ? { ...t, body: editBody } : t)
    saveTemplates(updated)
    setEditing(null)
    toast('success', 'Template saved')
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-bold mb-6">Message Templates</h1>

      <Card padding="md">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2"><MessageSquare size={16} className="text-accent" /> Message Templates</h3>
        <p className="text-xs text-muted mb-4">Edit these templates. They're used for auto-sending to customers. Available placeholders: <code className="text-accent text-[11px] bg-accent-dim/30 px-1 py-0.5 rounded">{'{customer}'}</code> <code className="text-accent text-[11px] bg-accent-dim/30 px-1 py-0.5 rounded">{'{date}'}</code> <code className="text-accent text-[11px] bg-accent-dim/30 px-1 py-0.5 rounded">{'{time}'}</code> <code className="text-accent text-[11px] bg-accent-dim/30 px-1 py-0.5 rounded">{'{business}'}</code> <code className="text-accent text-[11px] bg-accent-dim/30 px-1 py-0.5 rounded">{'{amount}'}</code></p>
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.key} className="border border-[rgba(255,255,255,0.06)] rounded-lg p-4 glass-sm bg-[rgba(18,18,18,0.5)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white">{t.label}</h4>
                {editing !== t.key ? (
                  <button onClick={() => startEdit(t.key)} className="p-1.5 rounded text-muted hover:text-white hover:bg-surface-hover transition-colors cursor-pointer"><Edit3 size={14} /></button>
                ) : (
                  <button onClick={() => saveEdit(t.key)} className="p-1.5 rounded text-accent hover:bg-accent-dim transition-colors cursor-pointer"><Save size={14} /></button>
                )}
              </div>
              {editing === t.key ? (
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus-glow transition-colors placeholder:text-muted-foreground resize-y min-h-[80px]"
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted leading-relaxed">{t.body}</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
