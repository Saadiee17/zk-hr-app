'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Container, 
  Title, 
  Button, 
  Table, 
  LoadingOverlay,
  Paper,
  Group,
  Text,
  useMantineTheme,
  Select,
  Pagination,
  Modal,
  Badge,
  Stack
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconRefresh, IconCheck, IconX } from '@tabler/icons-react'
import { formatUTC12Hour, formatUTC12HourTime } from '@/utils/dateFormatting'
import { getCurrentWorkingDay } from '@/utils/workingDay'
import Link from 'next/link'

export default function Home() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [employeeUuid, setEmployeeUuid] = useState(null)
  const [dateRange, setDateRange] = useState([null, null])
  // Load cached metrics from localStorage on mount (client-side only)
  const loadCachedMetrics = () => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }
    try {
      const cached = localStorage.getItem('dashboard_metrics_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        // Check if cache is less than 10 minutes old
        const cacheAge = Date.now() - parsed.timestamp
        if (cacheAge < 10 * 60 * 1000) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Failed to load cached metrics:', e)
    }
    return null
  }

  const cachedMetrics = loadCachedMetrics()
  const [metrics, setMetrics] = useState(cachedMetrics?.metrics || { present: 0, late: 0, absent: 0, onTime: 0 })
  const [metricsLoading, setMetricsLoading] = useState(!cachedMetrics) // Only show loading if no cache
  const [metricsRefreshing, setMetricsRefreshing] = useState(false) // Background refresh indicator
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState(cachedMetrics?.timestamp ? new Date(cachedMetrics.timestamp) : null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [lateEmployees, setLateEmployees] = useState(cachedMetrics?.lateEmployees || [])
  const [absentEmployees, setAbsentEmployees] = useState(cachedMetrics?.absentEmployees || [])
  const [onTimeEmployees, setOnTimeEmployees] = useState(cachedMetrics?.onTimeEmployees || [])
  const [departmentEmployees, setDepartmentEmployees] = useState(cachedMetrics?.departmentEmployees || []) // Array of { department, employees: [...] }
  const [lateModalOpen, setLateModalOpen] = useState(false)
  const [absentModalOpen, setAbsentModalOpen] = useState(false)
  const [onTimeModalOpen, setOnTimeModalOpen] = useState(false)
  const theme = useMantineTheme()

  // Fetch attendance logs (server-side filtering & pagination)
  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (employeeUuid) params.set('employee_uuid', employeeUuid)
      const [start, end] = dateRange || []
      const toDateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')
      if (start || end) {
        params.set('date_range', `${toDateStr(start)},${toDateStr(end)}`)
      }

      const response = await fetch(`/api/logs/filter?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance logs')
      }

      setLogs(result.data || [])
      setTotalPages(result.totalPages || 1)
    } catch (error) {
      console.error('Error:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch attendance logs',
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch employee options for Select
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees')
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch employees')
      }
      const options = (result.data || []).map((e) => {
        const name = `${e.first_name || ''} ${e.last_name || ''}`.trim()
        return {
          value: e.id,
          label: name || e.employee_id || 'Unknown',
        }
      })
      setEmployeeOptions(options)
    } catch (error) {
      console.error('Employees error:', error)
      // Non-blocking
    }
  }

  // Use ref to track syncing state for interval checks
  const syncingRef = useRef(false)

  // Sync data from Python Bridge
  const handleSync = useCallback(async (silent = false) => {
    // Prevent multiple simultaneous syncs
    if (syncingRef.current) {
      return
    }

    try {
      syncingRef.current = true
      setSyncing(true)
      
      const response = await fetch('/api/sync', {
        method: 'GET',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      // Update last sync time
      setLastSyncTime(new Date())

      // Show notification with sync results (unless silent)
      if (!silent) {
      notifications.show({
        title: 'Sync Successful',
        message: `${result.newRecordsInserted} new attendance record(s) synced`,
        color: 'green',
        icon: <IconCheck size={18} />,
      })
      }

      // Refresh the logs after sync - fetchLogs is in scope
      await fetchLogs()
      
      // Also refresh metrics in background after sync (if we have existing metrics)
      if (lastMetricsUpdate) {
        fetchMetrics(true) // Background refresh
      }
    } catch (error) {
      console.error('Sync error:', error)
      // Only show error notification if not silent
      if (!silent) {
      notifications.show({
        title: 'Sync Failed',
        message: error.message || 'Failed to sync attendance data',
        color: 'red',
        icon: <IconX size={18} />,
      })
      }
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // fetchLogs is stable enough to not need in deps

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees()
  }, [])

  // Auto-sync every 5 minutes
  useEffect(() => {
    if (!autoSyncEnabled) {
      return
    }

    // Initial sync on mount (after a short delay to let page load)
    const initialTimeout = setTimeout(() => {
      handleSync(true) // Silent initial sync
    }, 2000)

    // Set up interval for auto-sync (5 minutes = 300000 milliseconds)
    const interval = setInterval(() => {
      if (!syncingRef.current) {
        handleSync(true) // Silent auto-sync
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Cleanup
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [autoSyncEnabled, handleSync]) // Re-run if autoSyncEnabled or handleSync changes

  // Consolidated Status Overview metrics for today
  const fetchMetrics = async (background = false) => {
    try {
      // Only show loading overlay on initial load, not background refresh
      if (!background) {
      setMetricsLoading(true)
      } else {
        setMetricsRefreshing(true)
      }
      
      // Fetch company settings to check if working day is enabled
      let workingDayEnabled = false
      let workingDayStartTime = '10:00'
      try {
        const settingsRes = await fetch('/api/hr/company-settings')
        const settingsJson = await settingsRes.json()
        if (settingsRes.ok && settingsJson.data) {
          workingDayEnabled = settingsJson.data.working_day_enabled === 'true' || settingsJson.data.working_day_enabled === true
          workingDayStartTime = settingsJson.data.working_day_start_time || '10:00'
        }
      } catch (e) {
        console.warn('Failed to fetch company settings, using defaults:', e)
      }
      
      const empRes = await fetch('/api/employees')
      const empJson = await empRes.json()
      if (!empRes.ok) throw new Error(empJson.error || 'Failed to fetch employees')
      const employees = empJson.data || []
      
      const now = new Date()
      const pakistanOffsetMs = 5 * 60 * 60 * 1000 // UTC+5
      const pakistanNow = new Date(now.getTime() + pakistanOffsetMs)
      
      // Determine the date to use based on working day setting
      let pakistanDateStr
      let yesterdayStr
      
      if (workingDayEnabled) {
        // Use working day concept
        pakistanDateStr = getCurrentWorkingDay(now, workingDayStartTime)
        // Get yesterday's working day (one day before)
        const yesterdayDate = new Date(pakistanDateStr + 'T00:00:00Z')
        yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
        yesterdayStr = yesterdayDate.toISOString().slice(0, 10)
      } else {
        // Use calendar date (old logic)
        pakistanDateStr = pakistanNow.toISOString().slice(0, 10) // YYYY-MM-DD
        const yesterdayPakistan = new Date(pakistanNow.getTime() - 24 * 60 * 60 * 1000)
        yesterdayStr = yesterdayPakistan.toISOString().slice(0, 10)
      }
      
      // The API will query logs from pakistanDateStr 00:00 UTC to (pakistanDateStr+1) 00:00 UTC
      // This covers pakistanDateStr 05:00 PKT to (pakistanDateStr+1) 05:00 PKT
      // Which includes the full Pakistan day for pakistanDateStr
      const start = pakistanDateStr
      const end = pakistanDateStr
      
      console.log(`[Metrics] Querying for ${workingDayEnabled ? 'working day' : 'Pakistan date'}: ${start}`)
      console.log(`[Metrics] Working day enabled: ${workingDayEnabled}, Start time: ${workingDayStartTime}`)
      console.log(`[Metrics] Current time - UTC: ${now.toISOString()}, Pakistan: ${pakistanNow.toISOString()}`)
      // Limit concurrency
      const chunks = []
      const size = 10
      for (let i = 0; i < employees.length; i += size) chunks.push(employees.slice(i, i + size))
      let present = 0, late = 0, absent = 0, onTime = 0
      const lateList = []
      const absentList = []
      const onTimeList = []
      
      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(async (e) => {
            try {
              // Query for a date range that includes today and yesterday to capture overnight shifts
              // The API groups shifts by their START date in Pakistan time
              // So an overnight shift (8 PM - 5 AM) is assigned to the start date (8 PM date)
              const yesterdayPakistan = new Date(pakistanNow.getTime() - 24 * 60 * 60 * 1000)
              const yesterdayStr = yesterdayPakistan.toISOString().slice(0, 10)
              
              // Query from yesterday to today to capture overnight shifts
              const qs = new URLSearchParams({ 
                employee_id: e.id, 
                start_date: yesterdayStr, 
                end_date: pakistanDateStr 
              })
          const res = await fetch(`/api/reports/daily-work-time?${qs.toString()}`)
          const json = await res.json().catch(() => ({ data: [] }))
              if (!res.ok) return null
          const rows = json.data || []
              
              // The API groups shifts by their START date in Pakistan time
              // Example: Overnight shift Nov 6 8 PM → Nov 7 5 AM is assigned to Nov 6 (start date)
              // 
              // When checking "today" (Nov 7), we need to:
              // 1. Check if there's a shift assigned to TODAY (Nov 7) - regular day shift or overnight starting today
              // 2. Check if there's an ongoing shift from YESTERDAY (Nov 6) - overnight shift still in progress
              
              const todayRow = rows.find(row => row.date === pakistanDateStr)
              const yesterdayRow = rows.find(row => row.date === yesterdayStr)
              
              let r = null
              
              // Priority 1: If there's a shift assigned to TODAY, use that
              // BUT: Only mark as absent if the shift has actually started (for night shifts that start later)
              // This could be:
              // - A regular day shift (9 AM - 5 PM)
              // - An overnight shift that STARTED today (e.g., Nov 7 8 PM → Nov 8 5 AM)
              if (todayRow) {
                // Priority: If todayRow has punches (inTime exists), use todayRow (they started a new shift today)
                // Only use yesterdayRow if todayRow has no punches AND they're still working yesterday's shift
                const isStillWorkingYesterday = yesterdayRow && 
                  yesterdayRow.inTime !== null && 
                  (yesterdayRow.outTime === null || yesterdayRow.outTime === yesterdayRow.inTime)
                
                // If todayRow has punches, use it (new shift started today)
                if (todayRow.inTime !== null) {
                  r = todayRow
                  console.log(`[Metrics] ${e.first_name} ${e.last_name}: Today's shift has punches (inTime: ${todayRow.inTime}), using today's row`)
                } else if (isStillWorkingYesterday) {
                  // TodayRow has no punches, but they're still working yesterday's shift
                  // They're still working yesterday's shift - use yesterday's row for today's metrics
                  console.log(`[Metrics] ${e.first_name} ${e.last_name}: Still working yesterday's shift (outTime: ${yesterdayRow.outTime}), using yesterday's row for today's metrics`)
                  r = yesterdayRow
                } else if (todayRow.status === 'Absent' && todayRow.inTime === null && todayRow.outTime === null) {
                  // This is a scheduled shift with no punches
                  if (workingDayEnabled) {
                    // With working day enabled, if we're still in the current working day,
                    // their shift might not have started yet - mark as "Shift Not Started" instead of "Absent"
                    // The API will handle this, but we can skip here to avoid marking as absent
                    console.log(`[Metrics] ${e.first_name} ${e.last_name}: Working day enabled, shift may not have started yet, skipping absent status`)
                    return null
                  } else {
                    // Old logic: Check if it's early morning and they completed yesterday's shift
                    const pakistanHour = pakistanNow.getUTCHours()
                    
                    // Check if they completed yesterday's shift (outTime exists and is different from inTime)
                    const completedYesterdayShift = yesterdayRow && 
                      yesterdayRow.inTime !== null && 
                      yesterdayRow.outTime !== null && 
                      yesterdayRow.outTime !== yesterdayRow.inTime
                    
                    // If it's early morning (before 6 AM) and they completed yesterday's shift, skip absent
                    // This handles the case where it's 12:25 AM and their next shift starts at 8 PM
                    if (pakistanHour < 6 && completedYesterdayShift) {
                      // They completed yesterday's shift and it's early morning
                      // Their next shift (if night shift) hasn't started yet - don't mark as absent
                      console.log(`[Metrics] ${e.first_name} ${e.last_name}: Completed shift yesterday, early morning (${pakistanHour}:00), skipping today's absent status (shift hasn't started yet)`)
                      return null
                    }
                    
                    // Also check if they completed an overnight shift that ended today
                    // If they logged out today (same Pakistan date), they just finished working
                    if (completedYesterdayShift) {
                      const outTime = new Date(yesterdayRow.outTime)
                      const pakistanOffsetMs = 5 * 60 * 60 * 1000
                      const pakistanOutTime = new Date(outTime.getTime() + pakistanOffsetMs)
                      const outTimeDateStr = pakistanOutTime.toISOString().slice(0, 10)
                      
                      // If they logged out today, they just finished yesterday's shift
                      // Don't mark as absent for today yet (shift may not have started)
                      if (outTimeDateStr === pakistanDateStr) {
                        console.log(`[Metrics] ${e.first_name} ${e.last_name}: Completed overnight shift ending today, skipping today's absent status (shift may not have started yet)`)
                        return null
                      }
                    }
                    // If none of the skip conditions apply, use today's row (they're truly absent)
                    r = todayRow
                  }
                } else {
                  // If they have punches (inTime exists), they're working - use today's row
                  r = todayRow
                }
              } 
              // Priority 2: Check for overnight shift from YESTERDAY
              else if (yesterdayRow && yesterdayRow.inTime !== null) {
                // Check if they're still working (outTime is null OR equals inTime means only one punch, still working)
                const isStillWorking = yesterdayRow.outTime === null || yesterdayRow.outTime === yesterdayRow.inTime
                
                if (isStillWorking) {
                  // Ongoing overnight shift from yesterday - they're still working
                  // They're PRESENT and working, so we should count them for today's metrics
                  // Use yesterday's row but treat it as today's attendance (they're working now)
                  console.log(`[Metrics] ${e.first_name} ${e.last_name}: Ongoing overnight shift from ${yesterdayStr} (outTime: ${yesterdayRow.outTime}), using for today's metrics`)
                  r = yesterdayRow // Use yesterday's row - they're working now
                } else {
                  // Completed shift from yesterday (outTime exists and is different from inTime)
                  // If it's an overnight shift, it likely ended today (after midnight)
                  // They completed yesterday's shift, so they're not absent for today
                  // Check if the shift ended today (same Pakistan date as today)
                  const outTime = new Date(yesterdayRow.outTime)
                  const pakistanOffsetMs = 5 * 60 * 60 * 1000
                  const pakistanOutTime = new Date(outTime.getTime() + pakistanOffsetMs)
                  const outTimeDateStr = pakistanOutTime.toISOString().slice(0, 10)
                  
                  // If they logged out today (same Pakistan date as today), they completed yesterday's overnight shift
                  // Don't mark as absent - they worked yesterday's shift
                  if (outTimeDateStr === pakistanDateStr) {
                    console.log(`[Metrics] ${e.first_name} ${e.last_name}: Completed overnight shift from ${yesterdayStr} ending today (${outTimeDateStr}), skipping today's metrics`)
                    return null // Skip - they completed yesterday's shift, not absent
                  }
                }
              }
              // Priority 3: No shift data for today
              // The API only returns rows for dates where there's a scheduled shift
              // If there's no row for today, it means:
              // 1. No shift scheduled for today (shouldn't mark as absent) - OR
              // 2. Shift scheduled but no punches (would have status 'Absent')
              // Since we don't have a row, we can't determine which case it is
              // But if there's no shift scheduled, we shouldn't mark as absent
              // So we skip - only mark as absent if todayRow exists with status 'Absent'
              else {
                // No row for today - no shift scheduled OR shift scheduled but no punches
                // We can only mark as absent if todayRow exists with status 'Absent'
                // Since todayRow doesn't exist, skip
                console.log(`[Metrics] ${e.first_name} ${e.last_name}: No shift data for ${pakistanDateStr}, skipping (no shift scheduled or no punches)`)
                return null
              }
              
              if (!r) return null
              
              const employeeName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || 'Unknown'
              // Handle department - could be object or array
              let departmentName = 'N/A'
              if (e.department) {
                if (Array.isArray(e.department) && e.department.length > 0) {
                  departmentName = e.department[0].name || 'N/A'
                } else if (typeof e.department === 'object' && e.department.name) {
                  departmentName = e.department.name
                }
              }
              // Use primary_schedule from enriched employee data
              const scheduleInfo = e.primary_schedule || 'Not Assigned'
              
              // Check status (case-insensitive to handle variations)
              const status = r.status?.trim() || ''
              
              return {
                employee: e,
                status,
                reportData: r,
                employeeName,
                departmentName,
                scheduleInfo
              }
            } catch (err) {
              console.error(`[Metrics] Error processing employee ${e.id}:`, err)
              return null
            }
          })
        )
        
        // Process results and populate lists
        for (const result of results) {
          if (!result) continue
          
          const { status, reportData: r, employeeName, departmentName, scheduleInfo, employee: e } = result
          
          // Debug logging for status matching
          if (status === 'Late-In' || status === 'Absent' || status === 'On-Time') {
            console.log(`[Metrics] Found ${status}: ${employeeName} (${departmentName})`)
          }
          
          if (status === 'Absent') {
            absent += 1
            absentList.push({
              id: e.id,
              name: employeeName,
              department: departmentName,
              schedule: scheduleInfo,
              employeeId: e.employee_id || 'N/A'
            })
            console.log(`[Metrics] Added to absent list. Total: ${absentList.length}`)
          } else if (status === 'On Leave') {
            // On Leave is not counted as absent or present
          } else if (status === 'Half Day') {
            // Half Day counts as present
            present += 1
          } else if (status === 'Out of Schedule') {
            // Out of Schedule counts as present
            present += 1
          } else if (status === 'On-Time' || status === 'Late-In') {
            present += 1
            if (status === 'On-Time') {
              onTime += 1
              onTimeList.push({
                id: e.id,
                name: employeeName,
                department: departmentName,
                schedule: scheduleInfo,
                employeeId: e.employee_id || 'N/A',
                inTime: r.inTime
              })
              console.log(`[Metrics] Added to on-time list. Total: ${onTimeList.length}`)
            } else if (status === 'Late-In') {
              late += 1
              lateList.push({
                id: e.id,
                name: employeeName,
                department: departmentName,
                schedule: scheduleInfo,
                employeeId: e.employee_id || 'N/A',
                inTime: r.inTime
              })
              console.log(`[Metrics] Added to late list. Total: ${lateList.length}`)
            }
          } else {
            // Log unexpected status values
            console.log(`[Metrics] Unexpected status for ${employeeName}: "${status}"`)
          }
        }
      }
      
      // Debug logging
      console.log('[Metrics] On-Time employees:', onTimeList.length, onTimeList)
      console.log('[Metrics] Late employees:', lateList.length, lateList)
      console.log('[Metrics] Absent employees:', absentList.length, absentList)
      
      const updateTime = new Date()
      setMetrics({ present, late, absent, onTime })
      setOnTimeEmployees([...onTimeList]) // Create new array to trigger re-render
      setLateEmployees([...lateList]) // Create new array to trigger re-render
      setAbsentEmployees([...absentList]) // Create new array to trigger re-render
      setLastMetricsUpdate(updateTime) // Track when metrics were updated
      
      // Cache metrics to localStorage for faster subsequent loads (client-side only)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          // We'll cache departmentEmployees after it's built
          const cacheData = {
            timestamp: updateTime.getTime(),
            metrics: { present, late, absent, onTime },
            lateEmployees: [...lateList],
            absentEmployees: [...absentList],
            onTimeEmployees: [...onTimeList],
          }
          localStorage.setItem('dashboard_metrics_cache', JSON.stringify(cacheData))
        } catch (e) {
          console.warn('Failed to cache metrics:', e)
        }
      }
      
      // Build department-wise employee list from the same data we already processed
      const deptMap = new Map() // department -> employees[]
      
      // Process all employees (including those not in metrics) to build department list
      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(async (e) => {
            try {
              // Use the same date logic as metrics (working day or calendar date)
              // yesterdayStr is already calculated above based on workingDayEnabled
              
              const qs = new URLSearchParams({ 
                employee_id: e.id, 
                start_date: yesterdayStr, 
                end_date: pakistanDateStr 
              })
              const res = await fetch(`/api/reports/daily-work-time?${qs.toString()}`)
              const json = await res.json().catch(() => ({ data: [] }))
              if (!res.ok) return null
              const rows = json.data || []
              
              const todayRow = rows.find(row => row.date === pakistanDateStr)
              const yesterdayRow = rows.find(row => row.date === yesterdayStr)
              
              let r = null
              let status = 'No Schedule'
              let inTime = null
              
              // Use same logic as metrics to determine status
              if (todayRow) {
                // Priority: If todayRow has punches (inTime exists), use todayRow (they started a new shift today)
                // Only use yesterdayRow if todayRow has no punches AND they're still working yesterday's shift
                const isStillWorkingYesterday = yesterdayRow && 
                  yesterdayRow.inTime !== null && 
                  (yesterdayRow.outTime === null || yesterdayRow.outTime === yesterdayRow.inTime)
                
                // If todayRow has punches, use it (new shift started today)
                if (todayRow.inTime !== null) {
                  r = todayRow
                } else if (isStillWorkingYesterday) {
                  // TodayRow has no punches, but they're still working yesterday's shift
                  r = yesterdayRow
                } else if (todayRow.status === 'Absent' && todayRow.inTime === null && todayRow.outTime === null) {
                  if (workingDayEnabled) {
                    // With working day enabled, if shift hasn't started yet, mark as "Shift Not Started"
                    status = 'Shift Not Started'
                    return { employee: e, status, inTime: null }
                  } else {
                    // Old logic
                    const pakistanHour = pakistanNow.getUTCHours()
                    const completedYesterdayShift = yesterdayRow && 
                      yesterdayRow.inTime !== null && 
                      yesterdayRow.outTime !== null && 
                      yesterdayRow.outTime !== yesterdayRow.inTime
                    
                    if (pakistanHour < 6 && completedYesterdayShift) {
                      status = 'Shift Not Started'
                      return { employee: e, status, inTime: null }
                    }
                    
                    const outTime = yesterdayRow?.outTime ? new Date(yesterdayRow.outTime) : null
                    if (completedYesterdayShift && outTime) {
                      const pakistanOffsetMs = 5 * 60 * 60 * 1000
                      const pakistanOutTime = new Date(outTime.getTime() + pakistanOffsetMs)
                      const outTimeDateStr = pakistanOutTime.toISOString().slice(0, 10)
                      if (outTimeDateStr === pakistanDateStr) {
                        status = 'Shift Not Started'
                        return { employee: e, status, inTime: null }
                      }
                    }
                    r = todayRow
                  }
                } else {
                  r = todayRow
                }
              } else if (yesterdayRow && yesterdayRow.inTime !== null) {
                const isStillWorking = yesterdayRow.outTime === null || yesterdayRow.outTime === yesterdayRow.inTime
                if (isStillWorking) {
                  r = yesterdayRow
                } else {
                  const outTime = new Date(yesterdayRow.outTime)
                  const pakistanOffsetMs = 5 * 60 * 60 * 1000
                  const pakistanOutTime = new Date(outTime.getTime() + pakistanOffsetMs)
                  const outTimeDateStr = pakistanOutTime.toISOString().slice(0, 10)
                  if (outTimeDateStr === pakistanDateStr) {
                    status = 'Shift Not Started'
                    return { employee: e, status, inTime: null }
                  }
                  return null
                }
              } else {
                // No shift data - check if they have a schedule assigned
                if (e.primary_schedule && e.primary_schedule !== 'Not Assigned') {
                  status = 'Shift Not Started'
                } else {
                  status = 'No Schedule'
                }
                return { employee: e, status, inTime: null }
              }
              
              if (!r) return null
              
              status = r.status || 'Present'
              inTime = r.inTime
              
              return { employee: e, status, inTime }
            } catch (err) {
              console.error(`[DeptList] Error processing ${e.first_name} ${e.last_name}:`, err)
              return null
            }
          })
        )
        
        // Process results and group by department
        for (const result of results) {
          if (!result) continue
          
          const { employee: e, status, inTime } = result
          // Handle department - could be object or array
          let deptName = 'Unassigned'
          if (e.department) {
            if (Array.isArray(e.department) && e.department.length > 0) {
              deptName = e.department[0].name || 'Unassigned'
            } else if (typeof e.department === 'object' && e.department.name) {
              deptName = e.department.name
            }
          }
          
          if (!deptMap.has(deptName)) {
            deptMap.set(deptName, [])
          }
          
          deptMap.get(deptName).push({
            id: e.id,
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || 'Unknown',
            employeeId: e.employee_id || 'N/A',
            status,
            inTime,
            schedule: e.primary_schedule || 'Not Assigned'
          })
        }
      }
      
      // Convert map to sorted array
      const deptArray = Array.from(deptMap.entries())
        .map(([department, employees]) => ({
          department,
          employees: employees.sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => a.department.localeCompare(b.department))
      
      setDepartmentEmployees(deptArray)
      
      // Update cache with department employees (client-side only)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem('dashboard_metrics_cache')
          if (cached) {
            const parsed = JSON.parse(cached)
            parsed.departmentEmployees = deptArray
            localStorage.setItem('dashboard_metrics_cache', JSON.stringify(parsed))
          }
        } catch (e) {
          console.warn('Failed to update cache with department employees:', e)
        }
      }
    } catch (e) {
      // Only show error notification if not background refresh
      if (!background) {
      notifications.show({ title: 'Metrics error', message: e.message || 'Failed to compute overview', color: 'red', icon: <IconX size={18} /> })
      } else {
        console.error('[Metrics] Background refresh failed:', e)
      }
    } finally {
      setMetricsLoading(false)
      setMetricsRefreshing(false)
    }
  }

  // Initial load: fetch metrics immediately
  useEffect(() => {
    if (cachedMetrics) {
      // If we have cached data, refresh in background (don't show loading overlay)
      fetchMetrics(true)
    } else {
      // No cache, show loading overlay
      fetchMetrics(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Background refresh: update metrics every 5 minutes (aligned with auto-sync)
  useEffect(() => {
    if (!autoSyncEnabled) {
      return
    }

    // Set up interval for background metrics refresh (5 minutes = 300000 milliseconds)
    const interval = setInterval(() => {
      // Only refresh if we have existing metrics (don't refresh if initial load is still happening)
      if (lastMetricsUpdate) {
        fetchMetrics(true) // Background refresh, don't show loading overlay
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Cleanup
    return () => {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncEnabled, lastMetricsUpdate]) // Re-run if autoSyncEnabled or lastMetricsUpdate changes

  // Fetch logs on filters/pagination change
  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, employeeUuid, dateRange])

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1)
  }, [employeeUuid, dateRange])

  // Format timestamp for display
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    return formatUTC12Hour(timestamp)
  }

  // Human-readable mapping is now done on the server; UI consumes provided text fields
  const coalesce = (value, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') return fallback
    return value
  }

  // Get employee name from Supabase employee record
  const getEmployeeName = (employee) => {
    // Handle different data structures from Supabase
    if (!employee) return 'Unknown'
    
    // If it's an array, get the first item
    if (Array.isArray(employee) && employee.length > 0) {
      employee = employee[0]
    }
    
    // If it's an object with employee data
    if (typeof employee === 'object' && employee !== null) {
      const firstName = employee.first_name || ''
      const lastName = employee.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()
      
      // Return the name if we have it, otherwise show just first name
      if (fullName) return fullName
      if (firstName) return firstName
    }
    
    return 'Unknown'
  }

  // Table rows
  const rows = logs.map((log) => {
    const employee = Array.isArray(log.employees) ? log.employees[0] : log.employees
    const employeeId = employee?.id
    const employeeName = getEmployeeName(log.employees)
    
    return (
    <Table.Tr key={log.id}>
      <Table.Td>{log.zk_user_id}</Table.Td>
        <Table.Td>
          {employeeId ? (
            <Link href={`/employees/${employeeId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <Text 
                component="span" 
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="employee-name-link"
              >
                {employeeName}
              </Text>
            </Link>
          ) : (
            employeeName
          )}
        </Table.Td>
      <Table.Td>{coalesce(log.department_name)}</Table.Td>
      <Table.Td>{formatDateTime(log.log_time)}</Table.Td>
      <Table.Td>{coalesce(log.punch_text)}</Table.Td>
      <Table.Td>{coalesce(log.status_text)}</Table.Td>
      <Table.Td>{formatDateTime(log.synced_at)}</Table.Td>
    </Table.Tr>
    )
  })

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Group justify="space-between" mb="xl">
        <Title order={1}>HR Attendance Dashboard</Title>
        <Group gap="md">
          {lastSyncTime && (
            <Text size="sm" c="dimmed">
              Last sync: {formatUTC12HourTime(lastSyncTime.toISOString())}
            </Text>
          )}
        <Button
          leftSection={<IconRefresh size={18} />}
            onClick={() => handleSync(false)}
          loading={syncing}
          disabled={syncing}
          color="blue"
        >
          Sync Data Now
        </Button>
        </Group>
      </Group>

      <Paper withBorder shadow="sm" p="md" mb="md">
        <Group justify="space-between" align="center">
          <Group gap="lg">
            <div>
              <Text size="sm" c="dimmed">Employees Present (today)</Text>
              <Title order={3}>{metricsLoading ? '…' : metrics.present}</Title>
            </div>
            <div 
              style={{ cursor: metrics.onTime > 0 ? 'pointer' : 'default' }}
              onClick={() => metrics.onTime > 0 && setOnTimeModalOpen(true)}
            >
              <Text size="sm" c="dimmed">Employees On-Time (today)</Text>
              <Title order={3} c="green">{metricsLoading ? '…' : metrics.onTime}</Title>
            </div>
            <div 
              style={{ cursor: metrics.late > 0 ? 'pointer' : 'default' }}
              onClick={() => metrics.late > 0 && setLateModalOpen(true)}
            >
              <Text size="sm" c="dimmed">Employees Late-In (today)</Text>
              <Title order={3} c="orange">{metricsLoading ? '…' : metrics.late}</Title>
            </div>
            <div 
              style={{ cursor: metrics.absent > 0 ? 'pointer' : 'default' }}
              onClick={() => metrics.absent > 0 && setAbsentModalOpen(true)}
            >
              <Text size="sm" c="dimmed">Employees Absent (today)</Text>
              <Title order={3} c="red">{metricsLoading ? '…' : metrics.absent}</Title>
            </div>
          </Group>
          <Group gap="xs">
            {metricsRefreshing && (
              <Text size="xs" c="dimmed">Refreshing...</Text>
            )}
            {lastMetricsUpdate && (
              <Text size="xs" c="dimmed">
                Updated: {formatUTC12HourTime(lastMetricsUpdate.toISOString())}
              </Text>
            )}
            <Button variant="light" onClick={() => fetchMetrics(false)} loading={metricsLoading || metricsRefreshing}>
              Refresh Overview
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* On-Time Employees Modal */}
      <Modal
        opened={onTimeModalOpen}
        onClose={() => setOnTimeModalOpen(false)}
        title="Employees On-Time Today"
        size="lg"
      >
        {onTimeEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No on-time employees found</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Check-In Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {onTimeEmployees.map((emp) => (
                <Table.Tr key={emp.id}>
                  <Table.Td>
                    <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Text 
                        component="span" 
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="employee-name-link"
                      >
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{emp.department}</Badge></Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>{emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      {/* Late Employees Modal */}
      <Modal
        opened={lateModalOpen}
        onClose={() => setLateModalOpen(false)}
        title="Employees Late-In Today"
        size="lg"
      >
        {lateEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No late employees found</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Check-In Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lateEmployees.map((emp) => (
                <Table.Tr key={emp.id}>
                  <Table.Td>
                    <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Text 
                        component="span" 
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="employee-name-link"
                      >
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{emp.department}</Badge></Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>{emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      {/* Absent Employees Modal */}
      <Modal
        opened={absentModalOpen}
        onClose={() => setAbsentModalOpen(false)}
        title="Employees Absent Today"
        size="lg"
      >
        {absentEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No absent employees found</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Employee ID</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {absentEmployees.map((emp) => (
                <Table.Tr key={emp.id}>
                  <Table.Td>
                    <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Text 
                        component="span" 
                        style={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="employee-name-link"
                      >
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td><Badge variant="light">{emp.department}</Badge></Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>{emp.employeeId}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      {/* Department-Wise Employee Status */}
      <Paper withBorder shadow="sm" p="md" mb="md">
        <Title order={3} mb="md">Employee Status by Department</Title>
        {metricsLoading ? (
          <Text c="dimmed" ta="center" py="md">Loading employee status...</Text>
        ) : departmentEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No employee data available</Text>
        ) : (
          <Stack gap="lg">
            {departmentEmployees.map(({ department, employees }) => (
              <div key={department}>
                <Title order={4} mb="sm" c="blue">{department}</Title>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Schedule</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Login Time</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {employees.map((emp) => {
                      let statusColor = 'gray'
                      let statusText = emp.status
                      
                      if (emp.status === 'On-Time') {
                        statusColor = 'green'
                      } else if (emp.status === 'Late-In') {
                        statusColor = 'orange'
                      } else if (emp.status === 'Absent') {
                        statusColor = 'red'
                      } else if (emp.status === 'Shift Not Started') {
                        statusColor = 'gray'
                      } else if (emp.status === 'Present' || emp.status === 'Out of Schedule' || emp.status === 'Half Day') {
                        statusColor = 'blue'
                      } else if (emp.status === 'No Schedule') {
                        statusColor = 'gray'
                      }
                      
                      return (
                        <Table.Tr key={emp.id}>
                          <Table.Td>
                            <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              <Text 
                                component="span" 
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                className="employee-name-link"
                              >
                                {emp.name}
                              </Text>
                            </Link>
                          </Table.Td>
                          <Table.Td>{emp.schedule}</Table.Td>
                          <Table.Td>
                            <Badge color={statusColor} variant="light">
                              {statusText}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {emp.inTime ? (
                              formatUTC12HourTime(emp.inTime)
                            ) : emp.status === 'Shift Not Started' ? (
                              <Text c="dimmed" size="sm">Shift not started</Text>
                            ) : (
                              <Text c="dimmed" size="sm">N/A</Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </div>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper withBorder shadow="sm" p="md" pos="relative">
        <Group wrap="wrap" mb="md" gap="md" align="flex-end">
          <DatePickerInput
            type="range"
            label="Date range"
            placeholder="Pick date range"
            value={dateRange}
            onChange={setDateRange}
            clearable
          />
          <Select
            label="Employee"
            placeholder="Select employee"
            data={employeeOptions}
            searchable
            clearable
            value={employeeUuid}
            onChange={setEmployeeUuid}
            nothingFoundMessage="No employees"
            comboboxProps={{ withinPortal: true }}
            style={{ minWidth: 260 }}
          />
        </Group>
        <LoadingOverlay visible={loading} />
        
        {logs.length === 0 && !loading ? (
          <Text ta="center" c="dimmed" py="xl">
            No attendance records found
          </Text>
        ) : (
          <Table 
            striped 
            highlightOnHover 
            withTableBorder
            withColumnBorders
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th fw={600}>ZK User ID</Table.Th>
                <Table.Th fw={600}>Employee</Table.Th>
                <Table.Th fw={600}>Department</Table.Th>
                <Table.Th fw={600}>Log Time</Table.Th>
                <Table.Th fw={600}>Punch</Table.Th>
                <Table.Th fw={600}>Status</Table.Th>
                <Table.Th fw={600}>Synced At</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows}
            </Table.Tbody>
          </Table>
        )}
        {!loading && totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Paper>
    </Container>
  )
}
