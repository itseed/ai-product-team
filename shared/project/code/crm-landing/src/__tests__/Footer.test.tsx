import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '../components/Footer'

describe('Footer', () => {
  it('renders the brand name', () => {
    render(<Footer />)
    expect(screen.getByText('SalesPro')).toBeInTheDocument()
  })

  it('renders product links', () => {
    render(<Footer />)
    expect(screen.getByText('Pipeline Management')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Mobile App')).toBeInTheDocument()
  })

  it('renders company links', () => {
    render(<Footer />)
    expect(screen.getByText('เกี่ยวกับเรา')).toBeInTheDocument()
    expect(screen.getByText('บล็อก')).toBeInTheDocument()
    expect(screen.getByText('ติดต่อเรา')).toBeInTheDocument()
  })

  it('renders support links', () => {
    render(<Footer />)
    expect(screen.getByText('Help Center')).toBeInTheDocument()
    expect(screen.getByText('นโยบายความเป็นส่วนตัว')).toBeInTheDocument()
  })

  it('renders copyright with current year', () => {
    render(<Footer />)
    const year = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument()
  })
})
