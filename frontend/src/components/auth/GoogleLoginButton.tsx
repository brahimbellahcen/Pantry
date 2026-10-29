import { useState } from 'react'
import { apiClient } from '@/api/client'
import { toast } from 'react-hot-toast'

interface Props { redirectUri?: string }

export function GoogleLoginButton({ redirectUri }: Props) {
  const [loading, setLoading] = useState(false)
  const uri = redirectUri ?? `${window.location.origin}/auth/callback`

  const handleClick = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/auth/oauth/google/url', { params: { redirect_uri: uri } })
      window.location.href = data.url
    } catch (err: any) {
      if (err?.response?.status === 503) {
        toast.error('Google login is not configured yet. Use email/password instead.')
      } else {
        toast.error('Could not start Google login')
      }
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )}
      Continue with Google
    </button>
  )
}
