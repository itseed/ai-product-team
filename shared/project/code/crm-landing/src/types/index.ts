export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Testimonial {
  name: string
  role: string
  company: string
  quote: string
  avatar: string
}

export interface PricingPlan {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  highlighted: boolean
  cta: string
}

export interface LeadFormData {
  email: string
  company: string
  phone: string
}
