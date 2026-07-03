'use client'

import { useState, useEffect } from 'react'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/ToastProvider'

const CATEGORIES = [
  'Cleaning supplies & products',
  'Transportation & mileage',
  'Equipment & tools',
  'Vehicle expenses',
  'Marketing & advertising',
  'Insurance premiums',
  'Licenses & permits',
  'Uniforms & protective gear',
  'Software & subscriptions',
  'Phone & internet',
  'Education & training',
  'Home office deduction',
  'Meals (client meetings)',
  'Bank & processing fees',
]

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  deductible: boolean
  client: string
}

export default function ExpensesPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], description: '', amount: '', deductible: true, client: '' })

  useEffect(() => {
    const saved = localStorage.getItem('pocket_expenses')
    if (saved) {
      try { setExpenses(JSON.parse(saved)) } catch { /* empty */ }
    }
  }, [])

  function save(updated: Expense[]) {
    setExpenses(updated)
    localStorage.setItem('pocket_expenses', JSON.stringify(updated))
  }

  function addExpense() {
    if (!form.description || !form.amount) return
    const e: Expense = {
      id: crypto.randomUUID(),
      date: form.date,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      deductible: form.deductible,
      client: form.client,
    }
    save([e, ...expenses])
    setForm({ date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], description: '', amount: '', deductible: true, client: '' })
    setShowModal(false)
    toast('success', 'Expense added')
  }

  function deleteExpense(id: string) {
    save(expenses.filter(e => e.id !== id))
    toast('success', 'Expense deleted')
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const deductible = expenses.filter(e => e.deductible).reduce((s, e) => s + e.amount, 0)
  const nonDeductible = total - deductible
  const thisMonth = expenses.filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7))).reduce((s, e) => s + e.amount, 0)

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Expenses</h1>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Expense</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label="Total Expenses" value={`$${total.toFixed(0)}`} />
        <StatsCard label="Deductible" value={`$${deductible.toFixed(0)}`} accent="warning" />
        <StatsCard label="Non-Deductible" value={`$${nonDeductible.toFixed(0)}`} accent="info" />
        <StatsCard label="This Month" value={`$${thisMonth.toFixed(0)}`} accent="white" />
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2"><Receipt size={16} className="text-accent" /> All Expenses</h3>
        </div>
        {expenses.length === 0 ? (
          <EmptyState icon={<Receipt size={40} />} title="No expenses logged" description="Track your business expenses for easy tax filing. Supplies, transportation, equipment — log it all." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2">Date</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2">Category</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2">Description</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2">Amount</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2">Deductible</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap border-b border-[rgba(255,255,255,0.06)] sticky top-0 bg-[rgba(18,18,18,0.85)] z-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(255,255,255,0.02)] odd:bg-[rgba(255,255,255,0.008)]">
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{e.date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted">{e.category}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-white/80">{e.description}</span>
                      {e.client && <span className="text-muted ml-1">· {e.client}</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold">${e.amount.toFixed(2)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${e.deductible ? 'bg-accent-dim text-accent' : 'bg-warning-dim text-warning'}`}>
                        {e.deductible ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">
                      <button onClick={() => deleteExpense(e.id)} aria-label="Delete expense" className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <div className="space-y-3">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="space-y-1">
            <label htmlFor="expense-category" className="text-xs font-medium text-muted-foreground block">Category</label>
            <select
              id="expense-category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 bg-input border border-input-border rounded-lg text-sm text-foreground focus-glow transition-colors cursor-pointer"
              style={{ WebkitAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" />
          <Input label="Amount ($)" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          <Input label="Client (optional)" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Client name" />
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input type="checkbox" checked={form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.checked })} className="accent-accent w-4 h-4" />
            Tax deductible
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={addExpense}>Add Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
