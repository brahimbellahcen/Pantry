import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { formatDate, formatPrice } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, Zap } from 'lucide-react'

interface Sale {
  id: number; product_id: number; product_name: string; product_slug: string
  product_image_url?: string; original_price: string; sale_price: string
  discount_type: string; discount_value: string
  ends_at: string; seconds_remaining: number; sold_count: number
  max_quantity?: number
}

export default function AdminFlashSales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({
    product_id: '', discount_type: 'percent', discount_value: '',
    starts_at: '', ends_at: '', max_quantity: '',
  })
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); adminApi.listFlashSales().then(setSales).finally(() => setLoading(false)) }
  useEffect(() => {
    load()
    adminApi.listProducts().then(setProducts)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createFlashSale({
        product_id: Number(form.product_id),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        max_quantity: form.max_quantity ? Number(form.max_quantity) : undefined,
      })
      toast.success('Flash sale created'); setShowForm(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
    finally { setSaving(false) }
  }

  const endSale = async (id: number) => {
    if (!confirm('End this flash sale?')) return
    await adminApi.endFlashSale(id); toast.success('Sale ended'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-500 fill-red-500" /> Flash Sales
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Sale</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg">New Flash Sale</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select required value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="input">
                <option value="">Select product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} className="input">
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input type="number" required step="0.01" value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="input" placeholder="20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starts at</label>
                <input type="datetime-local" required value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ends at</label>
                <input type="datetime-local" required value={form.ends_at}
                  onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="input" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max quantity (optional)</label>
              <input type="number" value={form.max_quantity}
                onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value }))} className="input" placeholder="Unlimited" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={saving} className="flex-1">Create</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="space-y-3">
          {sales.length === 0 && <p className="text-center text-gray-400 py-12">No flash sales yet.</p>}
          {sales.map(s => {
            const pct = Math.round((1 - Number(s.sale_price) / Number(s.original_price)) * 100)
            const active = s.seconds_remaining > 0
            return (
              <div key={s.id} className={`card p-4 flex items-center gap-4 ${!active ? 'opacity-60' : ''}`}>
                <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {s.product_image_url
                    ? <img src={s.product_image_url} className="h-full w-full object-cover" alt={s.product_name} />
                    : <div className="flex h-full items-center justify-center text-2xl">🛒</div>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{s.product_name}</p>
                  <p className="text-sm text-gray-500">
                    <span className="text-red-600 font-medium">{formatPrice(s.sale_price)}</span>
                    <span className="line-through ml-1">{formatPrice(s.original_price)}</span>
                    <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">-{pct}%</span>
                  </p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{active ? `${Math.floor(s.seconds_remaining / 3600)}h ${Math.floor((s.seconds_remaining % 3600) / 60)}m left` : 'Ended'}</p>
                  <p className="text-xs">{s.sold_count} sold{s.max_quantity ? ` / ${s.max_quantity}` : ''}</p>
                </div>
                {active && (
                  <button onClick={() => endSale(s.id)} className="text-gray-400 hover:text-red-600 ml-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
