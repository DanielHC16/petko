import pawBlueImg from '@/assets/paw_blue.png'

/** Dev-only preview: http://localhost:5173/loading-preview */
export default function LoadingPreview() {
  const pawSteps = [
    { delay: 0.0, offsetY: -8, rotate: '75deg' },  // Left step 1
    { delay: 0.3, offsetY:  8, rotate: '105deg' }, // Right step 1
    { delay: 0.6, offsetY: -8, rotate: '75deg' },  // Left step 2
    { delay: 0.9, offsetY:  8, rotate: '105deg' }, // Right step 2
    { delay: 1.2, offsetY: -8, rotate: '75deg' },  // Left step 3
    { delay: 1.5, offsetY:  8, rotate: '105deg' }, // Right step 3
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-petko-cream">
      {/* Step animation keyframes */}
      <style>{`
        @keyframes pawWalkStep {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          15%, 75% {
            opacity: 1;
            transform: scale(1);
          }
          90%, 100% {
            opacity: 0;
            transform: scale(0.7);
          }
        }
      `}</style>

      {/* Walking paws row */}
      <div className="flex items-center gap-3 h-14">
        {pawSteps.map((p, i) => (
          <div
            key={i}
            style={{
              transform: `translateY(${p.offsetY}px) rotate(${p.rotate})`,
            }}
          >
            <img
              src={pawBlueImg}
              alt=""
              aria-hidden="true"
              className="w-8 h-8 object-contain"
              style={{
                animation: `pawWalkStep 2.4s ease-in-out ${p.delay}s infinite`,
                opacity: 0,
              }}
            />
          </div>
        ))}
      </div>

      <p
        className="text-base font-semibold text-petko-blue"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        Signing you in…
      </p>
    </div>
  )
}