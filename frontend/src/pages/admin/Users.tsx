import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import { Spinner } from '@/components/ui/Badge'
import { formatDate } from '@/utils/format'
import type { User } from '@/types'
import { Shield, User as UserIcon } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminApi.listUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    !search || u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">{users.filter(u => !u.is_admin).length} total</span>
      </div>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="input mb-4 max-w-sm"
      />

      {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>{['User', 'Email', 'Role', 'Joined', 'Status'].map(h =>
                <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_admin
                      ? <span className="flex items-center gap-1 text-xs font-medium text-purple-700"><Shield className="h-3 w-3" /> Admin</span>
                      : <span className="flex items-center gap-1 text-xs text-gray-500"><UserIcon className="h-3 w-3" /> Customer</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No users found.</p>
          )}
        </div>
      )}
    </div>
  )
}
