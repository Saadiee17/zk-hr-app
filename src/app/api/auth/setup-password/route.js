import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword, createToken } from '@/lib/auth'

export async function POST(req) {
  try {
    const body = await req.json()
    const { zkUserId, password } = body

    if (!zkUserId || !password) {
      return NextResponse.json(
        { error: 'ZK User ID and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Find employee by zk_user_id
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('*')
      .eq('zk_user_id', zkUserId)

    if (fetchError) {
      console.error('Database error:', fetchError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = employees[0]

    // Check if employee is active
    if (!employee.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      )
    }

    // Check if password is already set (prevent overwriting without proper authentication)
    if (employee.password_hash && !employee.password_reset_required) {
      return NextResponse.json(
        { error: 'Password already set. Please use change password.' },
        { status: 400 }
      )
    }

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Update employee with new password
    const { error: updateError } = await supabase
      .from('employees')
      .update({ 
        password_hash: passwordHash,
        password_reset_required: false,
        last_login_at: new Date().toISOString()
      })
      .eq('id', employee.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to set password' },
        { status: 500 }
      )
    }

    // Create JWT token for automatic login
    const token = await createToken({
      employeeId: employee.id,
      zkUserId: employee.zk_user_id,
      privilege: employee.privilege || 0,
      email: employee.email,
      firstName: employee.first_name,
      lastName: employee.last_name,
    })

    // Create response with cookie
    const privilege = employee.privilege || 0
    const response = NextResponse.json({
      success: true,
      message: 'Password set successfully',
      user: {
        id: employee.id,
        zkUserId: employee.zk_user_id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        privilege: privilege,
        isAdmin: privilege >= 2, // Admin or Super Admin
      }
    })

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Setup password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



