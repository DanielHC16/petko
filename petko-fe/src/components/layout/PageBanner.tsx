/**
 * PageBanner — the checkout-style page header used across all shop/admin
 * sub-pages (cart, orders, product detail, admin sub-pages).
 *
 * Matches the checkout page banner exactly:
 *   • bg-[#FFFBF5], h-[110px] sm:h-[130px] lg:h-[150px], rounded-b-2xl
 *   • Two left paw image pairs + two right paw image pairs
 *   • Text-only content area, no dog/cat illustration
 */
import pawYellowImg from '@/assets/paw_yellow.png'

interface PageBannerProps {
  /** Main heading text. Supports a JSX node for multi-colour titles. */
  title: React.ReactNode
  /** Smaller subtitle line below the title. */
  subtitle?: string
  /** Extra content rendered beneath the banner (e.g. breadcrumb, action bar). */
  children?: React.ReactNode
}

export default function PageBanner({ title, subtitle, children }: PageBannerProps) {
  return (
    <div className="-mx-6 -mt-6 mb-6 lg:-mx-10 lg:-mt-10">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-b-2xl bg-[#FFFBF5] h-[110px] sm:h-[130px] lg:h-[150px]">
        {/* Left paw pair */}
        <img src={pawYellowImg} alt="" aria-hidden="true"
          className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
          style={{ top: '40%', left: '-25px', transform: 'rotate(23deg)' }} />
        <img src={pawYellowImg} alt="" aria-hidden="true"
          className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
          style={{ top: 'calc(40% + 4px)', left: '-30px', transform: 'rotate(23deg)' }} />
        {/* Right paw pair */}
        <img src={pawYellowImg} alt="" aria-hidden="true"
          className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
          style={{ top: '-45px', right: '-50px', transform: 'rotate(195deg)' }} />
        <img src={pawYellowImg} alt="" aria-hidden="true"
          className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
          style={{ top: '-44px', right: '-55px', transform: 'rotate(195deg)' }} />

        {/* Text content */}
        <div className="relative z-20 h-full max-w-4xl mx-auto px-6 sm:px-8 flex items-center">
          <div>
            <h1
              className="font-extrabold text-[#0B419A] leading-[1.1]"
              style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 3rem)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 sm:mt-2 text-[11px] sm:text-[13px] font-medium text-gray-600 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Optional slot for breadcrumbs, action bars, etc. */}
      {children}
    </div>
  )
}
