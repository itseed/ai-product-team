import { UserPlus, Upload, TrendingUp } from 'lucide-react'

const STEPS = [
  {
    icon: UserPlus,
    step: '01',
    title: 'สมัครฟรี',
    description: 'สร้างบัญชีภายใน 30 วินาที ไม่ต้องใช้บัตรเครดิต เริ่มทดลองได้ทันที',
  },
  {
    icon: Upload,
    step: '02',
    title: 'Import ข้อมูล',
    description: 'นำเข้า Lead จาก Excel, CSV หรือ CRM เดิม ทีม Support ช่วยตั้งค่าให้ฟรี',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'เพิ่มยอดขาย',
    description: 'ติดตาม Pipeline, Automate Follow-up และวิเคราะห์ผลลัพธ์ — ทั้งหมดในที่เดียว',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            วิธีใช้งาน
          </span>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            เริ่มต้นง่ายๆ <span className="text-primary-600">แค่ 3 ขั้นตอน</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            ไม่ต้องติดตั้ง ไม่ต้องฝึกอบรม เริ่มใช้งานจริงได้ภายใน 5 นาที
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.step} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-12 left-[calc(50%+3rem)] hidden h-0.5 w-[calc(100%-6rem)] bg-gradient-to-r from-primary-300 to-primary-100 md:block" />
                )}
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-50">
                  <Icon size={36} className="text-primary-600" />
                </div>
                <span className="mt-4 inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700">
                  ขั้นตอนที่ {s.step}
                </span>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
