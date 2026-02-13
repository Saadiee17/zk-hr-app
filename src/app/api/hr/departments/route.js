import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/departments - Fetch all departments (service role, bypasses RLS)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        schedules:schedules(
          tz_id_1, tz_id_2, tz_id_3,
          tz1:time_zones!schedules_tz_id_1_fkey(name),
          tz2:time_zones!schedules_tz_id_2_fkey(name),
          tz3:time_zones!schedules_tz_id_3_fkey(name)
        )
      `)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/hr/departments - Create a new department (service role, bypasses RLS)
export async function POST(req) {
  try {
    const body = await req.json()
    const name = (body?.name || '').trim()
    const codeRaw = body?.department_code

    const code = typeof codeRaw === 'number' ? codeRaw : Number(codeRaw)
    if (!name || !Number.isFinite(code)) {
      return NextResponse.json(
        { error: 'name (text) and department_code (number) are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({ name, department_code: code })
      .select()
      .single()

    if (error) {
      const isUniqueViolation = error.code === '23505' || /duplicate key value/.test(error.message || '')
      const message = /name/.test(error.message || '')
        ? 'Department name must be unique'
        : /department_code/.test(error.message || '')
          ? 'Department code must be unique'
          : error.message
      return NextResponse.json({ error: message }, { status: isUniqueViolation ? 409 : 400 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


