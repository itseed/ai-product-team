import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HowItWorks from '../components/HowItWorks'

describe('HowItWorks', () => {
  it('renders section heading', () => {
    render(<HowItWorks />)
    expect(screen.getByText('วิธีใช้งาน')).toBeInTheDocument()
    expect(screen.getByText(/เริ่มต้นง่ายๆ/)).toBeInTheDocument()
    expect(screen.getByText(/แค่ 3 ขั้นตอน/)).toBeInTheDocument()
  })

  it('renders all 3 steps', () => {
    render(<HowItWorks />)
    expect(screen.getByText('สมัครฟรี')).toBeInTheDocument()
    expect(screen.getByText('Import ข้อมูล')).toBeInTheDocument()
    expect(screen.getByText('เพิ่มยอดขาย')).toBeInTheDocument()
  })

  it('renders step numbers', () => {
    render(<HowItWorks />)
    expect(screen.getByText(/ขั้นตอนที่ 01/)).toBeInTheDocument()
    expect(screen.getByText(/ขั้นตอนที่ 02/)).toBeInTheDocument()
    expect(screen.getByText(/ขั้นตอนที่ 03/)).toBeInTheDocument()
  })

  it('renders step descriptions', () => {
    render(<HowItWorks />)
    expect(screen.getByText(/สร้างบัญชีภายใน 30 วินาที/)).toBeInTheDocument()
    expect(screen.getByText(/นำเข้า Lead จาก Excel/)).toBeInTheDocument()
    expect(screen.getByText(/ติดตาม Pipeline/)).toBeInTheDocument()
  })
})
