const LOGOS = [
  'TechVision', 'GrowthLab', 'SkyNet Solutions', 'DataPrime',
  'CloudFirst', 'NextGen Corp', 'InnoTech', 'SmartBiz',
]

const TESTIMONIALS = [
  {
    name: 'สมชาย วิริยะกุล',
    role: 'Sales Manager',
    company: 'TechVision Co., Ltd.',
    quote: 'ทีมขาย 20 คนเริ่มใช้ได้ภายในวันเดียว ไม่ต้องฝึกอบรมเลย ยอดขายเพิ่มขึ้น 35% ใน 3 เดือนแรก',
    avatar: 'SC',
  },
  {
    name: 'พิมพ์ใจ รักดี',
    role: 'CEO',
    company: 'GrowthLab',
    quote: 'เปลี่ยนจาก Spreadsheet มาใช้ SalesPro — เห็น Pipeline ชัดเจน ตัดสินใจได้เร็วขึ้น 10 เท่า',
    avatar: 'PJ',
  },
  {
    name: 'ธนกร สุขสวัสดิ์',
    role: 'Head of Sales',
    company: 'DataPrime',
    quote: 'Auto Follow-up ช่วยลดเวลาทำงานซ้ำซ้อน ทีมโฟกัสกับ Lead ที่มีโอกาสปิดสูงได้เต็มที่',
    avatar: 'TK',
  },
]

const STATS = [
  { value: '500+', label: 'บริษัทไว้วางใจ' },
  { value: '1M+', label: 'ดีลที่บันทึกแล้ว' },
  { value: '72', label: 'NPS Score' },
  { value: '99.9%', label: 'Uptime' },
]

export default function SocialProof() {
  return (
    <section id="testimonials" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold text-primary-600 sm:text-4xl">{stat.value}</div>
              <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale">
          {LOGOS.map(logo => (
            <div
              key={logo}
              className="flex h-10 items-center justify-center rounded-md bg-gray-100 px-6 text-sm font-semibold text-gray-500"
            >
              {logo}
            </div>
          ))}
        </div>

        <div className="mt-20">
          <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">
            ลูกค้าของเรา<span className="text-primary-600">พูดอะไร</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            ดูว่าทีมขายทั่วประเทศใช้ SalesPro เพิ่มยอดขายได้อย่างไร
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <div
                key={t.name}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}, {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
