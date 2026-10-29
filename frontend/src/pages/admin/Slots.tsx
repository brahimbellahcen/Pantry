import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

interface Slot {
  id: number; date: string; time_window: string
  capacity: number; booked_count: number; available: number; is_active: boolean
}

const TIME_WINDOWS = ['08:00–11:00', '11:00–14:00', '14:00–17:00', '17:00–20:00']

export default function AdminSlots() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', time_window: TIME_WINDOWS[0], capacity: '20' })
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); adminApi.listSlots().then(setSlots).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await adminApi.createSlot({ date: form.date, time_window: form.time_window, capacity: Number(form.capacity) })
      toast.success('Slot created'); setShowForm(false); load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this slot?')) return
    await adminApi.deleteSlot(id); toast.success('Deactivated'); load()
  }

  // Group slots by date
  const byDate: Record<string, Slot[]> = {}
  slots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Delivery Slots</h1>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Add Slot</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">New Delivery Slot</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Window</label>
              <select value={form.time_window} onChange={e => setForm(f => ({ ...f, time_window: e.target.value }))} className="input">
                {TIME_WINDOWS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input type="number" min="1" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className="input" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" isLoading={saving} className="flex-1">Create</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="space-y-4">
          {Object.keys(byDate).sort().map(date => (
            <div key={date}>
              <h2 className="font-semibold text-gray-700 mb-2 text-sm">{formatDate(date)}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {byDate[date].map(s => (
                  <div key={s.id} className={`card p-3 ${!s.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">{s.time_window}</p>
                      <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(s.booked_count / s.capacity) * 100}%` }} />
                      </div>
                      <span>{s.available} left</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{s.booked_count}/{s.capacity} booked</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {slots.length === 0 && <p className="text-center text-gray-400 py-12">No slots configured. Add some above.</p>}
        </div>
      )}
    </div>
  )
}
