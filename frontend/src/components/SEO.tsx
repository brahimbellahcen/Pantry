interface SEOProps {
  title?: string
  description?: string
  image?: string
  type?: string
}

const SITE = 'Pantry'
const BASE_DESC = 'Fresh groceries delivered to your door. Quality produce, dairy, bakery, and more.'
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://pantry.app'

export function SEO({ title, description, image, type = 'website' }: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} | Fresh Groceries Delivered`
  const desc = description ?? BASE_DESC

  // Update document title imperatively (no react-helmet needed)
  if (typeof document !== 'undefined') {
    document.title = fullTitle

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.content = content
    }

    setMeta('description', desc)
    setMeta('og:title', fullTitle, true)
    setMeta('og:description', desc, true)
    setMeta('og:type', type, true)
    setMeta('og:url', window.location.href, true)
    if (image) setMeta('og:image', image, true)
    setMeta('twitter:card', 'summary_large_image')
    setMeta('twitter:title', fullTitle)
    setMeta('twitter:description', desc)
  }

  return null
}
