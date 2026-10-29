import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/ui/Badge'
import { toast } from 'react-hot-toast'

export default function OAuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const code = params.get('code')
    if (!code) { toast.error('OAuth failed'); navigate('/login'); return }

    apiClient.post('/auth/oauth/google/callback', {
      code,
      redirect_uri: `${window.location.origin}/auth/callback`,
    }).then(r => {
      localStorage.setItem('access_token', r.data.access_token)
      localStorage.setItem('refresh_token', r.data.refresh_token)
      window.location.href = '/'
    }).catch(() => {
      toast.error('Google login failed')
      navigate('/login')
    })
  }, [])

  return (
    <div className="flex min-h-[60vh] items-center justify-center flex-col gap-3">
      <Spinner />
      <p className="text-sm text-gray-500">Signing you in with Google…</p>
    </div>
  )
}
