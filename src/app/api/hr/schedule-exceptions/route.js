import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/schedule-exceptions?employee_id=UUID - Fetch all exceptions for an employee
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const employee_id = url.searchParams.get('employee_id')
    if (!employee_id) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('schedule_exceptions')
      .select('date, start_time, end_time, is_day_off, is_half_day')
      .eq('employee_id', employee_id)

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/hr/schedule-exceptions - Create or Update an exception
export async function POST(req) {
  try {
    const { employee_id, date, start_time, end_time, is_day_off, is_half_day } = await req.json()

    if (!employee_id || !date) {
      return NextResponse.json({ error: 'employee_id and date are required' }, { status: 400 })
    }

    const record = {
      employee_id,
      date,
      start_time: start_time || null,
      end_time: end_time || null,
      is_day_off: is_day_off || false,
      is_half_day: is_half_day || false,
    }

    // Upsert ensures that if an exception for that day already exists, it's updated.
    // If not, a new one is created.
    const { data, error } = await supabase
      .from('schedule_exceptions')
      .upsert(record, { onConflict: 'employee_id, date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/hr/schedule-exceptions - Delete an exception
export async function DELETE(req) {
    try {
        const { employee_id, date } = await req.json()

        if (!employee_id || !date) {
            return NextResponse.json({ error: 'employee_id and date are required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('schedule_exceptions')
            .delete()
            .eq('employee_id', employee_id)
            .eq('date', date)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
