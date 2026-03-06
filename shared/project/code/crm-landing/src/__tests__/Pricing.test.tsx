import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Pricing from '../components/Pricing'

describe('Pricing', () => {
  it('renders all 3 pricing plans', () => {
    render(<Pricing />)
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
  })

  it('highlights Pro plan as most popular', () => {
    render(<Pricing />)
    expect(screen.getByText('ยอดนิยม')).toBeInTheDocument()
  })

  it('shows Free plan with ฿0 price', () => {
    render(<Pricing />)
    expect(screen.getByText('฿0')).toBeInTheDocument()
    expect(screen.getByText('/ ตลอดไป')).toBeInTheDocument()
  })

  it('shows Pro monthly price by default', () => {
    render(<Pricing />)
    expect(screen.getByText(/990/)).toBeInTheDocument()
  })

  it('shows Enterprise with custom pricing', () => {
    render(<Pricing />)
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('/ ติดต่อเรา')).toBeInTheDocument()
  })

  it('toggles to yearly pricing with 20% discount', () => {
    render(<Pricing />)
    const toggle = screen.getByRole('switch', { name: /toggle yearly pricing/i })
    fireEvent.click(toggle)

    expect(screen.getByText('ประหยัด 20%')).toBeInTheDocument()
    expect(screen.getByText(/792/)).toBeInTheDocument()
  })

  it('renders CTA buttons per plan', () => {
    render(<Pricing />)
    expect(screen.getByText('เริ่มใช้ฟรี')).toBeInTheDocument()
    expect(screen.getByText('ทดลองฟรี 14 วัน')).toBeInTheDocument()
    expect(screen.getByText('ติดต่อฝ่ายขาย')).toBeInTheDocument()
  })
})
