import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    // Get session from cookie
    const session = await getSession(req)
    if (!session || !isAdmin(session)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Reset password for employee
    const { error: updateError } = await supabase
      .from('employees')
      .update({ 
        password_hash: null,
        password_reset_required: true
      })
      .eq('id', employeeId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Employee will be prompted to set a new password on next login.'
    })
  } catch (error) {
    console.error('Admin reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



