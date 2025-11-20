/**
 * Custom hook for fetching and managing department options
 * Provides standardized department fetching with loading states
 */

import { useState, useEffect } from 'react'
import { getDepartmentSelectOptions } from '@/utils/employeeUtils'
import { showApiError } from '@/utils/notifications'

/**
 * Hook to fetch and manage department options for Select components
 * @param {boolean} autoFetch - Whether to fetch automatically on mount (default: true)
 * @returns {object} { options, loading, refetch, error }
 */
export function useDepartmentOptions(autoFetch = true) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch('/api/hr/departments')
      const json = await res.json()
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch departments')
      }
      
      const departmentOptions = getDepartmentSelectOptions(json.data || [])
      setOptions(departmentOptions)
    } catch (err) {
      setError(err)
      setOptions([])
      // Don't show notification for auto-fetch errors (non-blocking)
      // Parent components can handle errors if needed
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch) {
      fetchDepartments()
    }
  }, [autoFetch])

  return {
    options,
    loading,
    error,
    refetch: fetchDepartments,
  }
}




