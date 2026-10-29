import { Link, useNavigate } from 'react-router-dom'
import { SEO } from '@/components/SEO'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <SEO title="Page Not Found" />
      <p className="text-8xl font-black text-brand-200 dark:text-brand-900 select-none">404</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-gray-500 max-w-sm">
        This page doesn't exist or was moved. Let's get you back to the good stuff.
      </p>
      <div className="mt-6 flex gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary">← Go back</button>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
      <p className="mt-8 text-4xl">🛒</p>
    </div>
  )
}
