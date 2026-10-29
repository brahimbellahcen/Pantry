import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Package, ShoppingBag, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [revenueData] = useState([
    { month: 'May', revenue: 4200 }, { month: 'Jun', revenue: 5800 },
    { month: 'Jul', revenue: 4900 }, { month: 'Aug', revenue: 7200 },
    { month: 'Sep', revenue: 6800 }, { month: 'Oct', revenue: 9100 },
  ])
  const [ordersByStatus] = useState([
    { name: 'Pending', value: 12 }, { name: 'Processing', value: 8 },
    { name: 'Shipped', value: 15 }, { name: 'Delivered', value: 47 },
    { name: 'Cancelled', value: 4 },
  ])

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
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI cards */}
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

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue area chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue (last 6 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2}
                fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by status pie */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                paddingAngle={3} dataKey="value">
                {ordersByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
