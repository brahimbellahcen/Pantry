import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

interface Coupon {
  id: number; code: string; description?: string; discount_type: string
  discount_value: string; min_order_amount?: string; max_discount_amount?: string
  usage_limit?: number; used_count: number; is_active: boolean
  expires_at?: string; created_at: string
}

const empty = { code: '', description: '', discount_type: 'percent', discount_value: '',
  min_order_amount: '', max_discount_amount: '', usage_limit: '', expires_at: '', is_active: true }

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); adminApi.listCoupons().then(setCoupons).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true) }
  const openEdit = (c: Coupon) => {
    setEditing(c)
    setForm({ code: c.code, description: c.description ?? '', discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_order_amount: c.min_order_amount ?? '',
      max_discount_amount: c.max_discount_amount ?? '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', is_active: c.is_active })
    setShowForm(true)
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload: any = { ...form,
      discount_value: Number(form.discount_value),
      min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : undefined,
      max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : undefined,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : undefined,
      expires_at: form.expires_at || undefined,
    }
    try {
      if (editing) { await adminApi.updateCoupon(editing.id, payload); toast.success('Updated') }
      else { await adminApi.createCoupon(payload); toast.success('Created') }
      setShowForm(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
    finally { setSaving(false) }
  }

  const toggleActive = async (c: Coupon) => {
    await adminApi.updateCoupon(c.id, { is_active: !c.is_active })
    toast.success(c.is_active ? 'Deactivated' : 'Activated'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Coupons</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New Coupon</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
            {!editing && <Input label="Code" required value={form.code} onChange={set('code')} hint="e.g. SUMMER20" />}
            <Input label="Description" value={form.description} onChange={set('description')} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.discount_type} onChange={set('discount_type')} className="input">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <Input label={form.discount_type === 'percent' ? 'Discount %' : 'Discount $'}
                type="number" step="0.01" required value={form.discount_value} onChange={set('discount_value')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min order ($)" type="number" step="0.01" value={form.min_order_amount} onChange={set('min_order_amount')} />
              <Input label="Max discount ($)" type="number" step="0.01" value={form.max_discount_amount} onChange={set('max_discount_amount')} hint="Percent cap" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Usage limit" type="number" value={form.usage_limit} onChange={set('usage_limit')} hint="Blank = unlimited" />
              <Input label="Expires" type="date" value={form.expires_at} onChange={set('expires_at')} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={saving} className="flex-1">{editing ? 'Save' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>{['Code', 'Type', 'Value', 'Used', 'Expires', 'Status', ''].map(h =>
                <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-brand-700">{c.code}</td>
                  <td className="px-4 py-3 capitalize">{c.discount_type}</td>
                  <td className="px-4 py-3">{c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}</td>
                  <td className="px-4 py-3 text-gray-500">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="px-4 py-3 text-gray-500">{c.expires_at ? formatDate(c.expires_at) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => toggleActive(c)} className="text-gray-400 hover:text-brand-600">
                      {c.is_active ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
