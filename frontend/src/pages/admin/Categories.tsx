import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import type { Category } from '@/types'
import { Plus, Pencil } from 'lucide-react'

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', description: '', image_url: '' })

  const load = () => { setLoading(true); adminApi.listCategories().then(setCategories).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', image_url: '' }); setShowForm(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description ?? '', image_url: c.image_url ?? '' }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, form); toast.success('Category updated')
      } else {
        await adminApi.createCategory(form); toast.success('Category created')
      }
      setShowForm(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Categories</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Category</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg">{editing ? 'Edit Category' : 'New Category'}</h2>
            <Input label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <Input label="Image URL" type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">{editing ? 'Save' : 'Create'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(cat => (
            <div key={cat.id} className="card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden shrink-0">
                {cat.image_url ? <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" /> : <span className="text-xl">🥬</span>}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{cat.name}</p>
                <p className="text-xs text-gray-500">{cat.children.length} subcategories</p>
              </div>
              <button onClick={() => openEdit(cat)} className="text-gray-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
