import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyPassword, createToken } from '@/lib/auth'

export async function POST(req) {
  try {
    const body = await req.json()
    const { identifier, password } = body // identifier can be zk_user_id or email

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and password are required' },
        { status: 400 }
      )
    }

    // Try to find employee by zk_user_id (number) or email (string)
    let query = supabase.from('employees').select('*')
    
    // If identifier is a number, search by zk_user_id, otherwise by email
    const numericId = Number(identifier)
    if (!isNaN(numericId) && identifier === String(numericId)) {
      query = query.eq('zk_user_id', numericId)
    } else {
      query = query.ilike('email', identifier)
    }

    const { data: employees, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const employee = employees[0]

    // Check if employee is active
    if (!employee.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact your administrator.' },
        { status: 403 }
      )
    }

    // Check if password is set
    if (!employee.password_hash) {
      return NextResponse.json(
        { 
          error: 'Password not set',
          needsSetup: true,
          employeeId: employee.id,
          zkUserId: employee.zk_user_id
        },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, employee.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if password reset is required
    if (employee.password_reset_required) {
      return NextResponse.json(
        { 
          error: 'Password reset required',
          requiresReset: true,
          employeeId: employee.id,
          zkUserId: employee.zk_user_id
        },
        { status: 401 }
      )
    }

    // Update last login timestamp
    await supabase
      .from('employees')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', employee.id)

    // Create JWT token
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



