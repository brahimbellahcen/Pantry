import { useEffect, useState } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Bell } from 'lucide-react'

interface Prefs { order_updates: boolean; promotional: boolean; low_stock_alerts: boolean; weekly_digest: boolean }

const LABELS: Record<keyof Prefs, string> = {
  order_updates: 'Order status updates (confirmed, shipped, delivered)',
  promotional: 'Promotions and flash sales',
  low_stock_alerts: 'Low-stock alerts (admin only)',
  weekly_digest: 'Weekly digest email',
}

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Prefs>({ order_updates: true, promotional: true, low_stock_alerts: false, weekly_digest: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.get<Prefs>('/account/notifications').then(r => setPrefs(r.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/account/notifications', prefs)
      toast.success('Preferences saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-600" /> Notification Preferences
      </h1>
      <div className="card p-5 space-y-4">
        {(Object.keys(prefs) as (keyof Prefs)[]).map(key => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={prefs[key]}
              onChange={e => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded accent-brand-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{LABELS[key]}</span>
          </label>
        ))}
        <Button onClick={handleSave} isLoading={saving} size="sm">Save Preferences</Button>
      </div>
    </div>
  )
}
