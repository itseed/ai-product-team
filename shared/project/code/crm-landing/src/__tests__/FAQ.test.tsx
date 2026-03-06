import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FAQ from '../components/FAQ'

describe('FAQ', () => {
  it('renders section heading', () => {
    render(<FAQ />)
    expect(screen.getByText('คำถามที่พบบ่อย')).toBeInTheDocument()
  })

  it('renders all FAQ questions', () => {
    render(<FAQ />)
    expect(screen.getByText('ทดลองฟรีต้องใช้บัตรเครดิตไหม?')).toBeInTheDocument()
    expect(screen.getByText('Import ข้อมูลจากระบบเดิมได้ไหม?')).toBeInTheDocument()
    expect(screen.getByText('รองรับการใช้งานบนมือถือไหม?')).toBeInTheDocument()
    expect(screen.getByText('สามารถเปลี่ยนแพลนหรือยกเลิกได้ไหม?')).toBeInTheDocument()
    expect(screen.getByText('ข้อมูลปลอดภัยไหม?')).toBeInTheDocument()
    expect(screen.getByText('มี API สำหรับเชื่อมต่อระบบอื่นไหม?')).toBeInTheDocument()
  })

  it('does not show answers by default', () => {
    render(<FAQ />)
    expect(screen.queryByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).not.toBeInTheDocument()
  })

  it('expands answer when question is clicked', () => {
    render(<FAQ />)
    fireEvent.click(screen.getByText('ทดลองฟรีต้องใช้บัตรเครดิตไหม?'))
    expect(screen.getByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).toBeInTheDocument()
  })

  it('collapses answer when same question is clicked again', () => {
    render(<FAQ />)
    const question = screen.getByText('ทดลองฟรีต้องใช้บัตรเครดิตไหม?')
    fireEvent.click(question)
    expect(screen.getByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).toBeInTheDocument()
    fireEvent.click(question)
    expect(screen.queryByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).not.toBeInTheDocument()
  })

  it('closes previous answer when a different question is opened', () => {
    render(<FAQ />)
    fireEvent.click(screen.getByText('ทดลองฟรีต้องใช้บัตรเครดิตไหม?'))
    expect(screen.getByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Import ข้อมูลจากระบบเดิมได้ไหม?'))
    expect(screen.queryByText(/ไม่ต้องครับ ทดลองใช้ได้เต็ม 14 วัน/)).not.toBeInTheDocument()
    expect(screen.getByText(/ได้ครับ SalesPro รองรับการ Import/)).toBeInTheDocument()
  })
})
