import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

/**
 * GET /api/employee/profile
 * Get current employee's full profile
 */
export async function GET(req) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch employee with department and schedule info
    const { data: employee, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:department_id (
          id,
          name
        )
      `)
      .eq('id', session.employeeId)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get schedule name
    let scheduleName = 'Not Assigned'
    if (employee.individual_tz_1) {
      const { data: tz } = await supabase
        .from('time_zones')
        .select('name')
        .eq('id', employee.individual_tz_1)
        .single()
      if (tz) scheduleName = tz.name
    } else if (employee.department_id) {
      const { data: schedules } = await supabase
        .from('schedules')
        .select('tz_id_1')
        .eq('department_id', employee.department_id)
        .limit(1)

      if (schedules && schedules.length > 0 && schedules[0].tz_id_1) {
        const { data: tz } = await supabase
          .from('time_zones')
          .select('name')
          .eq('id', schedules[0].tz_id_1)
          .single()
        if (tz) scheduleName = tz.name
      }
    }

    // Remove sensitive fields
    const { password_hash, password_reset_required, ...profileData } = employee

    return NextResponse.json({
      success: true,
      data: {
        ...profileData,
        schedule_name: scheduleName
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/employee/profile
 * Update current employee's profile (only allowed fields)
 */
export async function PATCH(req) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const updates = {}

    // Only allow updating these specific fields
    const allowedFields = ['phone', 'email', 'address', 'birthday']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Validate email format if provided
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updates.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Update employee profile
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', session.employeeId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



