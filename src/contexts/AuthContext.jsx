'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/employee/me')
      if (response.ok) {
        const data = await response.json()
        // Map 'id' to 'employeeId' for consistency
        const user = {
          ...data.user,
          employeeId: data.user.id || data.user.employeeId
        }
        console.log('[AuthContext] Setting user with employeeId:', user)
        setUser(user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (identifier, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Map 'id' to 'employeeId' for consistency
    const user = {
      ...data.user,
      employeeId: data.user.id || data.user.employeeId
    }
    
    setUser(user)
    return { ...data, user }
  }

  const setupPassword = async (zkUserId, password) => {
    const response = await fetch('/api/auth/setup-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zkUserId, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to setup password')
    }

    // Map 'id' to 'employeeId' for consistency
    const user = {
      ...data.user,
      employeeId: data.user.id || data.user.employeeId
    }
    
    setUser(user)
    return { ...data, user }
  }

  const changePassword = async (currentPassword, newPassword) => {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to change password')
    }

    return data
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
    router.push('/employee/login')
  }

  const value = {
    user,
    loading,
    login,
    setupPassword,
    changePassword,
    logout,
    checkAuth,
    isAdmin: user?.isAdmin || false,
    isEmployee: user && !user.isAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

