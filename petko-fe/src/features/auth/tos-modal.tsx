import { useRef, useState } from 'react'
import logoImg from '@/assets/logo.png'
import pawYellowImg from '@/assets/paw_yellow.png'

interface TosModalProps {
  onAccept: () => void
  /** true = first-login flow (shows "I have read and agree" footer button)
   *  false/undefined = opened from footer link (shows top-right ✕ close only) */
  isFirstLogin?: boolean
  isSaving?: boolean
  error?: string | null
}

export default function TosModal({ onAccept, isFirstLogin = false, isSaving = false, error = null }: TosModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    // Allow a 40px tolerance so it doesn't require pixel-perfect bottom
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    if (atBottom) setScrolledToBottom(true)
  }

  return (
    /* Backdrop */
    <div role="dialog" aria-modal="true" aria-labelledby="tos-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      {/* Modal card */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative z-10 shrink-0 flex items-center gap-3 px-8 pt-7 pb-4 border-b border-gray-100 overflow-hidden">
          {/* Decorative paw — clipped inside header */}
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute -top-4 -right-4 w-32 opacity-25 pointer-events-none rotate-12 z-0" />
          <img src={logoImg} alt="PetKo" className="h-8 object-contain relative z-10" />
          <div className="flex-1 relative z-10">
            <h2 id="tos-title" className="text-lg font-black text-petko-blue" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Terms of Service & Privacy Policy
            </h2>
            <p className="text-xs text-gray-400">
              {isFirstLogin ? 'Please read and scroll to the bottom to continue.' : 'PetKo Terms of Service & Privacy Policy'}
            </p>
          </div>
          {/* Top-right close button — shown when opened from footer (not first login) */}
          {!isFirstLogin && (
            <button
              onClick={onAccept}
              className="relative z-10 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          tabIndex={0}
          aria-label="Read terms and privacy policy"
          className="flex-1 overflow-y-auto px-8 py-6 text-sm text-gray-700 space-y-6 leading-relaxed"
        >
          {/* ── Terms of Service ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-bold text-petko-blue mb-1">1. Terms of Service</h3>
            <p className="text-xs text-gray-400 mb-3">Effective Date: November 8, 2026</p>
            <p className="italic text-gray-500 mb-3">Brand Concept: "There's More to Care" / "Para sa pet ko"</p>
            <p>Welcome to PetKo.ph. PetKo provides website features, product catalog browsing, cart management, and online purchasing services to you when you visit or shop at PetKo.ph (the "Platform"). By creating an account, browsing, or placing an order on PetKo, you agree to these Terms of Service. Please read them carefully.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.1 Privacy and Electronic Communications</h4>
            <p>When you use PetKo or send emails, text messages, and other communications from your desktop or mobile device to us, you are communicating with us electronically. You consent to receive communications from us electronically, such as e-mails, mobile push notices, or notices and messages on this site.</p>
            <p className="mt-2">Your submission of personal information through the Platform is governed by our Privacy Policy, which is incorporated into these Terms of Service by reference. We process your data in compliance with Republic Act No. 10173 (Data Privacy Act of 2012).</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.2 Your Account and Responsibilities</h4>
            <p>If you create an account on PetKo, you are responsible for maintaining the confidentiality of your account credentials and password, as well as restricting unauthorized access to your computer or mobile device. You agree to accept full responsibility for all activities, orders, and transactions that occur under your account.</p>
            <p className="mt-2">PetKo sells products for cats and dogs to adults who can purchase with a credit card, e-wallet, or Cash on Delivery. If you are under 18, you may use PetKo only with the involvement and consent of a parent or legal guardian. PetKo reserves the right to refuse service, terminate accounts, or cancel orders at its sole discretion.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.3 Product Descriptions, Variants, and Availability</h4>
            <p>PetKo attempts to be as accurate as possible regarding product information, specifications, weights, sizes, flavors, and compatibility for cats and dogs. In compliance with Republic Act No. 11967 (Internet Transactions Act of 2023), we strive to display items in their correct type, quantity, and quality.</p>
            <p className="mt-2">However, PetKo does not warrant that product descriptions, imagery, or other content on the site are entirely error-free or complete. If a product offered by PetKo is not as described, your sole remedy is to return it in unused condition in accordance with our return procedures. Placing an item in your shopping cart does not reserve the product or lock its price until checkout is finalized.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.4 Pricing and Payment Terms</h4>
            <p>All prices listed on PetKo are displayed in Philippine Pesos (PHP / ₱) and include applicable taxes. We cannot confirm the price of an item until you place an order.</p>
            <p className="mt-2">PetKo supports multiple payment methods, including Cash on Delivery (COD), mobile e-wallets (GCash, Maya), and credit or debit cards. When selecting Cash on Delivery, you enter into a binding agreement to pay the courier rider the total order amount upon physical delivery. Repeated refusal of valid COD orders may result in permanent restriction of your account's payment privileges.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.5 Risk of Loss and Shipment</h4>
            <p>All physical products purchased from PetKo are made pursuant to a shipment contract. This means that the risk of loss and title for such items pass to you upon our delivery of the package to the designated third-party logistics courier.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.6 Returns, Refunds, and Title</h4>
            <p>PetKo does not take title to returned items until the item arrives at our fulfillment location. Returns and refunds are handled in compliance with Philippine consumer protection laws and R.A. 11967. Eligible returns include defective items, incorrect product variants delivered, or expired goods.</p>
            <p className="mt-2">Due to safety and health standards for pets, opened consumable products (such as unsealed pet food, kibble bags, or pet treats) cannot be returned or refunded unless proven defective prior to unsealing.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.7 Animal Care Disclaimer</h4>
            <p>PetKo operates under the brand philosophy "There's More to Care". Content, product guidance, and hygiene descriptions available on the Platform are provided for general informational purposes only and do not constitute professional veterinary advice. Pet owners remain responsible for complying with statutory duties under Republic Act No. 9482 (Anti-Rabies Act of 2007) regarding proper vaccination, control, and nourishment for their pets.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">1.8 Disputes and Applicable Law</h4>
            <p>By using PetKo, you agree that the laws of the Republic of the Philippines, without regard to principles of conflict of laws, will govern these Terms of Service and any dispute of any sort that might arise between you and PetKo. Any dispute or claim relating in any way to your use of PetKo or to any products sold or distributed through the Platform will be subject to the exclusive jurisdiction of the proper courts in Manila, Philippines.</p>
          </section>

          {/* ── Privacy Policy ───────────────────────────────────────────── */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-base font-bold text-petko-blue mb-1">2. Privacy Policy</h3>
            <p className="text-xs text-gray-400 mb-3">Effective Date: November 8, 2026 · Governing Law: R.A. 10173 & R.A. 11967</p>
            <p>PetKo values your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and safeguard your personal information when you use our web platform.</p>
          </div>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.1 Information We Collect</h4>
            <p>We collect personal data that you provide directly during account registration, checkout, and platform interaction:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              <li><strong>Account Information:</strong> Full name, email address, password hash, and contact phone number.</li>
              <li><strong>Delivery & Fulfillment Details:</strong> Recipient name, complete shipping address, landline/mobile contact numbers, and delivery instructions.</li>
              <li><strong>Transaction History:</strong> Purchased items, selected variants (size/flavor), order values, and payment status.</li>
              <li><strong>Pet Profile Data (Optional):</strong> Pet type (cat or dog), age, breed, and saved preferences used for personalized product discovery.</li>
              <li><strong>Technical & Usage Data:</strong> IP address, browser type, device information, and session cookies for cart persistence.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.2 How We Use Your Information</h4>
            <p>Your personal information is processed strictly for legitimate business and operational purposes:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              <li>To process, validate, and fulfill your orders.</li>
              <li>To coordinate shipment and delivery with third-party courier services.</li>
              <li>To process payments securely via Cash on Delivery, GCash, Maya, or card gateways.</li>
              <li>To provide account access, customer support, and order status notifications.</li>
              <li>To improve platform UI/UX, search filtering, and overall accessibility across devices.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.3 Disclosure & Data Sharing</h4>
            <p>PetKo does not sell, rent, or trade your personal data to third parties. We only share necessary data with trusted partners to perform essential platform operations:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              <li><strong>Logistics & Couriers:</strong> Delivery name, address, and mobile number provided to delivery riders to fulfill orders.</li>
              <li><strong>Payment Processors:</strong> Transaction details passed to secure gateway providers (e.g., GCash, Maya, banking partners) for payment processing.</li>
              <li><strong>Legal Compliance:</strong> When required by law, regulation, or legal proceedings under Philippine jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.4 Data Storage & Security</h4>
            <p>In accordance with R.A. 10173 (Data Privacy Act of 2012), PetKo implements technical, organizational, and physical security measures to protect your data against unauthorized access, loss, or alteration. Personal data is retained only for as long as necessary to maintain your active account, fulfill tax/legal reporting requirements, or complete order history logs.</p>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.5 User Rights Under the Data Privacy Act of 2012</h4>
            <p>As a data subject under Philippine law (R.A. 10173), you have the following rights:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
              <li><strong>Right to be Informed:</strong> You have the right to know how your personal data is collected and used.</li>
              <li><strong>Right to Access:</strong> You can request access to your personal information stored in your PetKo profile.</li>
              <li><strong>Right to Rectification:</strong> You may correct or update your profile details directly in your account settings.</li>
              <li><strong>Right to Erasure or Blocking:</strong> You may request the deletion or closure of your PetKo account and associated data.</li>
              <li><strong>Right to Object:</strong> You can opt out of non-essential marketing communications.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-bold text-petko-blue mb-1">2.6 Contact & Data Privacy Support</h4>
            <p>If you have questions, concerns, or requests regarding your personal data, privacy rights, or need assistance with your account, please reach out to our team at the contact information provided on the platform.</p>
            <ul className="mt-2 space-y-3 text-gray-600">
              <li className="list-disc list-inside">
                <strong>Name:</strong> Daniel Hardy C. Camacho
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> danielcamacho0416@gmail.com
                </div>
              </li>

              <li className="list-disc list-inside">
                <strong>Name:</strong> Raymart A. Diesta
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> raymartdiesta01@gmail.com
                </div>
              </li>

              <li className="list-disc list-inside">
                <strong>Name:</strong> Marc Cedric S. Gerona
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> marcgerona19@gmail.com
                </div>
              </li>

              <li className="list-disc list-inside">
                <strong>Name:</strong> Daniella Ysabelle D. Ibo
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> ibodaniella@gmail.com
                </div>
              </li>

              <li className="list-disc list-inside">
                <strong>Name:</strong> Lauren Aubrey N. Ilasin
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> ilaurenaubrey@gmail.com
                </div>
              </li>

              <li className="list-disc list-inside">
                <strong>Name:</strong> Tricia Mae P. Sanchez
                <div className="pl-5 text-sm">
                  <strong>Email:</strong> sancheztriciap@gmail.com
                </div>
              </li>
            </ul>
          </section>
          <div className="h-4" />
        </div>

        {/* Footer — only shown for first-login flow */}
        {isFirstLogin && (
          <div className="shrink-0 border-t border-gray-100 px-8 py-5 bg-white">
            {error && <p role="alert" className="mb-3 text-center text-sm font-semibold text-red-700">{error}</p>}
            {!scrolledToBottom && (
              <p className="mb-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                ↓ Scroll to the bottom to enable the button
              </p>
            )}
            <button
              onClick={onAccept}
              disabled={!scrolledToBottom || isSaving}
              aria-busy={isSaving}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition
                bg-petko-blue hover:bg-petko-blue/90 active:scale-[0.98]
                disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? 'Saving agreement…' : 'I have read and agree to the Terms of Service & Privacy Policy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
