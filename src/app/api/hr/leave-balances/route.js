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

    // If employee_id is specified, merge existing balances with defaults for missing leave types
    if (employeeId) {
      // Fetch all active leave types
      const { data: leaveTypes, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name, code, max_days_per_year')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (!typesError && leaveTypes && leaveTypes.length > 0) {
        // Get existing balance leave type IDs
        const existingLeaveTypeIds = new Set((data || []).map(b => b.leave_type_id))
        
        // Create default balance entries for leave types that don't have balances
        const defaultBalances = leaveTypes
          .filter(lt => !existingLeaveTypeIds.has(lt.id))
          .map(lt => ({
            id: null, // No actual record yet
            employee_id: employeeId,
            leave_type_id: lt.id,
            total_allotted: lt.max_days_per_year || 0,
            used: 0,
            pending: 0,
            remaining: lt.max_days_per_year || 0,
            year: parseInt(year),
            leave_type: {
              id: lt.id,
              name: lt.name,
              code: lt.code
            }
          }))

        // Merge existing balances with defaults
        const allBalances = [...(data || []), ...defaultBalances]
        return NextResponse.json({ success: true, data: allBalances })
      }
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



