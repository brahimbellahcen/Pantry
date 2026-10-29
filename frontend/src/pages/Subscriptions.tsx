import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { RefreshCw, PauseCircle, XCircle, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SubItem { id: number; product_id: number; product_name: string; quantity: number }
interface Sub { id: number; frequency: string; status: string; next_order_date?: string; items: SubItem[] }

const FREQ_LABELS: Record<string, string> = { weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' }

export default function Subscriptions() {
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    apiClient.get<Sub[]>('/subscriptions').then(r => setSubs(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setStatus = async (id: number, status: string) => {
    await apiClient.patch(`/subscriptions/${id}/status`, null, { params: { status } })
    toast.success(`Subscription ${status}`)
    load()
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-brand-600" /> Subscriptions
        </h1>
        <Link to="/products" className="btn-secondary text-sm flex items-center gap-1">
          <Plus className="h-4 w-4" /> New
        </Link>
      </div>

      {subs.length === 0 ? (
        <EmptyState title="No subscriptions yet"
          description="Subscribe to your favourite products for automatic weekly, bi-weekly, or monthly delivery."
          action={<Link to="/products" className="btn-primary">Browse Products</Link>} />
      ) : (
        <div className="space-y-4">
          {subs.map(sub => (
            <div key={sub.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{FREQ_LABELS[sub.frequency] ?? sub.frequency}</p>
                  {sub.next_order_date && (
                    <p className="text-xs text-gray-500">Next: {formatDate(sub.next_order_date)}</p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sub.status === 'active' ? 'bg-green-100 text-green-700' : sub.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                  {sub.status}
                </span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                {sub.items.map(i => (
                  <li key={i.id} className="flex justify-between">
                    <span>{i.product_name}</span>
                    <span className="text-gray-400">× {i.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                {sub.status === 'active' && (
                  <Button size="sm" variant="secondary" onClick={() => setStatus(sub.id, 'paused')}>
                    <PauseCircle className="h-4 w-4" /> Pause
                  </Button>
                )}
                {sub.status === 'paused' && (
                  <Button size="sm" onClick={() => setStatus(sub.id, 'active')}>
                    <RefreshCw className="h-4 w-4" /> Resume
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => setStatus(sub.id, 'cancelled')}>
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
