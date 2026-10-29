// Shared TypeScript types mirroring backend schemas

export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  addresses: Address[]
}

export interface Address {
  id: number
  label?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postal_code: string
  country: string
  is_default: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  image_url?: string
  parent_id?: number
  children: Category[]
}

export interface InventoryInfo {
  quantity: number
  low_stock_threshold: number
  track_inventory: boolean
}

export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  price: string
  compare_at_price?: string
  unit?: string
  unit_quantity?: string
  image_url?: string
  images?: string[]
  tags?: string[]
  is_active: boolean
  is_featured: boolean
  category: Pick<Category, 'id' | 'name' | 'slug' | 'image_url'>
  inventory?: InventoryInfo
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  product_image_url?: string
  product_slug: string
  quantity: number
  unit_price: string
  line_total: string
}

export interface Cart {
  id: number
  items: CartItem[]
  subtotal: string
  item_count: number
}

export interface OrderItem {
  id: number
  product_id?: number
  product_name: string
  product_image_url?: string
  quantity: number
  unit_price: string
  total_price: string
}

export interface Order {
  id: number
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: string
  tax_amount: string
  shipping_amount: string
  discount_amount: string
  total: string
  shipping_address?: Record<string, string>
  notes?: string
  estimated_delivery?: string
  delivered_at?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrderSummary {
  id: number
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  total: string
  created_at: string
  item_count: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CheckoutResponse {
  order: Order
  client_secret?: string
  payment_url?: string
}
