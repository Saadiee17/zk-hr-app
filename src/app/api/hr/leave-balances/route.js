import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

// GET /api/hr/leave-balances - Fetch leave balances with optional filters
export async function GET(req) {
  try {
    const session = await getSession(req)
    const { searchParams } = new URL(req.url)
    let employeeId = searchParams.get('employee_id')
    const leaveTypeId = searchParams.get('leave_type_id')
    const year = searchParams.get('year') || new Date().getFullYear()

    // Session-based access control: Non-admins can only see their own balances
    if (session && !isAdmin(session)) {
      employeeId = session.employeeId
    }

    let query = supabase
      .from('leave_balances')
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
      .eq('year', year)
      .order('created_at', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    if (leaveTypeId) {
      query = query.eq('leave_type_id', leaveTypeId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



