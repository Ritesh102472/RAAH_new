export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="peachGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:"#ff9d63", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#ff5e00", stopOpacity:1}} />
        </linearGradient>
      </defs>
      {/* Modern Friendly Shape */}
      <circle cx="50" cy="50" r="45" stroke="url(#peachGrad)" strokeWidth="8" strokeLinecap="round" />
      <path d="M30 50 L45 65 L70 35" stroke="#1f2937" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}