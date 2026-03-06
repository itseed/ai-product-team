import { useState } from 'react'
import { Check } from 'lucide-react'
import type { PricingPlan } from '../types'

const PLANS: PricingPlan[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'เริ่มต้นใช้งานฟรี ไม่มีค่าใช้จ่าย',
    features: [
      'ผู้ใช้สูงสุด 3 คน',
      'Pipeline 1 รูปแบบ',
      'Lead สูงสุด 200 รายการ',
      'รายงานพื้นฐาน',
      'Email Integration',
      'Mobile App',
    ],
    highlighted: false,
    cta: 'เริ่มใช้ฟรี',
  },
  {
    name: 'Pro',
    monthlyPrice: 990,
    yearlyPrice: 792,
    description: 'สำหรับทีมขายที่เติบโต ต้องการ Automation',
    features: [
      'ผู้ใช้สูงสุด 25 คน',
      'Pipeline ไม่จำกัด',
      'Lead ไม่จำกัด',
      'Email Automation',
      'Advanced Analytics',
      'Line / SMS Integration',
      'Custom Fields',
      'API Access',
    ],
    highlighted: true,
    cta: 'ทดลองฟรี 14 วัน',
  },
  {
    name: 'Enterprise',
    monthlyPrice: -1,
    yearlyPrice: -1,
    description: 'สำหรับองค์กร ต้องการ Customization เต็มรูปแบบ',
    features: [
      'ผู้ใช้ไม่จำกัด',
      'ทุกฟีเจอร์ใน Pro',
      'Dedicated Account Manager',
      'Custom Integration',
      'SSO / SAML',
      'SLA 99.99%',
      'On-boarding Training',
      'Priority Support 24/7',
    ],
    highlighted: false,
    cta: 'ติดต่อฝ่ายขาย',
  },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat('th-TH').format(price)
}

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            ราคา
          </span>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            เลือกแพลนที่<span className="text-primary-600">เหมาะกับทีมคุณ</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            เริ่มต้นฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต ยกเลิกได้ทุกเมื่อ
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            รายเดือน
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            role="switch"
            aria-checked={isYearly}
            aria-label="Toggle yearly pricing"
            className={`relative h-7 w-12 rounded-full transition-colors ${
              isYearly ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                isYearly ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}>
            รายปี
          </span>
          {isYearly && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              ประหยัด 20%
            </span>
          )}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-shadow ${
                plan.highlighted
                  ? 'border-primary-200 bg-primary-50/30 shadow-xl ring-2 ring-primary-500'
                  : 'border-gray-200 bg-white shadow-sm hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-4 py-1 text-xs font-bold text-white">
                  ยอดนิยม
                </div>
              )}

              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-sm text-gray-500">{plan.description}</p>

              <div className="mt-6">
                {plan.monthlyPrice === 0 ? (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900">฿0</span>
                    <span className="text-gray-500"> / ตลอดไป</span>
                  </>
                ) : plan.monthlyPrice < 0 ? (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                    <span className="text-gray-500"> / ติดต่อเรา</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900">
                      ฿{formatPrice(isYearly ? plan.yearlyPrice : plan.monthlyPrice)}
                    </span>
                    <span className="text-gray-500"> / ผู้ใช้ / เดือน</span>
                  </>
                )}
              </div>

              <a
                href="#signup"
                className={`mt-8 block rounded-xl py-3.5 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.cta}
              </a>

              <ul className="mt-8 space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
