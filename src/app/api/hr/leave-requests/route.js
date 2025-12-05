import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

// GET /api/hr/leave-requests?employee_id=UUID (optional) - Fetch leave requests, optionally filtered by employee
export async function GET(req) {
  try {
    const session = await getSession(req)
    const url = new URL(req.url)
    let employee_id = url.searchParams.get('employee_id')
    const status = url.searchParams.get('status')

    // Session-based access control: Non-admins can only see their own requests
    if (session && !isAdmin(session)) {
      employee_id = session.employeeId
    }

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (
          id,
          name,
          code
        ),
        employee:employees!leave_requests_employee_id_fkey (
          id,
          first_name,
          last_name,
          employee_id
        )
      `)
      .order('start_date', { ascending: false })

    // Filter by employee_id if provided or enforced by session
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/hr/leave-requests - Create a new leave request
export async function POST(req) {
  try {
    const session = await getSession(req)
    const body = await req.json()
    let { employee_id, leave_type, leave_type_id, start_date, end_date, reason, status } = body

    // Session-based access control: Non-admins can only create requests for themselves
    if (session && !isAdmin(session)) {
      employee_id = session.employeeId
    }

    console.log('[leave-requests] POST request body:', body)
    console.log('[leave-requests] Final employee_id:', employee_id)

    if (!employee_id || !start_date || !end_date) {
      return NextResponse.json({
        error: 'employee_id, start_date, and end_date are required',
        received: { employee_id, start_date, end_date }
      }, { status: 400 })
    }

    if (!leave_type_id && !leave_type) {
      return NextResponse.json({
        error: 'Either leave_type_id or leave_type is required',
        received: { leave_type_id, leave_type }
      }, { status: 400 })
    }

    let finalLeaveTypeId = leave_type_id

    // If leave_type_id is not provided, convert leave_type string to leave_type_id
    if (!finalLeaveTypeId && leave_type) {
      // Map frontend leave_type values to database codes
      const leaveTypeCodeMap = {
        'casual_leave': 'CL',
        'sick_leave': 'SL',
        'annual_leave': 'AL',
        'early_off': 'EO',
        'late_in': 'LI',
      }

      const leaveTypeCode = leaveTypeCodeMap[leave_type] || leave_type.toUpperCase()

      // Look up leave_type_id from leave_types table
      const { data: leaveTypeData, error: leaveTypeError } = await supabase
        .from('leave_types')
        .select('id')
        .eq('code', leaveTypeCode)
        .eq('is_active', true)
        .maybeSingle()

      if (leaveTypeError) {
        console.error('[leave-requests] Error fetching leave type:', leaveTypeError)
        throw leaveTypeError
      }

      if (!leaveTypeData) {
        return NextResponse.json({
          error: `Leave type '${leave_type}' (code: ${leaveTypeCode}) not found in database`,
          hint: 'Available leave types may need to be created first'
        }, { status: 400 })
      }

      finalLeaveTypeId = leaveTypeData.id
    }

    // Calculate total_days (inclusive of both start and end dates)
    const start = new Date(start_date)
    const end = new Date(end_date)
    const diffTime = Math.abs(end - start)
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    const record = {
      employee_id,
      leave_type_id: finalLeaveTypeId,
      start_date,
      end_date,
      total_days: totalDays,
      reason: reason || null,
      status: status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('[leave-requests] Inserting record:', record)

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('[leave-requests] Supabase error:', error)
      throw error
    }

    // Update leave balance - add to pending if status is pending
    if (data.status === 'pending') {
      const currentYear = new Date().getFullYear()

      // Check if balance exists
      const { data: existingBalance, error: balanceCheckError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('leave_type_id', finalLeaveTypeId)
        .eq('year', currentYear)
        .maybeSingle()

      if (balanceCheckError && balanceCheckError.code !== 'PGRST116') {
        console.error('[leave-requests] Error checking balance:', balanceCheckError)
      } else if (existingBalance) {
        // Update existing balance - add to pending
        const newPending = (existingBalance.pending || 0) + totalDays
        await supabase
          .from('leave_balances')
          .update({ pending: newPending })
          .eq('id', existingBalance.id)
      } else {
        // Create new balance record with pending days
        // First, get default total_allotted from leave type
        const { data: leaveType } = await supabase
          .from('leave_types')
          .select('max_days_per_year')
          .eq('id', finalLeaveTypeId)
          .single()

        const totalAllotted = leaveType?.max_days_per_year || 0

        await supabase
          .from('leave_balances')
          .insert({
            employee_id,
            leave_type_id: finalLeaveTypeId,
            year: currentYear,
            total_allotted: totalAllotted,
            used: 0,
            pending: totalDays,
          })
      }
    }

    console.log('[leave-requests] Successfully created:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[leave-requests] POST error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create leave request',
      details: error.details || error.hint || null
    }, { status: 500 })
  }
}

// PATCH /api/hr/leave-requests - Update leave request status
export async function PATCH(req) {
  try {
    const { id, status } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
