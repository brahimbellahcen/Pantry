import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { RefreshCw, PauseCircle, XCircle } from 'lucide-react'

interface Sub {
  id: number; user_id: number; frequency: string; status: string
  next_order_date?: string
  items: { id: number; product_id: number; product_name: string; quantity: number }[]
}

const FREQ_LABELS: Record<string, string> = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' }

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  const load = () => { setLoading(true); adminApi.listSubscriptions(filter).then(setSubs).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [filter])

  const updateStatus = async (id: number, status: string) => {
    await adminApi.updateSubscriptionStatus(id, status)
    toast.success(`Subscription ${status}`); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-brand-600" /> Subscriptions
        </h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50">
          {['active', 'paused', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="space-y-3">
          {subs.length === 0 && <p className="text-center text-gray-400 py-12">No {filter} subscriptions.</p>}
          {subs.map(sub => (
            <div key={sub.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">#{sub.id} — {FREQ_LABELS[sub.frequency]}</p>
                  {sub.next_order_date && <p className="text-xs text-gray-500">Next: {formatDate(sub.next_order_date)}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sub.status === 'active' ? 'bg-green-100 text-green-700' : sub.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  {sub.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{sub.items.map(i => `${i.product_name} ×${i.quantity}`).join(', ')}</p>
              <div className="flex gap-2">
                {sub.status === 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => updateStatus(sub.id, 'paused')}>
                    <PauseCircle className="h-4 w-4" /> Pause
                  </Button>
                )}
                {sub.status === 'paused' && (
                  <Button size="sm" onClick={() => updateStatus(sub.id, 'active')}>
                    <RefreshCw className="h-4 w-4" /> Resume
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => updateStatus(sub.id, 'cancelled')}>
                  <XCircle className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
