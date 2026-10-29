import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { wishlistApi } from '@/api/wishlist'
import { useAuth } from './AuthContext'
import type { Product } from '@/types'

interface WishlistState {
  items: Product[]
  ids: Set<number>
  toggle: (product_id: number) => Promise<void>
  isWishlisted: (product_id: number) => boolean
}

const WishlistContext = createContext<WishlistState | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<Product[]>([])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setItems([]); return }
    try { setItems(await wishlistApi.get()) } catch { setItems([]) }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])

  const ids = new Set(items.map(p => p.id))

  const toggle = async (product_id: number) => {
    if (ids.has(product_id)) {
      await wishlistApi.remove(product_id)
    } else {
      await wishlistApi.add(product_id)
    }
    await refresh()
  }

  return (
    <WishlistContext.Provider value={{ items, ids, toggle, isWishlisted: (id) => ids.has(id) }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
