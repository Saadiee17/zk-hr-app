import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars'
)

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Protected employee routes
  const isEmployeeRoute = pathname.startsWith('/employee') && 
                          !pathname.startsWith('/employee/login') &&
                          !pathname.startsWith('/employee/setup-password')

  // Protected admin routes (existing routes)
  const isAdminRoute = pathname === '/' || 
                       pathname.startsWith('/departments') ||
                       pathname.startsWith('/employees') ||
                       pathname.startsWith('/hr-management') ||
                       pathname.startsWith('/leave-management') ||
                       pathname.startsWith('/payroll-reports') ||
                       pathname.startsWith('/device-config') ||
                       pathname.startsWith('/employee-enrollment') ||
                       pathname.startsWith('/bridge-installer')

  // If not a protected route, allow access
  if (!isEmployeeRoute && !isAdminRoute) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    // No token, redirect to login
    if (isEmployeeRoute) {
      return NextResponse.redirect(new URL('/employee/login', request.url))
    }
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/employee/login', request.url))
    }
  }

  try {
    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const privilege = payload.privilege || 0

    // Check if trying to access admin routes
    if (isAdminRoute) {
      // Only admins (privilege >= 2) can access admin routes
      if (privilege < 2) {
        // Regular employee trying to access admin routes, redirect to employee dashboard
        return NextResponse.redirect(new URL('/employee/dashboard', request.url))
      }
    }

    // Check if admin is trying to access employee routes
    // Allow it for now, admins can use both portals

    // Token is valid, allow access
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware auth error:', error)
    // Invalid token, redirect to login
    if (isEmployeeRoute) {
      return NextResponse.redirect(new URL('/employee/login', request.url))
    }
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/employee/login', request.url))
    }
  }
}

export const config = {
  matcher: [
    '/',
    '/employee/:path*',
    '/departments/:path*',
    '/employees/:path*',
    '/hr-management/:path*',
    '/leave-management/:path*',
    '/payroll-reports/:path*',
    '/device-config/:path*',
    '/employee-enrollment/:path*',
    '/bridge-installer/:path*',
  ],
}



