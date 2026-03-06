import { Users, BarChart3, Mail, LayoutDashboard, UsersRound, Smartphone } from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'Contact Management',
    description:
      'จัดการข้อมูลลูกค้าทั้งหมดในที่เดียว ประวัติการติดต่อ บันทึกย่อ และเอกสารครบถ้วน',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Deal Pipeline',
    description:
      'จัดการ Sales Pipeline แบบ Drag & Drop เห็นทุก Deal ในมุมมองเดียว ติดตามสถานะแบบ Real-time',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: Mail,
    title: 'Email Automation',
    description:
      'ตั้งเวลาส่งอีเมล, SMS, Line ติดตามลูกค้าอัตโนมัติ ไม่พลาดทุก Touchpoint สำคัญ',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: LayoutDashboard,
    title: 'Analytics Dashboard',
    description:
      'รายงานยอดขาย, Conversion Rate, Performance ทีม — อัปเดต Real-time พร้อม Export ได้ทันที',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: UsersRound,
    title: 'Team Collaboration',
    description:
      'แชร์ข้อมูล Lead ภายในทีม มอบหมายงาน ติดตามความคืบหน้า และแชทในบริบทของดีลได้',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile App',
    description:
      'บันทึก Lead ได้ทันทีจากมือถือ สแกนนามบัตร ถ่ายรูปเอกสาร อัปเดตสถานะได้ทุกที่',
    color: 'bg-rose-50 text-rose-600',
  },
]

export default function Features() {
  return (
    <section id="features" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            ฟีเจอร์หลัก
          </span>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            ทุกอย่างที่ทีมขายต้องการ
            <br />
            <span className="text-primary-600">ในที่เดียว</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            ออกแบบมาเพื่อทีมขาย SME โดยเฉพาะ — ใช้ง่าย เห็นผลเร็ว ไม่ต้องเป็น IT ก็เริ่มได้
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className={`animate-fade-in-up animate-delay-${(i + 1) * 100} group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className={`mb-5 inline-flex rounded-xl p-3 ${f.color}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
