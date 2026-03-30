interface LogoBaseProps {
  width?: number
  height?: number
  className?: string
}

/**
 * Sellify 가로형 로고 — 밝은 배경(Navbar)용
 * 아이콘 블록(오렌지 #EA580C) + "Sellify" 다크 워드마크
 */
export function Logo({ width = 188, height = 40, className }: LogoBaseProps) {
  const scale = height / 40
  const scaledWidth = Math.round(width > 0 ? width : 188 * scale)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 188 40"
      width={scaledWidth}
      height={height}
      className={className}
      role="img"
      aria-label="Sellify"
    >
      {/* 오렌지 아이콘 블록 */}
      <rect x="0" y="2" width="36" height="36" rx="8" fill="#EA580C" />
      {/* 화이트 S 심볼 */}
      <path
        d="M22.5,10 C28.5,10 28.5,20 18,20 C7.5,20 7.5,30 13.5,30"
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 다크 워드마크 */}
      <text
        x="44"
        y="27"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Pretendard', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="#1C1917"
        letterSpacing="-0.3"
      >
        Sellify
      </text>
    </svg>
  )
}

/**
 * Sellify 아이콘형 로고 — 파비콘, 앱 아이콘용
 * 오렌지 배경에 화이트 S 심볼
 */
export function LogoIcon({ width = 48, height = 48, className }: LogoBaseProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Sellify 아이콘"
    >
      {/* 오렌지 배경 */}
      <rect width="48" height="48" rx="10" fill="#EA580C" />
      {/* 화이트 S 심볼 */}
      <path
        d="M30,13 C38,13 38,24 24,24 C10,24 10,35 18,35"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Sellify 가로형 로고 — 어두운 배경(Footer, 다크 헤더)용
 * 아이콘 블록(오렌지 #EA580C) + "Sellify" 화이트 워드마크
 */
export function LogoWhite({ width = 188, height = 40, className }: LogoBaseProps) {
  const scale = height / 40
  const scaledWidth = Math.round(width > 0 ? width : 188 * scale)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 188 40"
      width={scaledWidth}
      height={height}
      className={className}
      role="img"
      aria-label="Sellify"
    >
      {/* 오렌지 아이콘 블록 */}
      <rect x="0" y="2" width="36" height="36" rx="8" fill="#EA580C" />
      {/* 화이트 S 심볼 */}
      <path
        d="M22.5,10 C28.5,10 28.5,20 18,20 C7.5,20 7.5,30 13.5,30"
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 화이트 워드마크 */}
      <text
        x="44"
        y="27"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Pretendard', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="#FFFFFF"
        letterSpacing="-0.3"
      >
        Sellify
      </text>
    </svg>
  )
}
