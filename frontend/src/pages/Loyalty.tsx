import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import { Star, TrendingUp, Gift } from 'lucide-react'

interface Balance { balance: number; lifetime_earned: number; points_value_usd: number; points_per_dollar: number }
interface Tx { id: number; type: string; points: number; description?: string; created_at: string }

const TYPE_COLORS: Record<string, string> = {
  earn: 'text-green-600 bg-green-50',
  redeem: 'text-red-600 bg-red-50',
  referral: 'text-purple-600 bg-purple-50',
  expire: 'text-gray-500 bg-gray-50',
}
const TYPE_ICON: Record<string, string> = { earn: '+', redeem: '−', referral: '🎁', expire: '⏰' }

export default function LoyaltyPage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [history, setHistory] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiClient.get<Balance>('/loyalty/balance').then(r => r.data),
      apiClient.get<Tx[]>('/loyalty/history').then(r => r.data),
    ]).then(([b, h]) => { setBalance(b); setHistory(h) }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!balance) return null

  const tiers = [
    { name: 'Bronze', min: 0, max: 999, color: 'text-amber-700' },
    { name: 'Silver', min: 1000, max: 4999, color: 'text-gray-500' },
    { name: 'Gold', min: 5000, max: 9999, color: 'text-yellow-500' },
    { name: 'Platinum', min: 10000, max: Infinity, color: 'text-blue-600' },
  ]
  const tier = tiers.find(t => balance.lifetime_earned >= t.min && balance.lifetime_earned <= t.max) ?? tiers[0]
  const nextTier = tiers[tiers.indexOf(tier) + 1]
  const tierProgress = nextTier
    ? Math.min(100, ((balance.lifetime_earned - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" /> Loyalty Rewards
      </h1>

      {/* Balance card */}
      <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-brand-100 text-sm">Your Points</p>
            <p className="text-4xl font-bold mt-1">{balance.balance.toLocaleString()}</p>
            <p className="text-brand-200 text-sm mt-1">≈ ${balance.points_value_usd.toFixed(2)} credit</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${tier.color.replace('text-', 'text-')} bg-white rounded-lg px-3 py-1`} style={{color: 'inherit'}}>
              <span className={tier.color}>{tier.name}</span>
            </p>
            <p className="text-brand-200 text-xs mt-1">{balance.lifetime_earned.toLocaleString()} lifetime pts</p>
          </div>
        </div>
        {nextTier && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-brand-200 mb-1">
              <span>{tier.name}</span><span>{nextTier.name} at {nextTier.min.toLocaleString()} pts</span>
            </div>
            <div className="h-2 rounded-full bg-brand-800 overflow-hidden">
              <div className="h-full rounded-full bg-white" style={{ width: `${tierProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* How to earn */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" /> How to Earn Points
        </h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span>🛒 Every $1 spent</span><span className="font-semibold text-brand-600">+{balance.points_per_dollar} pts</span></div>
          <div className="flex justify-between"><span>🎁 Refer a friend</span><span className="font-semibold text-brand-600">+50 pts</span></div>
          <div className="flex justify-between"><span>✍️ Write a review</span><span className="font-semibold text-brand-600">coming soon</span></div>
        </div>
        <div className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
          💡 100 points = $1 discount at checkout
        </div>
      </div>

      {/* Transaction history */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-3">Points History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet. Place an order to start earning!</p>
        ) : (
          <div className="space-y-2">
            {history.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[tx.type] ?? 'text-gray-600 bg-gray-50'}`}>
                    {TYPE_ICON[tx.type] ?? '•'} {tx.type}
                  </span>
                  <span className="text-sm text-gray-600">{tx.description}</span>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
