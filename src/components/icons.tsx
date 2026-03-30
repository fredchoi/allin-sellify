interface IconProps {
  className?: string
}

export function Menu({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

export function X({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function Play({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6,3 20,12 6,21" />
    </svg>
  )
}

export function BarChart3({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <rect x="7" y="10" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.3" />
      <rect x="12" y="6" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="17" y="3" width="3" height="15" rx="0.5" fill="currentColor" opacity="0.7" />
    </svg>
  )
}

export function ShoppingCart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  )
}

export function TrendingUp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

export function ArrowRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function ArrowDown({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  )
}

export function ChevronDown({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function Search({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function Sparkles({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      <path d="M20 4l.8 2.4L23 8l-2.2.8L20 11.2l-.8-2.4L17 8l2.2-.8z" opacity="0.6" />
    </svg>
  )
}

export function Store({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9h18v12H3z" />
      <path d="M9 9v12" />
      <path d="M3 9c0 1.5 1.5 3 3 3s3-1.5 3-3" />
      <path d="M9 9c0 1.5 1.5 3 3 3s3-1.5 3-3" />
      <path d="M15 9c0 1.5 1.5 3 3 3s3-1.5 3-3" />
    </svg>
  )
}

export function Package({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4L7.5 4.21" />
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

export function Calculator({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <circle cx="8" cy="11" r="0.8" fill="currentColor" />
      <circle cx="12" cy="11" r="0.8" fill="currentColor" />
      <circle cx="16" cy="11" r="0.8" fill="currentColor" />
      <circle cx="8" cy="15" r="0.8" fill="currentColor" />
      <circle cx="12" cy="15" r="0.8" fill="currentColor" />
      <circle cx="16" cy="15" r="0.8" fill="currentColor" />
      <circle cx="8" cy="19" r="0.8" fill="currentColor" />
      <circle cx="12" cy="19" r="0.8" fill="currentColor" />
      <circle cx="16" cy="19" r="0.8" fill="currentColor" />
    </svg>
  )
}

export function Share2({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export function Check({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function Monitor({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

export function Quote({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" opacity="0.15">
      <path d="M11.3 5.2C7.6 7.5 5.2 10.5 4.1 14.2c-.2.7.3 1.4 1 1.6.3.1.6 0 .9-.1 1.8-1.3 3.7-1.8 5.3-1.3 2.1.7 3.2 2.7 2.8 5-.4 2.5-2.7 4.3-5.3 4.1C5.2 23.2 2.4 20 2 16.2 1.4 11.1 4 6.5 9.1 3.4c.6-.4 1.5-.2 1.9.4.3.6.2 1.1-.2 1.4h.5zm10 0C17.6 7.5 15.2 10.5 14.1 14.2c-.2.7.3 1.4 1 1.6.3.1.6 0 .9-.1 1.8-1.3 3.7-1.8 5.3-1.3 2.1.7 3.2 2.7 2.8 5-.4 2.5-2.7 4.3-5.3 4.1-3.6-.3-6.4-3.5-6.8-7.3C11.4 11.1 14 6.5 19.1 3.4c.6-.4 1.5-.2 1.9.4.3.6.2 1.1-.2 1.4h.5z" />
    </svg>
  )
}

export function Zap({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

// 페인포인트 일러스트 아이콘
export function ClockWarning({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="2" fill="#F8FAFC" />
      <circle cx="32" cy="32" r="22" stroke="#2563EB" strokeWidth="2.5" fill="white" />
      <line x1="32" y1="18" x2="32" y2="32" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="42" y2="38" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="52" cy="14" r="10" fill="#EF4444" />
      <text x="52" y="18" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
    </svg>
  )
}

export function SplitMarket({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <rect x="4" y="12" width="24" height="40" rx="4" stroke="#2563EB" strokeWidth="2" fill="#DBEAFE" />
      <rect x="36" y="12" width="24" height="40" rx="4" stroke="#64748B" strokeWidth="2" fill="#F1F5F9" />
      <line x1="32" y1="8" x2="32" y2="56" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="8" y="18" width="16" height="3" rx="1" fill="#2563EB" opacity="0.6" />
      <rect x="8" y="24" width="12" height="3" rx="1" fill="#2563EB" opacity="0.4" />
      <rect x="8" y="30" width="14" height="3" rx="1" fill="#2563EB" opacity="0.3" />
      <rect x="40" y="18" width="16" height="3" rx="1" fill="#64748B" opacity="0.6" />
      <rect x="40" y="24" width="12" height="3" rx="1" fill="#64748B" opacity="0.4" />
      <rect x="40" y="30" width="14" height="3" rx="1" fill="#64748B" opacity="0.3" />
      <circle cx="32" cy="32" r="6" fill="white" stroke="#EF4444" strokeWidth="2" />
      <path d="M30 30l4 4M34 30l-4 4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function OutOfStock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M12 48V20l20-12 20 12v28l-20 8-20-8z" stroke="#64748B" strokeWidth="2" fill="#F8FAFC" />
      <path d="M12 20l20 10 20-10" stroke="#64748B" strokeWidth="2" />
      <line x1="32" y1="30" x2="32" y2="56" stroke="#64748B" strokeWidth="2" />
      <path d="M32 30l20-10" stroke="#64748B" strokeWidth="2" />
      <circle cx="48" cy="14" r="12" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2" />
      <text x="48" y="19" textAnchor="middle" fill="#EF4444" fontSize="14" fontWeight="bold">0</text>
      <path d="M20 40l8-8M28 40l-8-8" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

export function CalculatorConfused({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <rect x="14" y="6" width="36" height="52" rx="6" stroke="#2563EB" strokeWidth="2" fill="white" />
      <rect x="20" y="12" width="24" height="10" rx="2" fill="#DBEAFE" />
      <circle cx="24" cy="30" r="2.5" fill="#64748B" />
      <circle cx="32" cy="30" r="2.5" fill="#64748B" />
      <circle cx="40" cy="30" r="2.5" fill="#64748B" />
      <circle cx="24" cy="38" r="2.5" fill="#64748B" />
      <circle cx="32" cy="38" r="2.5" fill="#64748B" />
      <circle cx="40" cy="38" r="2.5" fill="#64748B" />
      <circle cx="24" cy="46" r="2.5" fill="#64748B" />
      <circle cx="32" cy="46" r="2.5" fill="#64748B" />
      <circle cx="40" cy="46" r="2.5" fill="#64748B" />
      <circle cx="52" cy="12" r="10" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
      <text x="52" y="17" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="bold">?</text>
    </svg>
  )
}

// 페인포인트 아이콘 맵
const painPointIconMap: Record<string, React.ComponentType<IconProps>> = {
  ClockWarning,
  SplitMarket,
  OutOfStock,
  CalculatorConfused,
}

export function getPainPointIcon(name: string): React.ComponentType<IconProps> {
  return painPointIconMap[name] ?? Zap
}

// Feature icon map (동적 아이콘 해결)
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  Search,
  Sparkles,
  Store,
  Package,
  Calculator,
  Share2,
  Zap,
}

export function getFeatureIcon(name: string): React.ComponentType<IconProps> {
  return iconMap[name] ?? Zap
}
