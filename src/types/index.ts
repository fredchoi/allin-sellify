export interface PainPoint {
  icon: string
  title: string
  description: string
}

export interface PipelineStep {
  number: number
  title: string
  items: string[]
  badge: string
}

export interface Feature {
  icon: string
  title: string
  hook: string
  bullets: string[]
  image: string
}

export interface Metric {
  value: number
  prefix?: string
  suffix?: string
  decimal?: number
  label: string
  description: string
}

export interface ComparisonRow {
  label: string
  before: string
  after: string
}

export interface PricingTier {
  name: string
  price: string
  originalPrice?: string
  period: string
  discount?: string
  features: string[]
  highlighted?: boolean
  cta: string
  ctaHref?: string
  earlyBirdBadge?: string
}

export interface Testimonial {
  quote: string
  name: string
  role: string
}

export interface FAQItem {
  question: string
  answer: string
}
