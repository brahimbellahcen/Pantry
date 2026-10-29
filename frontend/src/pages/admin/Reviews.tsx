import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Badge, Spinner } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle } from 'lucide-react'

interface Review {
  id: number; product_id: number; user_id: number; author_name: string
  rating: number; title?: string; body?: string
  is_verified_purchase: boolean; status: string; created_at: string
}

const STATUS_OPTS = ['pending', 'approved', 'rejected']

function Stars({ rating }: { rating: number }) {
  return <span className="text-yellow-400">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); adminApi.listReviews(status).then(setReviews).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [status])

  const moderate = async (id: number, action: 'approve' | 'reject') => {
    try { await adminApi.moderateReview(id, action); toast.success(`Review ${action}d`); load() }
    catch (err: any) { toast.error(err?.response?.data?.detail ?? 'Error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors capitalize ${status === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="space-y-3">
          {reviews.length === 0 && <p className="text-center text-gray-400 py-12">No {status} reviews.</p>}
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Stars rating={r.rating} />
                    {r.is_verified_purchase && (
                      <span className="text-xs text-brand-600 font-medium bg-brand-50 px-1.5 py-0.5 rounded">✓ Verified</span>
                    )}
                    <span className={`text-xs rounded-full px-2 py-0.5 capitalize font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {r.status}
                    </span>
                  </div>
                  {r.title && <p className="font-semibold text-gray-900">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-600 mt-1">{r.body}</p>}
                  <p className="text-xs text-gray-400 mt-2">{r.author_name} · {formatDate(r.created_at)} · Product #{r.product_id}</p>
                </div>
                {status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => moderate(r.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => moderate(r.id, 'reject')}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
