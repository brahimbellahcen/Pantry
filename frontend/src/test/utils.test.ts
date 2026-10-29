import { describe, it, expect } from 'vitest'
import { formatPrice, formatDate, orderStatusColor } from '@/utils/format'

describe('formatPrice', () => {
  it('formats a number to dollar string', () => {
    expect(formatPrice(2.99)).toBe('$2.99')
    expect(formatPrice('10')).toBe('$10.00')
  })
})

describe('orderStatusColor', () => {
  it('returns green for delivered', () => {
    expect(orderStatusColor('delivered')).toContain('green')
  })
  it('returns red for cancelled', () => {
    expect(orderStatusColor('cancelled')).toContain('red')
  })
  it('falls back for unknown status', () => {
    expect(orderStatusColor('unknown')).toBeTruthy()
  })
})
