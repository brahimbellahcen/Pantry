import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      await apiClient.post('/auth/reset-password', { token, new_password: password })
      toast.success('Password reset! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Invalid or expired link')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="py-20 text-center text-gray-500">
      Invalid reset link. <Link to="/forgot-password" className="text-brand-600 hover:underline">Request a new one</Link>.
    </div>
  )

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Set a new password</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Input label="New password" type="password" required value={password}
            onChange={e => setPassword(e.target.value)} hint="Minimum 8 characters" />
          <Input label="Confirm password" type="password" required value={confirm}
            onChange={e => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">Reset Password</Button>
        </form>
      </div>
    </div>
  )
}
