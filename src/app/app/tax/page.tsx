'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, CheckSquare, Download, MapPin, Plus, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import StatsCard from '@/components/ui/StatsCard'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

const DEDUCTIONS = [
  { name: 'Cleaning supplies & products', desc: 'Soap, disinfectants, sponges, mops, vacuum bags', common: true },
  { name: 'Transportation & mileage', desc: 'Driving to/from jobs, client meetings, supply runs', common: true },
  { name: 'Equipment & tools', desc: 'Vacuum cleaners, pressure washers, floor buffers', common: true },
  { name: 'Vehicle expenses', desc: 'Gas, maintenance, insurance, parking (actual cost method)', common: false },
  { name: 'Marketing & advertising', desc: 'Facebook ads, flyers, website hosting, business cards', common: true },
  { name: 'Insurance premiums', desc: 'General liability, worker\'s comp, business insurance', common: true },
  { name: 'Licenses & permits', desc: 'Business license, cleaning permit, bond fees', common: true },
  { name: 'Uniforms & protective gear', desc: 'Company shirts, gloves, masks, shoe covers', common: true },
  { name: 'Software & subscriptions', desc: 'Pocket Admin, scheduling apps, accounting software', common: true },
  { name: 'Phone & internet', desc: 'Business phone plan, data charges, home internet (business %)', common: true },
  { name: 'Education & training', desc: 'Cleaning certifications, workshops, webinars', common: false },
  { name: 'Home office deduction', desc: 'If you run your business from home (simplified: $5/sq ft, max 300 sq ft)', common: false },
  { name: 'Meals (client meetings)', desc: '50% deductible when meeting clients or prospects', common: false },
  { name: 'Bank & processing fees', desc: 'Stripe fees, bank charges, PayPal fees', common: true },
]

interface Expense {
  date: string
  category: string
  amount: number
  deductible: boolean
}

interface MileageEntry {
  id: string
  date: string
  from: string
  to: string
  miles: number
  purpose: string
}

export default function TaxCenterPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [mileage, setMileage] = useState<MileageEntry[]>([])
  const [showMileageModal, setShowMileageModal] = useState(false)
  const [mileageForm, setMileageForm] = useState({ date: new Date().toISOString().slice(0, 10), from: '', to: '', miles: '', purpose: '' })

  useEffect(() => {
    const saved = localStorage.getItem('pocket_expenses')
    if (saved) { try { setExpenses(JSON.parse(saved)) } catch { /* empty */ } }
    const savedMiles = localStorage.getItem('pocket_mileage')
    if (savedMiles) { try { setMileage(JSON.parse(savedMiles)) } catch { /* empty */ } }
  }, [])

  function addMileage() {
    if (!mileageForm.from || !mileageForm.to || !mileageForm.miles) return
    const entry: MileageEntry = {
      id: crypto.randomUUID(),
      date: mileageForm.date,
      from: mileageForm.from,
      to: mileageForm.to,
      miles: parseFloat(mileageForm.miles),
      purpose: mileageForm.purpose,
    }
    const updated = [entry, ...mileage]
    setMileage(updated)
    localStorage.setItem('pocket_mileage', JSON.stringify(updated))
    setMileageForm({ date: new Date().toISOString().slice(0, 10), from: '', to: '', miles: '', purpose: '' })
    setShowMileageModal(false)
  }

  function deleteMileage(id: string) {
    const updated = mileage.filter(m => m.id !== id)
    setMileage(updated)
    localStorage.setItem('pocket_mileage', JSON.stringify(updated))
  }

  const year = new Date().getFullYear().toString()
  const income = expenses.filter(e => e.date?.startsWith(year)).reduce((s, e) => s + e.amount, 0)
  const deductibles = expenses.filter(e => e.deductible && e.date?.startsWith(year)).reduce((s, e) => s + e.amount, 0)
  const netIncome = income - deductibles
  const estTax = netIncome > 0 ? netIncome * 0.153 : 0
  const totalMiles = mileage.filter(m => m.date?.startsWith(year)).reduce((s, m) => s + m.miles, 0)
  const mileageDeduction = totalMiles * 0.67
  const loggedCats = new Set(expenses.filter(e => e.deductible).map(e => e.category))
  const covered = DEDUCTIONS.filter(d => loggedCats.has(d.name) || d.common).length
  const pct = Math.round((covered / DEDUCTIONS.length) * 100)

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-bold mb-6">Tax Center</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard label={`Gross Income (${year})`} value={`$${income.toFixed(0)}`} />
        <StatsCard label="Deductible Expenses" value={`$${deductibles.toFixed(0)}`} accent="warning" />
        <StatsCard label="Net Income" value={`$${Math.abs(netIncome).toFixed(0)}`} accent={netIncome > 0 ? 'accent' : 'danger'} subtext={netIncome > 0 ? 'Profitable' : 'Loss'} />
        <StatsCard label="Est. Tax Set-Aside" value={`$${estTax.toFixed(0)}`} accent="danger" subtext="~15.3% SE tax" />
      </div>

      <Card padding="md" className="mb-4">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2"><TrendingUp size={16} className="text-accent" /> Profit & Loss Summary</h3>
        <p className="text-xs text-muted mb-4">For the current tax year. All amounts are estimates — consult your accountant.</p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted mb-1">Income</div>
            <div className="text-lg font-bold text-accent">${income.toFixed(0)}</div>
            <div className="progress-track mt-1"><div className="progress-fill" style={{ width: `${Math.min(100, (income / Math.max(income, 1)) * 100)}%` }} /></div>
          </div>
          <div>
            <div className="text-xs text-muted mb-1">Deductible Expenses</div>
            <div className="text-lg font-bold text-warning">${deductibles.toFixed(0)}</div>
            <div className="progress-track mt-1"><div className="progress-fill" style={{ width: `${Math.min(100, (deductibles / Math.max(income, 1)) * 100)}%`, background: '#ffd700' }} /></div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="text-xs text-muted mb-1">Net Income</div>
          <div className={`text-xl font-bold ${netIncome > 0 ? 'text-accent' : 'text-danger'}`}>
            {netIncome > 0 ? '+' : '-'}${Math.abs(netIncome).toFixed(0)}
          </div>
        </div>
      </Card>

      <Card padding="md" className="mb-4">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2"><CheckSquare size={16} className="text-accent" /> Deduction Checklist</h3>
        <p className="text-xs text-muted mb-4">Cleaning-specific deductions you may qualify for.</p>
        <div className="progress-label text-xs text-muted mb-1">{covered}/{DEDUCTIONS.length} categories covered</div>
        <div className="progress-track mb-4"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        {DEDUCTIONS.map((d) => {
          const checked = loggedCats.has(d.name) || d.common
          return (
            <div key={d.name} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div className="text-sm flex-shrink-0 w-5 text-center mt-0.5">{checked ? '✅' : '⬜'}</div>
              <div>
                <div className="text-sm font-semibold text-white">{d.name}</div>
                <div className="text-xs text-[#777]">{d.desc}</div>
              </div>
            </div>
          )
        })}
      </Card>

      <Card padding="md" className="mb-4">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2"><Download size={16} className="text-accent" /> Tax Export</h3>
        <p className="text-xs text-muted mb-4">Download your data formatted for tax preparation software (CSV).</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" icon={Download}>Income Report</Button>
          <Button variant="secondary" icon={Download}>Expense Report</Button>
          <Button variant="secondary" icon={Download}>Mileage Log</Button>
          <Button variant="secondary" icon={Download}>Combined Summary</Button>
        </div>
      </Card>

      <Card padding="md">
        <h3 className="text-base font-semibold mb-1 flex items-center gap-2"><MapPin size={16} className="text-accent" /> Mileage Tracker</h3>
        <p className="text-xs text-muted mb-4">Track miles driven for business (standard deduction: $0.67/mile for 2026).</p>
        <div className="mb-4">
          <Button icon={Plus} onClick={() => setShowMileageModal(true)}>Log Miles</Button>
        </div>
        {mileage.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#555]">No mileage logged. Start tracking your drives to jobs.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">From</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">To</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">Miles</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">Deduction</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]"></th>
                  </tr>
                </thead>
                <tbody>
                  {mileage.map((m) => (
                    <tr key={m.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] odd:bg-[rgba(255,255,255,0.008)]">
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{m.date}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{m.from}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-muted">{m.to}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-semibold">{m.miles}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-accent font-semibold">${(m.miles * 0.67).toFixed(2)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <button onClick={() => deleteMileage(m.id)} aria-label="Delete mileage entry" className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm text-[#888]">
              Total: {totalMiles} mi — ${mileageDeduction.toFixed(2)} deduction
            </div>
          </>
        )}
      </Card>

      <Modal open={showMileageModal} onClose={() => setShowMileageModal(false)} title="Log Miles">
        <div className="space-y-3">
          <Input label="Date" type="date" value={mileageForm.date} onChange={(e) => setMileageForm({ ...mileageForm, date: e.target.value })} />
          <Input label="From" value={mileageForm.from} onChange={(e) => setMileageForm({ ...mileageForm, from: e.target.value })} placeholder="Starting location" />
          <Input label="To" value={mileageForm.to} onChange={(e) => setMileageForm({ ...mileageForm, to: e.target.value })} placeholder="Destination" />
          <Input label="Miles" type="number" step="0.1" value={mileageForm.miles} onChange={(e) => setMileageForm({ ...mileageForm, miles: e.target.value })} placeholder="0.0" />
          <Input label="Purpose" value={mileageForm.purpose} onChange={(e) => setMileageForm({ ...mileageForm, purpose: e.target.value })} placeholder="e.g. Supply run, client visit" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowMileageModal(false)}>Cancel</Button>
            <Button onClick={addMileage}>Log Miles</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
