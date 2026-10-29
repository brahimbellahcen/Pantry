import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle } from 'lucide-react'

const STATUS_OPTS = ['pending', 'approved', 'rejected']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function AdminReturns() {
  const [returns, setReturns] = useState<any[]>([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState<Record<number, string>>({})

  const load = () => { setLoading(true); adminApi.listReturns(status).then(setReturns).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [status])

  const resolve = async (id: number, action: 'approved' | 'rejected') => {
    try {
      await adminApi.resolveReturn(id, action, note[id])
      toast.success(`Return ${action}`)
      load()
    } catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Return Requests</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${status === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="space-y-3">
          {returns.length === 0 && <p className="text-center text-gray-400 py-12">No {status} return requests.</p>}
          {returns.map((r: any) => (
            <div key={r.id} className="card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    Order #{r.order_id} — <span className="capitalize">{r.reason.replace(/_/g, ' ')}</span>
                  </p>
                  {r.details && <p className="text-sm text-gray-600">{r.details}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(r.created_at)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {status === 'pending' && (
                <div className="space-y-2">
                  <textarea
                    value={note[r.id] ?? ''}
                    onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Resolution note (optional)…"
                    className="input h-16 resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => resolve(r.id, 'approved')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" /> Approve & Refund
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => resolve(r.id, 'rejected')}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
              {r.resolution_note && (
                <p className="text-sm text-gray-600 border-t pt-2 mt-2">Note: {r.resolution_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
