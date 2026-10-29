import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { formatPrice } from '@/utils/format'
import { Package, ShoppingBag, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [revenue, setRevenue] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getRevenueSeries(30),
      adminApi.getTopProducts(5),
    ]).then(([s, r, tp]) => {
      setStats(s); setRevenue(r); setTopProducts(tp)
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !stats) return <div className="flex justify-center py-20"><Spinner /></div>

  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.total_revenue), icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Total Orders', value: stats.total_orders, icon: ShoppingBag, color: 'text-blue-600 bg-blue-100' },
    { label: 'Products', value: stats.total_products, icon: Package, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Customers', value: stats.total_customers, icon: Users, color: 'text-purple-600 bg-purple-100' },
    { label: 'Pending Orders', value: stats.pending_orders, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Low Stock', value: stats.low_stock_products, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  ]

  const hasRevenue = revenue.length > 0
  const hasTopProducts = topProducts.length > 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart — real DB data */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          Revenue — last 30 days
          {!hasRevenue && <span className="ml-2 text-xs text-gray-400">(no paid orders yet)</span>}
        </h2>
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }}
                tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']}
                labelFormatter={d => new Date(d).toLocaleDateString()} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Revenue data will appear here once orders are marked as paid.
          </div>
        )}
      </div>

      {/* Top products + orders per day */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Products</h2>
          {hasTopProducts ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [v, 'Units sold']} />
                <Bar dataKey="units" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Top products appear after first orders.
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Orders per day</h2>
          {hasRevenue ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }}
                  tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Orders']}
                  labelFormatter={d => new Date(d).toLocaleDateString()} />
                <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} fill="#eff6ff" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Order data will appear here once orders are placed.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
