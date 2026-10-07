import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* The Navbar's Storefront / Admin Panel toggle is the only view switch. */}
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>© {new Date().getFullYear()} Petko — Filipino Pet Supplies Platform.</p>
        </div>
      </footer>
    </div>
  )
}
