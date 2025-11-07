import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/schedules/[department_id] - fetch schedule for department
export async function GET(req, { params }) {
  try {
    const resolvedParams = await params
    const departmentId = resolvedParams?.department_id
    if (!departmentId) return NextResponse.json({ error: 'Missing department_id' }, { status: 400 })

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('department_id', departmentId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data: data || null })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/hr/schedules/[department_id] - set tz slots for department
// Body: { tz_id_1?: number|null, tz_id_2?: number|null, tz_id_3?: number|null }
export async function PATCH(req, { params }) {
  try {
    const resolvedParams = await params
    const departmentId = resolvedParams?.department_id
    if (!departmentId) return NextResponse.json({ error: 'Missing department_id' }, { status: 400 })

    const body = await req.json()
    const parseTz = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
    const tz1 = parseTz(body?.tz_id_1)
    const tz2 = parseTz(body?.tz_id_2)
    const tz3 = parseTz(body?.tz_id_3)
    for (const tz of [tz1, tz2, tz3]) {
      if (tz !== null && (!Number.isFinite(tz) || tz < 1 || tz > 50)) {
        return NextResponse.json({ error: 'tz ids must be integers between 1 and 50 or null' }, { status: 400 })
      }
    }

    // Try update first
    const { data: updated, error: updErr } = await supabase
      .from('schedules')
      .update({ tz_id_1: tz1, tz_id_2: tz2, tz_id_3: tz3 })
      .eq('department_id', departmentId)
      .select('*')
      .maybeSingle()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    if (updated) {
      return NextResponse.json({ success: true, data: updated })
    }

    // Insert if not exists
    const { data: inserted, error: insErr } = await supabase
      .from('schedules')
      .insert({ department_id: departmentId, tz_id_1: tz1, tz_id_2: tz2, tz_id_3: tz3 })
      .select('*')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
    return NextResponse.json({ success: true, data: inserted })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



