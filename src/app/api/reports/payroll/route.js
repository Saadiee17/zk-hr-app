import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/reports/payroll?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&employee_id=UUID(optional)
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const employeeId = url.searchParams.get('employee_id') || null

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
    }

    // Get employees
    let employees = []
    if (employeeId) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_id')
        .eq('id', employeeId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      employees = data || []
    } else {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_id')
        .eq('is_active', true)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      employees = data || []
    }

    const toName = (e) => `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || 'Unknown'
    const toYMD = (d) => new Date(d).toISOString().slice(0, 10)

    // Query daily report per employee and aggregate
    const chunkSize = 8
    const chunks = []
    for (let i = 0; i < employees.length; i += chunkSize) chunks.push(employees.slice(i, i + chunkSize))

    const rows = []
    for (const chunk of chunks) {
      const promises = chunk.map(async (e) => {
        const qs = new URLSearchParams({ employee_id: e.id, start_date: startDate, end_date: endDate })
        const res = await fetch(`${url.origin}/api/reports/daily-work-time?${qs.toString()}`, { cache: 'no-store' })
        const json = await res.json().catch(() => ({ data: [] }))
        if (!res.ok) return
        const daily = json.data || []
        const totalHours = daily.reduce((acc, d) => acc + (Number(d.durationHours) || 0), 0)
        const totalRegular = daily.reduce((acc, d) => acc + (Number(d.regularHours) || 0), 0)
        const totalOvertime = daily.reduce((acc, d) => acc + (Number(d.overtimeHours) || 0), 0)
        const daysWorked = daily.filter((d) => d.status && d.status !== 'Absent').length
        rows.push({
          employee_id: e.id,
          employee_name: toName(e),
          total_days_worked: daysWorked,
          total_regular_hours: Math.round(totalRegular * 100) / 100,
          total_overtime_hours: Math.round(totalOvertime * 100) / 100,
          total_hours_worked: Math.round(totalHours * 100) / 100,
        })
      })
      await Promise.all(promises)
    }

    // Sort by employee_name for consistency
    rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


