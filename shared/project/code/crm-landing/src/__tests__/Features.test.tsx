import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Features from '../components/Features'

describe('Features', () => {
  it('renders section heading', () => {
    render(<Features />)
    expect(screen.getByText('ฟีเจอร์หลัก')).toBeInTheDocument()
    expect(screen.getByText(/ทุกอย่างที่ทีมขายต้องการ/)).toBeInTheDocument()
  })

  it('renders all 6 feature cards', () => {
    render(<Features />)
    expect(screen.getByText('Contact Management')).toBeInTheDocument()
    expect(screen.getByText('Deal Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Email Automation')).toBeInTheDocument()
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
  })

  it('renders feature descriptions', () => {
    render(<Features />)
    expect(screen.getByText(/จัดการ Sales Pipeline แบบ Drag & Drop/)).toBeInTheDocument()
    expect(screen.getByText(/บันทึก Lead ได้ทันทีจากมือถือ/)).toBeInTheDocument()
    expect(screen.getByText(/จัดการข้อมูลลูกค้าทั้งหมดในที่เดียว/)).toBeInTheDocument()
  })
})
