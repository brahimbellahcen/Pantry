import { useState } from 'react'
import { Star } from 'lucide-react'
import { reviewsApi } from '@/api/reviews'
import type { ReviewOut, ReviewStats } from '@/api/reviews'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/utils/format'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

function StarRow({ rating, interactive = false, onChange }: {
  rating: number; interactive?: boolean; onChange?: (r: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => interactive && onChange?.(n)}
          onMouseEnter={() => interactive && setHovered(n)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star
            className={`h-5 w-5 ${n <= (hovered || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewSection({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth()
  const [reviews, setReviews] = useState<ReviewOut[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 0, title: '', body: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const [r, s] = await Promise.all([
      reviewsApi.list(productId),
      reviewsApi.stats(productId),
    ])
    setReviews(r); setStats(s); setLoading(false)
  }

  useState(() => { load() })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.rating) { toast.error('Please select a star rating'); return }
    setSubmitting(true)
    try {
      await reviewsApi.submit(productId, form)
      toast.success('Review submitted!')
      setShowForm(false)
      await load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Could not submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Reviews {stats && stats.total_reviews > 0 && `(${stats.total_reviews})`}
        </h2>
        {isAuthenticated && !showForm && (
          <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>Write a Review</Button>
        )}
      </div>

      {stats && stats.total_reviews > 0 && (
        <div className="card p-4 mb-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.average_rating.toFixed(1)}</p>
            <StarRow rating={Math.round(stats.average_rating)} />
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map(n => (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-2">{n}</span>
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${stats.total_reviews ? ((stats.rating_breakdown[n] ?? 0) / stats.total_reviews) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-gray-500">{stats.rating_breakdown[n] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Your Review</h3>
          <StarRow rating={form.rating} interactive onChange={r => setForm(f => ({ ...f, rating: r }))} />
          <input
            placeholder="Summary (optional)"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input"
          />
          <textarea
            placeholder="Tell others what you think…"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            className="input h-24 resize-none"
          />
          <div className="flex gap-2">
            <Button type="submit" isLoading={submitting}>Submit</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading reviews…</p> : (
        <div className="space-y-3">
          {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet. Be the first!</p>}
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <StarRow rating={r.rating} />
                  {r.title && <p className="font-semibold text-gray-900 mt-1">{r.title}</p>}
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{r.author_name}</p>
                  <p>{formatDate(r.created_at)}</p>
                  {r.is_verified_purchase && (
                    <span className="text-brand-600 font-medium">✓ Verified</span>
                  )}
                </div>
              </div>
              {r.body && <p className="mt-2 text-sm text-gray-700">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
