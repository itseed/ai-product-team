import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'ฟีเจอร์', href: '#features' },
  { label: 'ราคา', href: '#pricing' },
  { label: 'รีวิว', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-2 text-xl font-bold text-primary-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
            SP
          </span>
          SalesPro
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#signup"
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md"
          >
            ทดลองฟรี
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="text-gray-600 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-sm font-medium text-gray-600"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#signup"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-lg bg-primary-600 px-5 py-2.5 text-center text-sm font-semibold text-white"
          >
            ทดลองฟรี
          </a>
        </div>
      )}
    </nav>
  )
}
