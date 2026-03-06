export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a href="#" className="flex items-center gap-2 text-lg font-bold text-primary-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-xs font-bold text-white">
                SP
              </span>
              SalesPro
            </a>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              CRM ที่ทีมขายรัก — เริ่มใช้ได้ใน 5 นาที ไม่ต้องฝึกอบรม
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">ผลิตภัณฑ์</h4>
            <ul className="mt-4 space-y-3">
              {['Pipeline Management', 'Auto Follow-up', 'Analytics', 'Mobile App', 'API'].map(item => (
                <li key={item}>
                  <a href="#features" className="text-sm text-gray-500 hover:text-primary-600">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">บริษัท</h4>
            <ul className="mt-4 space-y-3">
              {['เกี่ยวกับเรา', 'บล็อก', 'ร่วมงาน', 'ติดต่อเรา'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-primary-600">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900">สนับสนุน</h4>
            <ul className="mt-4 space-y-3">
              {['Help Center', 'เงื่อนไขการใช้งาน', 'นโยบายความเป็นส่วนตัว', 'Status Page'].map(item => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-500 hover:text-primary-600">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} SalesPro CRM. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
