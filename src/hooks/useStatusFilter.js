import { useState, useMemo } from 'react'
import { getStatusOptions } from '@/utils/attendanceUtils'

/**
 * useStatusFilter - Hook for managing status filtering logic
 * @param {Array} reportRows - Array of report row objects with status property
 * @returns {object} { statusFilter, setStatusFilter, statusOptions, filteredRows }
 */
export function useStatusFilter(reportRows = []) {
  const [statusFilter, setStatusFilter] = useState('')

  const statusOptions = useMemo(() => {
    return getStatusOptions(reportRows)
  }, [reportRows])

  const filteredRows = useMemo(() => {
    if (!statusFilter || statusFilter === '') return reportRows
    return reportRows.filter(r => r.status === statusFilter)
  }, [reportRows, statusFilter])

  return {
    statusFilter,
    setStatusFilter,
    statusOptions,
    filteredRows,
  }
}




