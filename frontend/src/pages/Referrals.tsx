import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'
import { Copy, Users, Gift } from 'lucide-react'

interface ReferralData {
  code: string; share_url: string
  total_referrals: number; completed_referrals: number; points_earned: number
}

export default function Referrals() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyCode, setApplyCode] = useState('')
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    apiClient.get<ReferralData>('/referrals/my-code')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const copy = () => {
    if (!data) return
    navigator.clipboard.writeText(data.share_url)
    toast.success('Link copied!')
  }

  const applyReferral = async (e: React.FormEvent) => {
    e.preventDefault(); setApplying(true)
    try {
      const r = await apiClient.post('/referrals/apply', { code: applyCode })
      toast.success(r.data.detail)
      setApplyCode('')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Invalid code')
    } finally { setApplying(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!data) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Gift className="h-6 w-6 text-purple-500" /> Refer & Earn
      </h1>

      {/* Share card */}
      <div className="card p-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white">
        <h2 className="font-bold text-lg mb-1">Your Referral Code</h2>
        <p className="text-purple-200 text-sm mb-4">Share this code — your friend gets $5 credit, you earn 50 points!</p>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-3">
          <code className="flex-1 font-mono font-bold text-lg tracking-widest">{data.code}</code>
          <button onClick={copy} className="text-white hover:text-purple-200 p-1">
            <Copy className="h-5 w-5" />
          </button>
        </div>
        <button onClick={copy} className="mt-3 w-full rounded-lg bg-white text-purple-700 font-semibold py-2 hover:bg-purple-50 transition-colors text-sm">
          Copy Share Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Referrals', value: data.total_referrals, icon: Users },
          { label: 'Completed', value: data.completed_referrals, icon: Gift },
          { label: 'Points Earned', value: data.points_earned, icon: Gift },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Apply a code */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-3">Have a referral code?</h2>
        <form onSubmit={applyReferral} className="flex gap-2">
          <input value={applyCode} onChange={e => setApplyCode(e.target.value.toUpperCase())}
            placeholder="PANTRY-XXXXXX" className="input flex-1 font-mono uppercase" />
          <Button type="submit" isLoading={applying}>Apply</Button>
        </form>
        <p className="text-xs text-gray-400 mt-2">Each account can use one referral code. You'll get 500 points ($5 credit).</p>
      </div>
    </div>
  )
}
