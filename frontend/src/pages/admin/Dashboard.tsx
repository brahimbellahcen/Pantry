import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Package, ShoppingBag, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => { adminApi.getStats().then(setStats) }, [])
  if (!stats) return <div className="flex justify-center py-20"><Spinner /></div>

  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.total_revenue), icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingBag, color: 'text-blue-600 bg-blue-100' },
    { label: 'Products', value: stats.total_products, icon: Package, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Customers', value: stats.total_customers, icon: Users, color: 'text-purple-600 bg-purple-100' },
    { label: 'Pending Orders', value: stats.pending_orders, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Low Stock', value: stats.low_stock_products, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
