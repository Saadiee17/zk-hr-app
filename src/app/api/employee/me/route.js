import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

/**
 * GET /api/employee/me
 * Returns the current logged-in employee's session info
 */
export async function GET(req) {
  try {
    console.log('[/api/employee/me] Checking session...')
    console.log('[/api/employee/me] Cookies:', req.cookies.getAll())
    
    const session = await getSession(req)
    
    console.log('[/api/employee/me] Session result:', session)
    
    if (!session) {
      console.log('[/api/employee/me] No session found - unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[/api/employee/me] Session valid, returning user data')
    return NextResponse.json({
      success: true,
      user: {
        employeeId: session.employeeId,
        zkUserId: session.zkUserId,
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        privilege: session.privilege,
        isAdmin: session.privilege >= 2,
      }
    })
  } catch (error) {
    console.error('[/api/employee/me] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

