import { ArrowRight, Play } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-400/5 pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
              เปิดให้ทดลองฟรี 14 วัน
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              CRM ที่ทีมขาย
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                {' '}รัก{' '}
              </span>
              <br />
              เริ่มใช้ได้ใน 5 นาที
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
              จัดการ Pipeline, ติดตาม Lead, และวิเคราะห์ยอดขาย — ทั้งหมดในที่เดียว
              ไม่ต้องฝึกอบรม ไม่ต้องติดตั้ง ใช้ได้ทันทีจากทุกอุปกรณ์
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href="#signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-500/40"
              >
                ทดลองฟรี 14 วัน
                <ArrowRight size={18} />
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                <Play size={18} className="text-primary-600" />
                ดูตัวอย่างการใช้งาน
              </a>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                ไม่ต้องใช้บัตรเครดิต
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                ตั้งค่าใน 5 นาที
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                ยกเลิกได้ทุกเมื่อ
              </span>
            </div>
          </div>

          <div className="animate-fade-in-up animate-delay-200">
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary-400/20 to-accent-400/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-400">SalesPro Dashboard</span>
                </div>
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Pipeline Overview</h3>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">+23% MTD</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Lead ใหม่', value: 48, color: 'bg-blue-500', width: 'w-[60%]' },
                      { label: 'ติดต่อแล้ว', value: 35, color: 'bg-indigo-500', width: 'w-[45%]' },
                      { label: 'เสนอราคา', value: 22, color: 'bg-violet-500', width: 'w-[30%]' },
                      { label: 'ปิดการขาย', value: 15, color: 'bg-green-500', width: 'w-[20%]' },
                    ].map(stage => (
                      <div key={stage.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-gray-600">{stage.label}</span>
                          <span className="font-medium text-gray-900">{stage.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className={`h-2 rounded-full ${stage.color} ${stage.width} transition-all`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      { label: 'ยอดขายเดือนนี้', value: '฿2.4M' },
                      { label: 'อัตราปิดการขาย', value: '31%' },
                      { label: 'Avg Deal Size', value: '฿85K' },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-lg bg-gray-50 p-3 text-center">
                        <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                        <div className="text-[10px] text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
