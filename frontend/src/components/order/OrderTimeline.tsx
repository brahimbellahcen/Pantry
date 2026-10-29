import { CheckCircle, Clock, Package, Truck, Home, XCircle, RotateCcw } from 'lucide-react'
import type { OrderStatus } from '@/types'

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'pending',    label: 'Order Placed',  icon: Clock },
  { status: 'confirmed',  label: 'Confirmed',     icon: CheckCircle },
  { status: 'processing', label: 'Preparing',     icon: Package },
  { status: 'shipped',    label: 'Shipped',       icon: Truck },
  { status: 'delivered',  label: 'Delivered',     icon: Home },
]

const ORDER_IDX: Record<string, number> = Object.fromEntries(STEPS.map((s, i) => [s.status, i]))

interface Props { status: OrderStatus }

export function OrderTimeline({ status }: Props) {
  const isCancelled = status === 'cancelled' || status === 'refunded'
  const currentIdx = ORDER_IDX[status] ?? -1

  if (isCancelled) return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {status === 'refunded' ? <RotateCcw className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      <span className="font-medium capitalize">{status}</span>
    </div>
  )

  return (
    <div className="relative mt-4">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const done = idx <= currentIdx
          const active = idx === currentIdx
          const Icon = step.icon
          return (
            <div key={step.status} className="flex flex-1 flex-col items-center">
              {/* Line before */}
              {idx > 0 && (
                <div className="absolute top-4 left-0 right-0 -z-10 h-0.5 mx-[10%]"
                  style={{ left: `${(idx - 1) * 25 + 12.5}%`, right: `${(STEPS.length - idx) * 25 + 12.5}%` }}>
                  <div className={`h-full ${done ? 'bg-brand-500' : 'bg-gray-200'}`} />
                </div>
              )}
              <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                done ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-400'
              } ${active ? 'ring-4 ring-brand-100' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className={`mt-1.5 text-center text-xs ${done ? 'font-semibold text-brand-700' : 'text-gray-400'}`}>
                {step.label}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
