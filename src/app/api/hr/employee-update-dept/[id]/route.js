import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/hr/employee-update-dept/[id]
// Body: { department_id: uuid|null }
export async function PATCH(req, { params } = {}) {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const fallbackId = pathParts[pathParts.length - 1] || null
    const { id: paramId } = params || {}
    const id = paramId || fallbackId
    if (!id) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const body = await req.json()
    const departmentId = body?.department_id ?? null
    if (departmentId !== null && typeof departmentId !== 'string') {
      return NextResponse.json({ error: 'department_id must be uuid or null' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ department_id: departmentId })
      .eq('id', id)
      .select('id, department_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


