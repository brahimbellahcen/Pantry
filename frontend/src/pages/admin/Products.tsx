import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { toast } from 'react-hot-toast'
import type { Product, Category } from '@/types'
import { Plus, Pencil, Trash2, PackageX } from 'lucide-react'

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', category_id: '', price: '', initial_stock: '0', image_url: '', is_active: true, is_featured: false })

  const load = () => { setLoading(true); adminApi.listProducts(true).then(setProducts).finally(() => setLoading(false)) }
  useEffect(() => { load(); adminApi.listCategories().then(setCategories) }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '', category_id: '', price: '', initial_stock: '0', image_url: '', is_active: true, is_featured: false }); setShowForm(true) }
  const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, category_id: String(p.category.id), price: String(p.price), initial_stock: '0', image_url: p.image_url ?? '', is_active: p.is_active, is_featured: p.is_featured }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await adminApi.updateProduct(editing.id, { name: form.name, category_id: Number(form.category_id), price: form.price as any, image_url: form.image_url || undefined, is_active: form.is_active, is_featured: form.is_featured })
        toast.success('Product updated')
      } else {
        await adminApi.createProduct({ name: form.name, category_id: Number(form.category_id), price: form.price as any, initial_stock: Number(form.initial_stock), image_url: form.image_url || undefined, is_active: form.is_active, is_featured: form.is_featured })
        toast.success('Product created')
      }
      setShowForm(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Deactivate "${p.name}"?`)) return
    await adminApi.deleteProduct(p.id); toast.success('Deactivated'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Product</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="font-bold text-lg">{editing ? 'Edit Product' : 'New Product'}</h2>
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select required value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input">
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Price ($)" type="number" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            {!editing && <Input label="Initial stock" type="number" value={form.initial_stock} onChange={e => setForm(f => ({ ...f, initial_stock: e.target.value }))} />}
            <Input label="Image URL" type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} /> Featured</label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">{editing ? 'Save' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Product', 'Category', 'Price', 'Stock', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category.name}</td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">{p.inventory?.quantity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(p)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
