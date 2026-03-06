import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SocialProof from '../components/SocialProof'

describe('SocialProof', () => {
  it('renders all stat metrics', () => {
    render(<SocialProof />)
    expect(screen.getByText('500+')).toBeInTheDocument()
    expect(screen.getByText('1M+')).toBeInTheDocument()
    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('99.9%')).toBeInTheDocument()
  })

  it('renders stat labels', () => {
    render(<SocialProof />)
    expect(screen.getByText('บริษัทไว้วางใจ')).toBeInTheDocument()
    expect(screen.getByText('ดีลที่บันทึกแล้ว')).toBeInTheDocument()
    expect(screen.getByText('NPS Score')).toBeInTheDocument()
  })

  it('renders company logos', () => {
    render(<SocialProof />)
    expect(screen.getByText('TechVision')).toBeInTheDocument()
    expect(screen.getByText('GrowthLab')).toBeInTheDocument()
    expect(screen.getByText('DataPrime')).toBeInTheDocument()
  })

  it('renders testimonials section', () => {
    render(<SocialProof />)
    expect(screen.getByText(/ลูกค้าของเรา/)).toBeInTheDocument()
    expect(screen.getByText('สมชาย วิริยะกุล')).toBeInTheDocument()
    expect(screen.getByText('พิมพ์ใจ รักดี')).toBeInTheDocument()
    expect(screen.getByText('ธนกร สุขสวัสดิ์')).toBeInTheDocument()
  })

  it('renders at least 3 testimonials with quotes', () => {
    render(<SocialProof />)
    expect(screen.getByText(/ทีมขาย 20 คนเริ่มใช้ได้ภายในวันเดียว/)).toBeInTheDocument()
    expect(screen.getByText(/เปลี่ยนจาก Spreadsheet มาใช้ SalesPro/)).toBeInTheDocument()
    expect(screen.getByText(/Auto Follow-up ช่วยลดเวลาทำงานซ้ำซ้อน/)).toBeInTheDocument()
  })
})
