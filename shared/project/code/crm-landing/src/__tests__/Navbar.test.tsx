import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Navbar from '../components/Navbar'

describe('Navbar', () => {
  it('renders the brand name', () => {
    render(<Navbar />)
    expect(screen.getByText('SalesPro')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Navbar />)
    expect(screen.getAllByText('ฟีเจอร์').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('ราคา').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the CTA button', () => {
    render(<Navbar />)
    expect(screen.getAllByText('ทดลองฟรี').length).toBeGreaterThanOrEqual(1)
  })

  it('toggles mobile menu on button click', () => {
    render(<Navbar />)
    const toggleBtn = screen.getByLabelText('Toggle menu')
    fireEvent.click(toggleBtn)
    const mobileLinks = screen.getAllByText('ฟีเจอร์')
    expect(mobileLinks.length).toBeGreaterThanOrEqual(2)
  })
})
