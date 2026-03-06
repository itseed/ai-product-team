import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hero from '../components/Hero'

describe('Hero', () => {
  it('renders the main headline', () => {
    render(<Hero />)
    expect(screen.getByText(/CRM ที่ทีมขาย/)).toBeInTheDocument()
    expect(screen.getByText(/เริ่มใช้ได้ใน 5 นาที/)).toBeInTheDocument()
  })

  it('renders the primary CTA button', () => {
    render(<Hero />)
    expect(screen.getByText('ทดลองฟรี 14 วัน')).toBeInTheDocument()
  })

  it('renders the demo link', () => {
    render(<Hero />)
    expect(screen.getByText('ดูตัวอย่างการใช้งาน')).toBeInTheDocument()
  })

  it('renders trust badges', () => {
    render(<Hero />)
    expect(screen.getByText('ไม่ต้องใช้บัตรเครดิต')).toBeInTheDocument()
    expect(screen.getByText('ตั้งค่าใน 5 นาที')).toBeInTheDocument()
    expect(screen.getByText('ยกเลิกได้ทุกเมื่อ')).toBeInTheDocument()
  })

  it('renders the product screenshot mockup', () => {
    render(<Hero />)
    expect(screen.getByText('Pipeline Overview')).toBeInTheDocument()
    expect(screen.getByText('Lead ใหม่')).toBeInTheDocument()
  })
})
