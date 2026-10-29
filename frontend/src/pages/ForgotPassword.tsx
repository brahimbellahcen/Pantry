import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Mail } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Mail className="h-12 w-12 text-brand-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-gray-600">
          If <strong>{email}</strong> is registered, you'll receive a reset link within a minute.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Forgot your password?</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" isLoading={loading} className="w-full">Send Reset Link</Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Remembered it? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
