import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function resolveId(req, params) {
  const id = params?.id
  if (!id || typeof id !== 'string') {
    try {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const idx = pathParts.indexOf('leave-requests')
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

// GET /api/hr/leave-requests/[id] - Get single leave request
export async function GET(req, { params } = {}) {
  try {
    const id = resolveId(req, params)
    if (!id) {
      return NextResponse.json({ error: 'Missing leave request id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leave_requests')
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
        ),
        approved_by_employee:approved_by (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/hr/leave-requests/[id] - Update request (approve/reject/cancel)
export async function PATCH(req, { params } = {}) {
  try {
    const id = resolveId(req, params)
    if (!id) {
      return NextResponse.json({ error: 'Missing leave request id' }, { status: 400 })
    }

    const body = await req.json()
    const status = body?.status
    const approvedBy = body?.approved_by || null
    const rejectionReason = body?.rejection_reason || null

    if (!status || !['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: pending, approved, rejected, cancelled' },
        { status: 400 }
      )
    }

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const oldStatus = currentRequest.status
    const updates = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'approved') {
      updates.approved_by = approvedBy
      updates.approved_at = new Date().toISOString()
      updates.rejection_reason = null
    } else if (status === 'rejected') {
      updates.rejection_reason = rejectionReason
      updates.approved_by = approvedBy
      updates.approved_at = null
    } else if (status === 'cancelled') {
      updates.rejection_reason = null
      updates.approved_by = null
      updates.approved_at = null
    }

    // Update the request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update(updates)
      .eq('id', id)
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
        ),
        approved_by_employee:approved_by (
          id,
          first_name,
          last_name
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Update leave balances if status changed
    if (oldStatus !== status) {
      const currentYear = new Date().getFullYear()
      const { data: balance, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', currentRequest.employee_id)
        .eq('leave_type_id', currentRequest.leave_type_id)
        .eq('year', currentYear)
        .single()

      if (!balanceError && balance) {
        let newPending = balance.pending || 0
        let newUsed = balance.used || 0

        // Remove from pending if was pending
        if (oldStatus === 'pending') {
          newPending = Math.max(0, newPending - currentRequest.total_days)
        }

        // Add to used if approved
        if (status === 'approved') {
          newUsed = (newUsed || 0) + currentRequest.total_days
        }

        // If was approved and now rejected/cancelled, remove from used
        if (oldStatus === 'approved' && (status === 'rejected' || status === 'cancelled')) {
          newUsed = Math.max(0, newUsed - currentRequest.total_days)
        }

        // If was pending and now cancelled/rejected, it's already removed from pending above
        if (oldStatus === 'pending' && (status === 'rejected' || status === 'cancelled')) {
          // Already handled above
        }

        await supabase
          .from('leave_balances')
          .update({
            pending: newPending,
            used: newUsed,
          })
          .eq('id', balance.id)
      }
    }

    return NextResponse.json({ success: true, data: updatedRequest })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// DELETE /api/hr/leave-requests/[id] - Delete request (only if pending)
export async function DELETE(req, { params } = {}) {
  try {
    const id = resolveId(req, params)
    if (!id) {
      return NextResponse.json({ error: 'Missing leave request id' }, { status: 400 })
    }

    // Fetch current request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (currentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be deleted' },
        { status: 400 }
      )
    }

    // Update pending balance before deleting
    const currentYear = new Date().getFullYear()
    const { data: balance, error: balanceError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', currentRequest.employee_id)
      .eq('leave_type_id', currentRequest.leave_type_id)
      .eq('year', currentYear)
      .single()

    if (!balanceError && balance) {
      await supabase
        .from('leave_balances')
        .update({
          pending: Math.max(0, (balance.pending || 0) - currentRequest.total_days),
        })
        .eq('id', balance.id)
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Leave request deleted' })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



