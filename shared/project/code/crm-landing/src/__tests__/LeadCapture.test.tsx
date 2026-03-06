import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LeadCapture from '../components/LeadCapture'

describe('LeadCapture', () => {
  it('renders the sign-up form', () => {
    render(<LeadCapture />)
    expect(screen.getByLabelText(/อีเมล/)).toBeInTheDocument()
    expect(screen.getByLabelText(/ชื่อบริษัท/)).toBeInTheDocument()
    expect(screen.getByLabelText(/เบอร์โทร/)).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    render(<LeadCapture />)
    expect(screen.getByRole('button', { name: /เริ่มทดลองฟรี/ })).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    render(<LeadCapture />)

    fireEvent.click(screen.getByRole('button', { name: /เริ่มทดลองฟรี/ }))

    await waitFor(() => {
      expect(screen.getByText('กรุณากรอกอีเมล')).toBeInTheDocument()
      expect(screen.getByText('กรุณากรอกชื่อบริษัท')).toBeInTheDocument()
      expect(screen.getByText('กรุณากรอกเบอร์โทร')).toBeInTheDocument()
    })
  })

  it('shows email format error for invalid email', async () => {
    render(<LeadCapture />)

    fireEvent.change(screen.getByLabelText(/อีเมล/), { target: { value: 'invalid' } })
    fireEvent.change(screen.getByLabelText(/ชื่อบริษัท/), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText(/เบอร์โทร/), { target: { value: '0812345678' } })
    fireEvent.click(screen.getByRole('button', { name: /เริ่มทดลองฟรี/ }))

    await waitFor(() => {
      expect(screen.getByText('รูปแบบอีเมลไม่ถูกต้อง')).toBeInTheDocument()
    })
  })

  it('shows success state after valid submission', async () => {
    render(<LeadCapture />)

    fireEvent.change(screen.getByLabelText(/อีเมล/), { target: { value: 'test@company.com' } })
    fireEvent.change(screen.getByLabelText(/ชื่อบริษัท/), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText(/เบอร์โทร/), { target: { value: '0812345678' } })
    fireEvent.click(screen.getByRole('button', { name: /เริ่มทดลองฟรี/ }))

    await waitFor(() => {
      expect(screen.getByText('ลงทะเบียนสำเร็จ!')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('clears error when user types in errored field', async () => {
    render(<LeadCapture />)

    fireEvent.click(screen.getByRole('button', { name: /เริ่มทดลองฟรี/ }))

    await waitFor(() => {
      expect(screen.getByText('กรุณากรอกอีเมล')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/อีเมล/), { target: { value: 'a@b.com' } })

    await waitFor(() => {
      expect(screen.queryByText('กรุณากรอกอีเมล')).not.toBeInTheDocument()
    })
  })
})
