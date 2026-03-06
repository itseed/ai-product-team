import { Send, CheckCircle } from 'lucide-react'
import { useForm } from '../hooks/useForm'
import type { LeadFormData } from '../types'

function validateLeadForm(values: LeadFormData): Partial<Record<keyof LeadFormData, string>> {
  const errors: Partial<Record<keyof LeadFormData, string>> = {}

  if (!values.email) {
    errors.email = 'กรุณากรอกอีเมล'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
  }

  if (!values.company) {
    errors.company = 'กรุณากรอกชื่อบริษัท'
  }

  if (!values.phone) {
    errors.phone = 'กรุณากรอกเบอร์โทร'
  } else if (!/^[0-9]{9,10}$/.test(values.phone.replace(/[-\s]/g, ''))) {
    errors.phone = 'รูปแบบเบอร์โทรไม่ถูกต้อง'
  }

  return errors
}

export default function LeadCapture() {
  const { values, errors, isSubmitting, isSubmitted, handleChange, handleSubmit, setIsSubmitted } =
    useForm<LeadFormData>({
      initialValues: { email: '', company: '', phone: '' },
      validate: validateLeadForm,
      onSubmit: async (_data) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
      },
    })

  if (isSubmitted) {
    return (
      <section id="signup" className="bg-gradient-to-br from-primary-600 to-primary-800 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <div className="animate-fade-in-up">
            <CheckCircle size={64} className="mx-auto text-green-300" />
            <h2 className="mt-6 text-3xl font-bold text-white">ลงทะเบียนสำเร็จ!</h2>
            <p className="mt-4 text-lg text-primary-100">
              เราจะส่งลิงก์เข้าใช้งานไปที่อีเมลของคุณภายใน 1 นาที
              <br />
              กรุณาตรวจสอบกล่องจดหมายของคุณ
            </p>
            <button
              onClick={() => setIsSubmitted(false)}
              className="mt-8 rounded-xl bg-white px-8 py-3 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-50"
            >
              ลงทะเบียนอีเมลอื่น
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="signup" className="bg-gradient-to-br from-primary-600 to-primary-800 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              พร้อมเพิ่มยอดขาย?
              <br />
              <span className="text-primary-200">เริ่มทดลองฟรีวันนี้</span>
            </h2>
            <p className="mt-4 text-lg text-primary-100">
              ตั้งค่าทีมขายเสร็จใน 5 นาที ไม่ต้องใช้บัตรเครดิต ไม่มีข้อผูกมัด
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'ทดลองฟรี 14 วันเต็มรูปแบบ',
                'ไม่ต้องใช้บัตรเครดิต',
                'ทีม Support ช่วยตั้งค่าให้',
                'Import ข้อมูลจาก Excel ได้ทันที',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-primary-100">
                  <svg className="h-5 w-5 shrink-0 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">ทดลองฟรี 14 วัน</h3>
            <p className="mt-1 text-sm text-gray-500">กรอกข้อมูลเพื่อเริ่มต้นใช้งาน</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={values.email}
                  onChange={handleChange('email')}
                  className={`mt-1 w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                  ชื่อบริษัท <span className="text-red-500">*</span>
                </label>
                <input
                  id="company"
                  type="text"
                  placeholder="บริษัท ABC จำกัด"
                  value={values.company}
                  onChange={handleChange('company')}
                  className={`mt-1 w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.company ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  เบอร์โทร <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="0812345678"
                  value={values.phone}
                  onChange={handleChange('phone')}
                  className={`mt-1 w-full rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                  }`}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    เริ่มทดลองฟรี
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                เมื่อลงทะเบียน คุณยอมรับ{' '}
                <a href="#" className="text-primary-600 underline">เงื่อนไขการใช้งาน</a>
                {' '}และ{' '}
                <a href="#" className="text-primary-600 underline">นโยบายความเป็นส่วนตัว</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
