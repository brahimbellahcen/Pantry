import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from '@/components/product/ProductCard'
import type { Product } from '@/types'

// Mock contexts
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn() }),
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

const mockProduct: Product = {
  id: 1,
  name: 'Organic Apple',
  slug: 'organic-apple',
  price: '2.99',
  compare_at_price: '3.99',
  image_url: null as any,
  is_active: true,
  is_featured: false,
  unit: 'kg',
  unit_quantity: '1',
  category: { id: 1, name: 'Fruits', slug: 'fruits', image_url: null as any, children: [] },
  inventory: { quantity: 20, low_stock_threshold: 5, track_inventory: true },
  created_at: '',
  updated_at: '',
}

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(<MemoryRouter><ProductCard product={mockProduct} /></MemoryRouter>)
    expect(screen.getByText('Organic Apple')).toBeInTheDocument()
    expect(screen.getByText('$2.99')).toBeInTheDocument()
    expect(screen.getByText('$3.99')).toBeInTheDocument()
  })

  it('shows discount badge when compare_at_price is set', () => {
    render(<MemoryRouter><ProductCard product={mockProduct} /></MemoryRouter>)
    expect(screen.getByText(/-\d+%/)).toBeInTheDocument()
  })

  it('shows out of stock when quantity is 0', () => {
    const p = { ...mockProduct, inventory: { ...mockProduct.inventory!, quantity: 0 } }
    render(<MemoryRouter><ProductCard product={p} /></MemoryRouter>)
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument()
  })
})
