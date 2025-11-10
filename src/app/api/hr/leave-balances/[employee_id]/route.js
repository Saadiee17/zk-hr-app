import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function resolveEmployeeId(req, params) {
  if (!params) return null
  const resolvedParams = await params
  const id = resolvedParams?.employee_id
  if (!id || typeof id !== 'string') {
    try {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const idx = pathParts.indexOf('leave-balances')
      if (idx >= 0 && idx < pathParts.length - 1) {
        return pathParts[idx + 1]
      }
    } catch {
      return null
    }
    return null
  }
  return id
}

// PATCH /api/hr/leave-balances/[employee_id] - Update leave balance for an employee
export async function PATCH(req, { params } = {}) {
  try {
    const employeeId = await resolveEmployeeId(req, params)
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee_id' }, { status: 400 })
    }

    const body = await req.json()
    const leaveTypeId = body?.leave_type_id
    const totalAllotted = body?.total_allotted
    const year = body?.year || new Date().getFullYear()

    if (!leaveTypeId) {
      return NextResponse.json({ error: 'leave_type_id is required' }, { status: 400 })
    }

    if (totalAllotted === undefined || totalAllotted === null) {
      return NextResponse.json({ error: 'total_allotted is required' }, { status: 400 })
    }

    const allotted = Number(totalAllotted)
    if (!Number.isFinite(allotted) || allotted < 0) {
      return NextResponse.json(
        { error: 'total_allotted must be a non-negative number' },
        { status: 400 }
      )
    }

    // Check if balance record exists
    const { data: existingBalance, error: fetchError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let result
    if (existingBalance) {
      // Update existing balance
      const { data, error } = await supabase
        .from('leave_balances')
        .update({
          total_allotted: allotted,
        })
        .eq('id', existingBalance.id)
        .select(`
          *,
          employee:employee_id (
            id,
            first_name,
            last_name,
            employee_id
          ),
          leave_type:leave_type_id (
            id,
            name,
            code
          )
        `)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      result = data
    } else {
      // Create new balance record
      const { data, error } = await supabase
        .from('leave_balances')
        .insert({
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          year,
          total_allotted: allotted,
          used: 0,
          pending: 0,
        })
        .select(`
          *,
          employee:employee_id (
            id,
            first_name,
            last_name,
            employee_id
          ),
          leave_type:leave_type_id (
            id,
            name,
            code
          )
        `)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      result = data
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



