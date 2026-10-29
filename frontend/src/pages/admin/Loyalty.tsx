import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Star, TrendingUp, DollarSign } from 'lucide-react'

export default function AdminLoyalty() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { adminApi.getLoyaltyStats().then(setStats).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> Loyalty Program
      </h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Points Issued', value: stats?.total_points_issued?.toLocaleString() ?? 0, icon: TrendingUp, color: 'text-brand-600 bg-brand-50' },
          { label: 'Points Outstanding', value: stats?.total_points_outstanding?.toLocaleString() ?? 0, icon: Star, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Estimated Liability', value: formatPrice(stats?.estimated_liability_usd ?? 0), icon: DollarSign, color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-3">Program Rules</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between border-b pb-2"><span>Points per $1 spent</span><span className="font-semibold">10 points</span></div>
          <div className="flex justify-between border-b pb-2"><span>Point value</span><span className="font-semibold">$0.01 / point</span></div>
          <div className="flex justify-between border-b pb-2"><span>Minimum redemption</span><span className="font-semibold">100 points</span></div>
          <div className="flex justify-between border-b pb-2"><span>Referral bonus (referrer)</span><span className="font-semibold">50 points</span></div>
          <div className="flex justify-between"><span>Referral bonus (referee)</span><span className="font-semibold">500 points ($5)</span></div>
        </div>
      </div>
    </div>
  )
}
