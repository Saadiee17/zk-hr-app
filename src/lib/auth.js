import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars'
)

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

/**
 * Create a JWT token for employee session
 */
export async function createToken(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token expires in 7 days
    .sign(JWT_SECRET)
  
  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Get session from request cookies
 */
export async function getSession(request) {
  try {
    const token = request.cookies.get('auth-token')?.value
    console.log('[auth.js getSession] Token exists:', !!token)
    
    if (!token) {
      console.log('[auth.js getSession] No token found in cookies')
      return null
    }
    
    const payload = await verifyToken(token)
    console.log('[auth.js getSession] Payload after verification:', payload)
    
    if (!payload) {
      console.log('[auth.js getSession] Token verification failed')
      return null
    }
    
    const session = {
      employeeId: payload.employeeId,
      zkUserId: payload.zkUserId,
      privilege: payload.privilege,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    }
    
    console.log('[auth.js getSession] Returning session:', session)
    return session
  } catch (error) {
    console.error('[auth.js getSession] Error:', error)
    return null
  }
}

/**
 * Check if user is admin (privilege >= 2)
 */
export function isAdmin(session) {
  return session && session.privilege >= 2
}

/**
 * Check if user is employee (privilege = 0)
 */
export function isEmployee(session) {
  return session && session.privilege === 0
}

