import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'ทดลองฟรีต้องใช้บัตรเครดิตไหม?',
    a: 'ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วันโดยไม่ต้องกรอกข้อมูลบัตรเครดิตใดๆ เมื่อหมดช่วงทดลอง ระบบจะหยุดให้บริการอัตโนมัติ ไม่มีค่าใช้จ่ายแอบแฝง',
  },
  {
    q: 'Import ข้อมูลจากระบบเดิมได้ไหม?',
    a: 'ได้ครับ SalesPro รองรับการ Import ข้อมูลจาก Excel, CSV, Google Sheets และ CRM อื่นๆ เช่น Salesforce, HubSpot ทีม Support จะช่วยดูแลการ Migrate ข้อมูลให้ฟรี',
  },
  {
    q: 'รองรับการใช้งานบนมือถือไหม?',
    a: 'รองรับครับ มีทั้ง iOS และ Android App สามารถบันทึก Lead, อัปเดต Deal, ดูรายงาน และรับ Notification ได้แบบ Real-time ทุกที่ทุกเวลา',
  },
  {
    q: 'สามารถเปลี่ยนแพลนหรือยกเลิกได้ไหม?',
    a: 'ได้ครับ สามารถอัปเกรดหรือดาวน์เกรดแพลนได้ทุกเมื่อ ระบบจะคำนวณค่าใช้จ่ายแบบ Pro-rata และสามารถยกเลิกได้ทันทีโดยไม่มีค่าปรับ',
  },
  {
    q: 'ข้อมูลปลอดภัยไหม?',
    a: 'ปลอดภัยครับ เราใช้ AWS Infrastructure ที่ได้รับมาตรฐาน SOC 2, ISO 27001 ข้อมูลถูกเข้ารหัสทั้ง At-rest และ In-transit มีการ Backup อัตโนมัติทุก 6 ชั่วโมง',
  },
  {
    q: 'มี API สำหรับเชื่อมต่อระบบอื่นไหม?',
    a: 'มีครับ เรามี RESTful API และ Webhook สำหรับเชื่อมต่อกับระบบ ERP, Accounting, Marketing Automation หรือระบบภายในของคุณ พร้อม Documentation ครบถ้วน',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary-600">
            FAQ
          </span>
          <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
            คำถามที่พบบ่อย
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="border-t border-gray-100 px-6 pb-5 pt-3">
                  <p className="text-sm leading-relaxed text-gray-600">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
