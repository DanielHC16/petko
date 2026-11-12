import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar'
import logoImg      from '@/assets/logo.png'
import pawYellowImg from '@/assets/paw_yellow.png'
import TosModal from '@/features/auth/tos-modal'
import { useTosStore } from '@/store/tos.store'
import { useTosAcceptance } from '@/features/auth/use-tos-acceptance'
import { PRODUCT_CATEGORIES } from '@/lib/product-catalog'

const FOOTER_CATEGORIES = [{ to: '/?cat=all', label: 'All Items' }, ...PRODUCT_CATEGORIES.map(({ id, label }) => ({ to: `/?cat=${id}`, label }))]

function Footer() {
  const openTos = useTosStore(s => s.open)
  const [catsOpen, setCatsOpen] = useState(false)

  return (
    <footer className="relative overflow-hidden bg-white border-t border-gray-200">

      {/* Decorative paws */}
      <img src={pawYellowImg} alt="" aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 w-36 opacity-20 pointer-events-none" />
      <img src={pawYellowImg} alt="" aria-hidden="true"
        className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/4 w-28 opacity-20 pointer-events-none rotate-12" />

      <div className="relative z-10 mx-auto max-w-screen-xl px-6 py-8">

        {/* ── Mobile layout ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 sm:hidden">

          {/* Brand */}
          <div className="flex flex-col gap-1.5">
            <img src={logoImg} alt="PetKo" className="h-8 object-contain self-start" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Care for pets.<br />From our hearts to theirs.
            </p>
          </div>

          {/* 2×2 grid: Shop | Categories / About Us | Get in touch */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6">

            {/* Shop */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-800">Shop</p>
              <Link to="/"         className="text-xs text-gray-500 hover:text-petko-blue transition">All Products</Link>
              <Link to="/?pet=dog" className="text-xs text-gray-500 hover:text-petko-blue transition">Dogs</Link>
              <Link to="/?pet=cat" className="text-xs text-gray-500 hover:text-petko-blue transition">Cats</Link>
            </div>

            {/* Categories */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-800">Categories</p>
              <div className="flex flex-col gap-2">
                {(catsOpen ? FOOTER_CATEGORIES : FOOTER_CATEGORIES.slice(0, 3)).map(cat => (
                  <Link key={cat.to} to={cat.to}
                    className="text-xs text-gray-500 hover:text-petko-blue transition">
                    {cat.label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setCatsOpen(o => !o)}
                className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition self-start"
              >
                {catsOpen ? 'See less' : `See more (${FOOTER_CATEGORIES.length - 3} more)`}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform duration-200 ${catsOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            {/* About Us */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-800">About Us</p>
              <button onClick={openTos}
                className="text-xs text-gray-500 hover:text-petko-blue transition text-left leading-relaxed">
                Terms of Service &amp;<br />Privacy Policy
              </button>
            </div>

            {/* Get in touch */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-800">Get in touch</p>
              <a href="tel:1234567890" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-petko-blue transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.02 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
                123 456 7890
              </a>
              <a href="mailto:parasa@petko.ph" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-petko-blue transition">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                parasa@petko.ph
              </a>
              <div className="flex items-center gap-3 mt-1">
                <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-petko-blue transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
                </a>
                <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-petko-blue transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
                </a>
                <a href="#" aria-label="TikTok" className="text-gray-400 hover:text-petko-blue transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
                </a>
              </div>
            </div>

          </div>

        </div>

        {/* ── Desktop layout (sm+) ───────────────────────────────────────── */}
        <div className="hidden sm:grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-[auto_auto_minmax(0,400px)_auto_auto]">

          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col gap-2">
            <img src={logoImg} alt="PetKo" className="h-8 object-contain self-start" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Care for pets.<br />From our hearts to theirs.
            </p>
          </div>

          {/* Shop */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-800">Shop</p>
            <Link to="/"          className="text-xs text-gray-500 hover:text-petko-blue transition">All Products</Link>
            <Link to="/?pet=dog"  className="text-xs text-gray-500 hover:text-petko-blue transition">Dogs</Link>
            <Link to="/?pet=cat"  className="text-xs text-gray-500 hover:text-petko-blue transition">Cats</Link>
          </div>

          <div className="col-span-2 flex min-w-0 flex-col gap-2 lg:col-span-1">
            <p className="text-sm font-bold text-gray-800">Categories</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 sm:gap-x-6">
              {FOOTER_CATEGORIES.map(cat => (
                <Link key={cat.to} to={cat.to}
                  className="text-xs text-gray-500 hover:text-petko-blue transition">
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* About Us */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-800">About Us</p>
            <button onClick={openTos}
              className="text-xs text-gray-500 hover:text-petko-blue transition text-left leading-relaxed">
              Terms of Service &amp;<br /> Privacy Policy
            </button>
          </div>

          {/* Get in touch */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-800">Get in touch</p>
            <a href="tel:1234567890" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-petko-blue transition">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.02 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
              123 456 7890
            </a>
            <a href="mailto:parasa@petko.ph" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-petko-blue transition">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
              parasa@petko.ph
            </a>
            <div className="flex items-center gap-3 mt-1">
              <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-petko-blue transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-petko-blue transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" aria-label="TikTok" className="text-gray-400 hover:text-petko-blue transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-6 border-t border-gray-100 pt-4 text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} PetKo — Filipino Pet Supplies Platform. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default function AppLayout() {
  const { isOpen, close } = useTosStore()
  const acceptance = useTosAcceptance()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      {acceptance.needsAcceptance ? (
        <TosModal key={acceptance.userId} onAccept={() => void acceptance.accept()}
          isFirstLogin isSaving={acceptance.isSaving} error={acceptance.error} />
      ) : isOpen && (
        <TosModal onAccept={close} />
      )}
    </div>
  )
}
