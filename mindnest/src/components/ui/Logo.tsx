/**
 * MindNest 应用 Logo
 */
interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 背景渐变 */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="logoGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      
      {/* 外框 */}
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="url(#logoGradient)"
      />
      
      {/* 内部装饰 */}
      <path
        d="M8 10h16M8 16h12M8 22h8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      
      {/* 高光效果 */}
      <path
        d="M8 6c0-2 2-4 4-4h8c2 0 4 2 4 4"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.3"
        fill="none"
      />
    </svg>
  )
}

export function LogoIcon({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="5"
        fill="url(#logoGradient)"
      />
      <path
        d="M6 7.5h12M6 12h9M6 16.5h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
