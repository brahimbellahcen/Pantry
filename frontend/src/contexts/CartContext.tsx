import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartApi } from '@/api/cart'
import { useAuth } from './AuthContext'
import type { Cart, CartItem } from '@/types'

interface CartState {
  cart: Cart | null
  itemCount: number
  isLoading: boolean
  addItem: (product_id: number, quantity?: number) => Promise<void>
  updateItem: (item_id: number, quantity: number) => Promise<void>
  removeItem: (item_id: number) => Promise<void>
  clearCart: () => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setCart(null); return }
    setIsLoading(true)
    try { setCart(await cartApi.get()) }
    catch { setCart(null) }
    finally { setIsLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])

  const addItem = async (product_id: number, quantity = 1) => {
    const updated = await cartApi.addItem(product_id, quantity)
    setCart(updated)
  }

  const updateItem = async (item_id: number, quantity: number) => {
    const updated = await cartApi.updateItem(item_id, quantity)
    setCart(updated)
  }

  const removeItem = async (item_id: number) => {
    await cartApi.removeItem(item_id)
    await refresh()
  }

  const clearCart = async () => {
    await cartApi.clear()
    setCart(null)
  }

  const itemCount = cart?.item_count ?? 0

  return (
    <CartContext.Provider value={{ cart, itemCount, isLoading, addItem, updateItem, removeItem, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
