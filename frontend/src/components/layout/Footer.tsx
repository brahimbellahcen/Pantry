import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Pantry</h3>
            <p className="mt-2 text-xs text-gray-500">Fresh groceries delivered to your door.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Shop</h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li><Link to="/products" className="hover:text-brand-600">All Products</Link></li>
              <li><Link to="/products?featured=true" className="hover:text-brand-600">Featured</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Account</h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li><Link to="/account/orders" className="hover:text-brand-600">My Orders</Link></li>
              <li><Link to="/account/profile" className="hover:text-brand-600">Profile</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Help</h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li><a href="#" className="hover:text-brand-600">FAQ</a></li>
              <li><a href="#" className="hover:text-brand-600">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Pantry. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
