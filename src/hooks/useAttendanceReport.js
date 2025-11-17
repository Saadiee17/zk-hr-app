import { useState, useEffect } from 'react'
import { showError } from '@/utils/notifications'
import { toYMD } from '@/utils/attendanceUtils'

/**
 * useAttendanceReport - Hook for fetching and managing attendance data
 * @param {string} employeeId - Employee ID
 * @param {Array} dateRange - Date range [startDate, endDate]
 * @returns {object} { reportRows, loading, error, refetch }
 */
export function useAttendanceReport(employeeId, dateRange) {
  const [reportRows, setReportRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchReport = async () => {
    if (!employeeId || !dateRange?.[0] || !dateRange?.[1]) {
      setReportRows([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams({
        employee_id: employeeId,
        start_date: toYMD(dateRange[0]),
        end_date: toYMD(dateRange[1]),
      })
      const res = await fetch(`/api/reports/daily-work-time?${qs.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch report')
      setReportRows(json.data || [])
    } catch (e) {
      const errorMessage = e.message || 'Failed to load report'
      setError(errorMessage)
      showError(errorMessage)
      setReportRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, dateRange?.[0]?.getTime(), dateRange?.[1]?.getTime()])

  return {
    reportRows,
    loading,
    error,
    refetch: fetchReport,
  }
}

