import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import type { Product } from '@/types'

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ id: number; qty: string; threshold: string } | null>(null)

  const load = () => { setLoading(true); adminApi.listProducts().then(setProducts).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!editing) return
    try {
      await adminApi.updateInventory(editing.id, { quantity: Number(editing.qty), low_stock_threshold: Number(editing.threshold) })
      toast.success('Inventory updated'); setEditing(null); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Inventory</h1>
      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>{['Product', 'In Stock', 'Low Stock Threshold', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => {
                const qty = p.inventory?.quantity ?? 0
                const threshold = p.inventory?.low_stock_threshold ?? 10
                const isLow = qty <= threshold
                const isEdit = editing?.id === p.id
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      {isEdit ? <input type="number" value={editing.qty} onChange={e => setEditing(ed => ed ? { ...ed, qty: e.target.value } : null)} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" /> : qty}
                    </td>
                    <td className="px-4 py-3">
                      {isEdit ? <input type="number" value={editing.threshold} onChange={e => setEditing(ed => ed ? { ...ed, threshold: e.target.value } : null)} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" /> : threshold}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${qty === 0 ? 'bg-red-100 text-red-700' : isLow ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {qty === 0 ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2 justify-end">
                      {isEdit
                        ? <><Button size="sm" onClick={handleSave}>Save</Button><Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button></>
                        : <Button size="sm" variant="secondary" onClick={() => setEditing({ id: p.id, qty: String(qty), threshold: String(threshold) })}>Edit</Button>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
