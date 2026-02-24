'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Container,
  Title,
  Button,
  Table,
  LoadingOverlay,
  Paper,
  Group,
  Text,
  Pagination,
  Modal,
  Badge,
  Stack,
  Grid,
  Card,
  Collapse,
  ActionIcon,
  Box,
  Tabs,
  TextInput,
  Indicator,
  ThemeIcon,
  Divider,
  Avatar,
  ScrollArea,
  Tooltip,
  Center
} from '@mantine/core'
import {
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconUserCheck,
  IconClock,
  IconUserX,
  IconAlertCircle,
  IconUsers,
  IconHourglassHigh,
  IconBriefcase,
  IconCalendar,
  IconSettings,
  IconFingerprint
} from '@tabler/icons-react'
import { showError, showLoading, updateNotification } from '@/utils/notifications'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import { DatePickerInput } from '@mantine/dates'
import { formatHoursMinutes, toYMD, getEffectiveWorkingDayDate, getPakistanNow } from '@/utils/attendanceUtils'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import { MetricCard } from '@/components/shared/MetricCard'
import { UniversalTabs } from '@/components/shared/UniversalTabs'
import { UniversalTable } from '@/components/shared/UniversalTable'
import { DepartmentStatusGrid } from '@/components/dashboard/DepartmentStatus'
import { SyncProgressBanner } from '@/components/shared/SyncProgressBanner'

function Dashboard({ isCollapsed }) {
  // State for logs table
  const [logs, setLogs] = useState([])
  const [allLogs, setAllLogs] = useState([]) // Store all logs for search filtering
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)

  // State for sync
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const syncingRef = useRef(false)

  // State for metrics
  const [metrics, setMetrics] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onTime: 0,
    totalOvertimeHours: 0,
    totalWorkingHours: 0,
    averageWorkHours: 0,
    attendanceRate: 0,
    punchOutMissing: 0
  })
  const [metricsLoading, setLoadingMetrics] = useState(false)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [lateEmployees, setLateEmployees] = useState([])
  const [absentEmployees, setAbsentEmployees] = useState([])
  const [onTimeEmployees, setOnTimeEmployees] = useState([])
  const [presentEmployees, setPresentEmployees] = useState([])
  const [departmentEmployees, setDepartmentEmployees] = useState([])
  const [punchOutMissingEmployees, setPunchOutMissingEmployees] = useState([])

  // State for modals
  const [lateModalOpen, setLateModalOpen] = useState(false)
  const [absentModalOpen, setAbsentModalOpen] = useState(false)
  const [onTimeModalOpen, setOnTimeModalOpen] = useState(false)
  const [presentModalOpen, setPresentModalOpen] = useState(false)
  const [punchOutMissingModalOpen, setPunchOutMissingModalOpen] = useState(false)
  const [alertsModalOpen, setAlertsModalOpen] = useState(false)
  const [pendingLeaves, setPendingLeaves] = useState([])

  // State for department collapse
  const [expandedDepartments, setExpandedDepartments] = useState({})

  // State for search and tabs
  const [logsSearchQuery, setLogsSearchQuery] = useState('')
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('status')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [settings, setSettings] = useState({
    workingDayEnabled: false,
    workingDayStartTime: '09:00'
  })
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Fetch attendance logs with pagination
  const fetchLogs = useCallback(async (page = 1, limit = 50, fetchAll = false) => {
    try {
      setLoading(true)

      if (fetchAll) {
        // When searching, fetch multiple pages to get all logs
        // Fetch first 20 pages (1000 logs) which should cover most cases
        const maxPagesToFetch = 20
        const allFetchedLogs = []

        // Fetch first page to get total count
        const firstResponse = await fetch(`/api/logs/filter?page=1&limit=${limit}`)
        const firstResult = await firstResponse.json()

        if (!firstResponse.ok) {
          throw new Error(firstResult.error || 'Failed to fetch logs')
        }

        allFetchedLogs.push(...(firstResult.data || []))
        const totalPagesFromAPI = firstResult.totalPages || 1
        const pagesToFetch = Math.min(maxPagesToFetch, totalPagesFromAPI)

        // Fetch remaining pages in parallel
        if (pagesToFetch > 1) {
          const fetchPromises = []
          for (let p = 2; p <= pagesToFetch; p++) {
            fetchPromises.push(
              fetch(`/api/logs/filter?page=${p}&limit=${limit}`)
                .then(res => res.json())
                .then(result => result.data || [])
            )
          }

          const additionalLogs = await Promise.all(fetchPromises)
          additionalLogs.forEach(pageLogs => {
            allFetchedLogs.push(...pageLogs)
          })
        }

        // Store all logs for search filtering
        setAllLogs(allFetchedLogs)
        setLogs(allFetchedLogs)
        setTotalPages(totalPagesFromAPI)
      } else {
        // Normal pagination mode
        const response = await fetch(`/api/logs/filter?page=${page}&limit=${limit}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch logs')
        }

        const fetchedLogs = result.data || []
        setLogs(fetchedLogs)
        setAllLogs([]) // Clear allLogs when not searching
        setTotalPages(result.totalPages || 1)
      }
    } catch (error) {
      console.error('[Logs] Error:', error)
      showError(error.message || 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch dashboard metrics using API (single source of truth!)
  const fetchMetrics = useCallback(async (background = false) => {
    // Capture the date this request is for
    const requestDateStr = toYMD(selectedDate)

    try {
      if (!background) setLoadingMetrics(true)
      // Use settings from state (fetched on mount or derived from settings)
      const workingDayEnabled = settings.workingDayEnabled
      const workingDayStartTime = settings.workingDayStartTime

      // Simplified: We fetch exactly what the user has selected. 
      // The \"Working Day\" logic now only handles the INITIAL default date
      // to ensure UI selection is always absolute and predictable.
      const pakistanDateStr = toYMD(selectedDate)

      // Calculate previous day for comparisons/metrics
      const selDate = new Date(selectedDate)
      const prevDate = new Date(selDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const pakistanYesterdayStr = toYMD(prevDate)

      console.log(`[Metrics] Fetching for Date: ${pakistanDateStr}, Previous Day: ${pakistanYesterdayStr}`)

      // Fetch all employees
      const empResponse = await fetch('/api/employees')
      const empResult = await empResponse.json()
      if (!empResponse.ok) {
        throw new Error(empResult.error || 'Failed to fetch employees')
      }
      const employees = empResult.data || []

      // Use batch endpoint for fast retrieval (cached) - fetch both dates in parallel!
      console.log(`[Metrics] Fetching batch data for ${pakistanDateStr} and ${pakistanYesterdayStr} in parallel`)
      const [batchResponse, yesterdayBatchResponse] = await Promise.all([
        fetch(`/api/reports/daily-work-time/batch?date=${pakistanDateStr}`),
        fetch(`/api/reports/daily-work-time/batch?date=${pakistanYesterdayStr}`)
      ])

      const [batchResult, yesterdayBatchResult] = await Promise.all([
        batchResponse.json(),
        yesterdayBatchResponse.json()
      ])

      if (!batchResponse.ok) {
        throw new Error(batchResult.error || 'Failed to fetch batch attendance data')
      }

      if (!yesterdayBatchResponse.ok) {
        throw new Error(yesterdayBatchResult.error || 'Failed to fetch yesterday batch attendance data')
      }

      const batchData = batchResult.data || []
      const batchMap = new Map(batchData.map(item => [item.employee_id, item]))

      const yesterdayBatchData = yesterdayBatchResult.data || []
      const yesterdayBatchMap = new Map(yesterdayBatchData.map(item => [item.employee_id, item]))

      console.log(`[Metrics] Received ${batchData.length} today, ${yesterdayBatchData.length} yesterday`)

      // Build results array matching the original structure
      const results = employees.map((e) => {
        const todayRow = batchMap.get(e.id)
        const yesterdayRow = yesterdayBatchMap.get(e.id)

        const employeeName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || 'Unknown'
        const departmentName = e.department?.name || 'No Department'
        const scheduleInfo = e.primary_schedule || 'Not Assigned'

        // Status logic: Use effective working day\'s data
        // Note: If we\'re before working day start, effectiveDateStr is yesterday\'s date
        // so todayRow will actually contain yesterday\'s data
        let status = 'Absent'
        let relevantRow = null

        if (todayRow && todayRow.status) {
          // Use the effective date\'s status
          status = todayRow.status
          relevantRow = {
            date: todayRow.date,
            inTime: todayRow.inTime,
            outTime: todayRow.outTime,
            durationHours: todayRow.durationHours,
            regularHours: todayRow.regularHours,
            overtimeHours: todayRow.overtimeHours,
            status: todayRow.status,
          }
        } else if (yesterdayRow && yesterdayRow.status === 'Punch Out Missing') {
          // If someone from the previous day hasn\'t clocked out, show that
          status = 'Punch Out Missing'
          relevantRow = {
            date: yesterdayRow.date,
            inTime: yesterdayRow.inTime,
            outTime: yesterdayRow.outTime,
            durationHours: yesterdayRow.durationHours,
            regularHours: yesterdayRow.regularHours,
            overtimeHours: yesterdayRow.overtimeHours,
            status: yesterdayRow.status,
          }
        }

        return {
          employee: e,
          reportData: relevantRow || (todayRow ? {
            date: todayRow.date,
            inTime: todayRow.inTime,
            outTime: todayRow.outTime,
            durationHours: todayRow.durationHours,
            regularHours: todayRow.regularHours,
            overtimeHours: todayRow.overtimeHours,
            status: todayRow.status,
          } : null),
          employeeName,
          departmentName,
          scheduleInfo,
          status
        }
      })

      // Aggregate counts
      let presentCount = 0
      let lateCount = 0
      let absentCount = 0
      let onTimeCount = 0

      const lateList = []
      const absentList = []
      const onTimeList = []
      const presentList = []

      // Detailed distribution map
      const deptMap = new Map()

      for (const result of results) {
        if (!result) continue
        const { status, reportData: r, employeeName, departmentName, scheduleInfo, employee: e } = result

        // Department Status Grid Data
        if (!deptMap.has(departmentName)) {
          deptMap.set(departmentName, [])
        }
        deptMap.get(departmentName).push({
          id: e.id,
          name: employeeName,
          employeeId: e.employee_id,
          status: status,
          inTime: r?.inTime,
          schedule: scheduleInfo
        })

        if (status === 'On-Time' || status === 'Late-In' || status === 'Punch Out Missing' || status === 'Present' || status === 'Worked on Day Off' || status === 'Out of Schedule') {
          presentCount++
          if (status === 'On-Time') {
            onTimeCount++
            onTimeList.push({
              id: e.id,
              name: employeeName,
              department: departmentName,
              schedule: scheduleInfo,
              inTime: r?.inTime,
              outTime: r?.outTime
            })
          } else if (status === 'Late-In') {
            lateCount++
            lateList.push({
              id: e.id,
              name: employeeName,
              department: departmentName,
              schedule: scheduleInfo,
              inTime: r?.inTime,
              outTime: r?.outTime
            })
          }

          presentList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: r?.outTime,
            status: status
          })
        } else if (status === 'Absent') {
          absentCount++
          absentList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo
          })
        }
        // Ignore \"Shift Not Started\" from metrics
      }

      // Calculate additional metrics using the same results array
      let totalOvertimeHours = 0
      let totalWorkingHours = 0
      let punchOutMissingCount = 0
      const punchOutMissingList = []

      for (const result of results) {
        if (!result) continue

        const { status, reportData: r, employeeName, departmentName, scheduleInfo, employee: e } = result

        // Sum overtime hours (only for employees who worked)
        if (r && r.overtimeHours) {
          totalOvertimeHours += Number(r.overtimeHours) || 0
        }

        // Sum total working hours (regular + overtime = durationHours)
        if (r && r.durationHours) {
          totalWorkingHours += Number(r.durationHours) || 0
        }

        // Count and list punch out missing employees
        if (status === 'Punch Out Missing') {
          punchOutMissingCount++
          punchOutMissingList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: null
          })
        }
      }

      // Only update state if the user hasn't switched dates in the meantime
      if (toYMD(selectedDate) !== requestDateStr) {
        console.log(`[Metrics] Ignoring stale result for ${requestDateStr}, current date is ${toYMD(selectedDate)}`)
        return
      }

      setMetrics({
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        onTime: onTimeCount,
        totalOvertimeHours,
        totalWorkingHours,
        averageWorkHours: presentCount > 0 ? (totalWorkingHours / presentCount).toFixed(1) : 0,
        attendanceRate: employees.length > 0 ? Math.round((presentCount / employees.length) * 100) : 0,
        punchOutMissing: punchOutMissingCount
      })

      setTotalEmployees(employees.length)
      setLateEmployees(lateList)
      setAbsentEmployees(absentList)
      setOnTimeEmployees(onTimeList)
      setPresentEmployees(presentList)
      setPunchOutMissingEmployees(punchOutMissingList)

      // Safe update for department list
      for (const [departmentName, employees] of deptMap.entries()) {
        try {
          deptMap.set(departmentName, employees.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
        } catch (err) {
          console.error(`[DeptList] Error adding ${employeeName} to department list:`, err)
        }
      }

      // Convert map to sorted array
      const deptArray = Array.from(deptMap.entries())
        .map(([department, employees]) => {
          const present = employees.filter(e => ['On-Time', 'Late-In', 'Punch Out Missing', 'Present', 'Worked on Day Off', 'Out of Schedule'].includes(e.status)).length
          const late = employees.filter(e => e.status === 'Late-In').length
          const absent = employees.filter(e => e.status === 'Absent').length

          return {
            department,
            employees: employees.sort((a, b) => a.name.localeCompare(b.name)),
            summary: { present, late, absent, total: employees.length }
          }
        })
        .sort((a, b) => a.department.localeCompare(b.department))

      setDepartmentEmployees(deptArray)

    } catch (e) {
      console.error('[Metrics] Error:', e)
      if (!background) {
        showError(e.message || 'Failed to compute overview', 'Metrics error')
      }
    } finally {
      if (!background) setLoadingMetrics(false)
    }
  }, [selectedDate, settings])

  // Refresh data from Supabase (clears reports cache)
  const handleSync = useCallback(async (silent = false) => {
    // Prevent multiple simultaneous refreshes
    if (syncingRef.current) {
      return
    }

    let notificationId = null
    try {
      syncingRef.current = true
      setSyncing(true)

      if (!silent) {
        notificationId = showLoading('Refreshing dashboard data...', 'Update In Progress', { id: 'refreshing' })
      }

      const response = await fetch('/api/sync?refresh_only=true', { method: 'GET' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Refresh failed')
      }

      setLastSyncTime(new Date())

      if (!silent && notificationId) {
        updateNotification('refreshing', result.message || 'Data updated successfully', 'Success', 'success', { autoClose: 2000 })
      }

      // Refresh logs and metrics
      if (logsSearchQuery.trim() && allLogs.length > 0) {
        await fetchLogs(1, logsPerPage, true)
      } else {
        await fetchLogs(currentPage, logsPerPage, false)
      }
      await fetchMetrics()
    } catch (error) {
      console.error('[Refresh] Error:', error)
      if (!silent && notificationId) {
        updateNotification('refreshing', error.message || 'Failed to refresh data', 'Update Error', 'error', { autoClose: 4000 })
      }
    } finally {
      setSyncing(false)
      syncingRef.current = false
    }
  }, [currentPage, logsPerPage, logsSearchQuery, allLogs.length, selectedDate, fetchLogs, fetchMetrics])



  const fetchPendingLeaves = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/leave-requests?status=pending')
      const data = await res.json()
      setPendingLeaves(data.data || [])
    } catch (error) {
      console.error('Failed to fetch pending leaves:', error)
    }
  }, [])

  // Fetch company settings on mount and initialize date
  useEffect(() => {
    const initSettings = async () => {
      try {
        const response = await fetch('/api/hr/company-settings')
        const result = await response.json()
        const enabled = result.data?.working_day_enabled === 'true' || result.data?.working_day_enabled === true
        const startTime = result.data?.working_day_start_time || '09:00'

        // 1. First determine the effective date
        let effectiveDate = new Date()
        if (enabled) {
          const effectiveDayStr = getEffectiveWorkingDayDate(enabled, startTime)
          const todayCalendarStr = getPakistanNow().toISOString().slice(0, 10)

          if (effectiveDayStr !== todayCalendarStr) {
            console.log(`[INIT] Working day transition active. Effective Day: ${effectiveDayStr}`)
            effectiveDate = new Date(effectiveDayStr + 'T00:00:00Z')
          }
        }

        // 2. Set both state variables in one go to prevent partial render fetchings
        setSelectedDate(effectiveDate)
        setSettings({
          workingDayEnabled: enabled,
          workingDayStartTime: startTime
        })
        setSettingsLoaded(true)
      } catch (e) {
        console.error('Failed to load settings:', e)
        setSettingsLoaded(true)
      }
    }
    initSettings()
  }, [])

  // Auto-sync: Initial sync after 2 seconds, then every 5 minutes
  useEffect(() => {
    if (!settingsLoaded) return
    const initialTimer = setTimeout(() => {
      handleSync(true) // true = silent
    }, 2000)

    const interval = setInterval(() => {
      handleSync(true) // true = silent
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [handleSync, settingsLoaded])

  // Background metrics refresh every 2 minutes
  useEffect(() => {
    if (!settingsLoaded) return
    const interval = setInterval(() => {
      fetchMetrics(true) // true = background refresh
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [fetchMetrics, settingsLoaded])

  // Initial data load
  useEffect(() => {
    if (!settingsLoaded) return
    fetchLogs()
    fetchMetrics()
    fetchPendingLeaves()
  }, [fetchLogs, fetchMetrics, fetchPendingLeaves, settingsLoaded])

  // Fetch all logs when search query is entered
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (logsSearchQuery.trim()) {
        // When searching, fetch all logs
        fetchLogs(1, 50, true)
        setCurrentPage(1) // Reset to first page
      } else {
        // When search is cleared, go back to normal pagination
        if (allLogs.length > 0) {
          setAllLogs([])
          fetchLogs(1, 50, false)
          setCurrentPage(1)
        }
      }
    }, 300) // Debounce search to avoid too many requests

    return () => clearTimeout(searchTimeout)
  }, [logsSearchQuery])

  // Expand all departments by default when data loads
  useEffect(() => {
    if (departmentEmployees.length > 0 && Object.keys(expandedDepartments).length === 0) {
      const allExpanded = {}
      departmentEmployees.forEach(dept => {
        allExpanded[dept.department] = true
      })
      setExpandedDepartments(allExpanded)
    }
  }, [departmentEmployees, expandedDepartments])

  // Helper to format date/time
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp)
    return date.toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const coalesce = (val) => val || 'N/A'

  const getEmployeeName = (employee) => {
    if (!employee) return 'Unknown'

    if (Array.isArray(employee) && employee.length > 0) {
      employee = employee[0]
    }

    if (typeof employee === 'object' && employee !== null) {
      const firstName = employee.first_name || ''
      const lastName = employee.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()

      if (fullName) return fullName
      if (firstName) return firstName
    }

    return 'Unknown'
  }

  // Filter logs based on search query
  // Use allLogs if available (when searching), otherwise use logs (normal pagination)
  const logsToFilter = allLogs.length > 0 ? allLogs : logs
  // Memoize filtered logs to prevent re-filtering on every render
  const filteredLogs = useMemo(() => {
    const logsToFilter = allLogs.length > 0 ? allLogs : logs
    if (!logsSearchQuery.trim()) return logsToFilter

    const query = logsSearchQuery.toLowerCase()
    return logsToFilter.filter((log) => {
      const employeeName = getEmployeeName(log.employees).toLowerCase()
      const zkUserId = String(log.zk_user_id || '').toLowerCase()
      const department = String(log.department_name || '').toLowerCase()
      const punchText = String(log.punch_text || '').toLowerCase()
      const statusText = String(log.status_text || '').toLowerCase()
      const logTime = formatDateTime(log.log_time).toLowerCase()
      const syncedAt = formatDateTime(log.synced_at).toLowerCase()

      return (
        employeeName.includes(query) ||
        zkUserId.includes(query) ||
        department.includes(query) ||
        punchText.includes(query) ||
        statusText.includes(query) ||
        logTime.includes(query) ||
        syncedAt.includes(query)
      )
    })
  }, [allLogs, logs, logsSearchQuery])

  // Client-side pagination for filtered results
  const filteredTotalPages = useMemo(() =>
    Math.max(1, Math.ceil(filteredLogs.length / logsPerPage)),
    [filteredLogs]
  )

  const paginatedFilteredLogs = useMemo(() =>
    logsSearchQuery.trim()
      ? filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)
      : filteredLogs,
    [filteredLogs, currentPage, logsSearchQuery]
  )

  // Table rows for logs - memoized to prevent re-drawing the whole table
  const rows = useMemo(() => paginatedFilteredLogs.map((log) => {
    const employee = Array.isArray(log.employees) ? log.employees[0] : log.employees
    const employeeId = employee?.id
    const employeeName = getEmployeeName(log.employees)

    return (
      <Table.Tr key={log.id}>
        <Table.Td>{log.zk_user_id}</Table.Td>
        <Table.Td>
          {employeeId ? (
            <Link href={`/employees/${employeeId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <Text component="span" className="employee-name-link">
                {employeeName}
              </Text>
            </Link>
          ) : (
            employeeName
          )}
        </Table.Td>
        <Table.Td>{coalesce(log.department_name)}</Table.Td>
        <Table.Td>{formatDateTime(log.log_time)}</Table.Td>
        <Table.Td>{formatDateTime(log.synced_at)}</Table.Td>
      </Table.Tr>
    )
  }), [paginatedFilteredLogs])

  // Derived filtered department data - memoized
  const filteredDepartmentEmployees = useMemo(() => departmentEmployees.map(dept => ({
    ...dept,
    employees: dept.employees.filter(emp =>
      emp.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
      dept.department.toLowerCase().includes(globalSearchQuery.toLowerCase())
    )
  })).filter(dept => dept.employees.length > 0), [departmentEmployees, globalSearchQuery])

  // Auto-expand departments when searching
  useEffect(() => {
    if (globalSearchQuery.trim()) {
      const newExpanded = {}
      filteredDepartmentEmployees.forEach(dept => {
        newExpanded[dept.department] = true
      })
      setExpandedDepartments(newExpanded)
    }
  }, [globalSearchQuery])

  return (
    <Box
      style={{
        minHeight: '100vh',
      }}
    >
      {/* Real-time sync progress banner — polls queue-status every 3s, auto-hides when done */}
      <SyncProgressBanner onComplete={() => {
        // Trigger a soft re-fetch of today's attendance data once Edge Function finishes
        // This ensures the dashboard reflects the freshest data without a full page reload
        fetchAttendanceData && fetchAttendanceData()
      }} />
      <Container fluid pt={60} pb="xl" px={24}>
        {/* Header Section */}
        <Stack gap="lg" mb={30}>
          <Group justify="space-between" align="flex-end">
            <div>
              <Group gap="xs" mb={4}>
                <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
                  <IconFingerprint size={14} />
                </ThemeIcon>
                <Text c="dimmed" size="xs" fw={700} tt="uppercase" ls={1.5}>
                  Personnel Management System
                </Text>
              </Group>
              <Title order={1} style={{ fontWeight: 900, fontSize: '2.85rem', letterSpacing: '-1.5px', color: '#1a1b1e', lineHeight: 1.1 }}>
                HR Operations
              </Title>
              <Text size="sm" c="dimmed" fw={600}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              {lastSyncTime && (
                <Group gap={6} mt={4}>
                  <Indicator color="green" size={6} processing={syncing} offset={2}>
                    <IconRefresh size={14} className={syncing ? 'mantine-rotate' : ''} style={{ opacity: 0.6 }} />
                  </Indicator>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    Sync: {formatUTC12HourTime(lastSyncTime.toISOString())}
                  </Text>
                </Group>
              )}
            </div>
            <Group gap="md">
              <Paper withBorder p="xs" radius="md" style={{ background: '#f8f9fa', borderStyle: 'dashed' }}>
                <Group gap="sm" wrap="nowrap">
                  {toYMD(selectedDate) !== toYMD(new Date()) && (
                    <Badge variant="dot" color="orange" size="xs" styles={{ root: { border: 'none' } }}>WORKING DAY</Badge>
                  )}
                  <DatePickerInput
                    value={selectedDate}
                    onChange={setSelectedDate}
                    maxDate={new Date()}
                    leftSection={<IconCalendar size={16} />}
                    variant="unstyled"
                    size="sm"
                    w={130}
                    styles={{ input: { fontWeight: 700, padding: 0, minHeight: 'auto' } }}
                  />
                </Group>
              </Paper>
              <Button
                onClick={() => handleSync(false)}
                loading={syncing}
                leftSection={<IconRefresh size={18} />}
                size="md"
                radius="lg"
                color="blue"
                variant="filled"
                style={{
                  boxShadow: '0 8px 20px -4px rgba(34, 139, 230, 0.3)',
                  height: '48px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}
              >
                Sync Data
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Attendance Intelligence Grid */}
        <Grid gutter="xl" mb={40} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          {/* Main Attendance Pulse */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper withBorder p="xl" radius="lg" style={{
              background: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              height: '100%',
              border: '1px solid #eee'
            }}>
              <Stack gap="xl">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Title order={3} fw={850} style={{ letterSpacing: '-0.5px' }}>Daily Attendance Pulse</Title>
                    <Text size="sm" c="dimmed">Real-time status tracking and punctuality health</Text>
                  </div>
                  <Badge size="lg" radius="sm" variant="filled" color={metrics.attendanceRate > 85 ? 'teal' : 'orange'}>
                    {metrics.attendanceRate}% Staffing Rate
                  </Badge>
                </Group>

                <Grid grow>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <MetricCard
                      value={metrics.present}
                      label="Present"
                      description="Active now"
                      color="blue"
                      icon={IconUserCheck}
                      clickable
                      onClick={() => setPresentModalOpen(true)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <MetricCard
                      value={metrics.onTime}
                      label="On-Time"
                      description="Met schedule"
                      color="teal"
                      icon={IconClock}
                      clickable
                      onClick={() => setOnTimeModalOpen(true)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <MetricCard
                      value={metrics.late}
                      label="Delayed"
                      description="Arrived late"
                      color="orange"
                      icon={IconAlertCircle}
                      clickable
                      onClick={() => setLateModalOpen(true)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 6, sm: 3 }}>
                    <MetricCard
                      value={metrics.absent}
                      label="Absent"
                      description="No record"
                      color="red"
                      icon={IconUserX}
                      clickable
                      onClick={() => setAbsentModalOpen(true)}
                    />
                  </Grid.Col>
                </Grid>

                <Divider style={{ opacity: 0.6 }} />

                <Grid gutter="xl">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Group gap="md" align="center">
                      <ThemeIcon size={54} radius="md" color="violet" variant="light">
                        <IconBriefcase size={30} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={0.5}>Avg Shift Today</Text>
                        <Group gap={6} align="baseline">
                          <Text size="xl" fw={900} style={{ fontSize: '1.75rem' }}>{metrics.averageWorkHours}</Text>
                          <Text size="xs" fw={700} c="dimmed">HOURS / EMP</Text>
                        </Group>
                      </div>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Group gap="md" align="center">
                      <ThemeIcon size={54} radius="md" color="pink" variant="light">
                        <IconHourglassHigh size={30} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={0.5}>System Overtime</Text>
                        <Group gap={6} align="baseline">
                          <Text size="xl" fw={900} style={{ fontSize: '1.75rem' }}>{formatHoursMinutes(metrics.totalOvertimeHours)}</Text>
                          <Text size="xs" fw={700} c="dimmed">AGGREGATED</Text>
                        </Group>
                      </div>
                    </Group>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Management Shortcuts */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg" h="100%">
              <Card withBorder padding="xl" radius="lg" style={{
                flex: 1,
                border: '1px solid #eee',
                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)'
              }}>
                <Stack gap="xl">
                  <Group justify="space-between">
                    <div>
                      <Title order={4} fw={800}>Management</Title>
                      <Text size="xs" c="dimmed">Quick access tools</Text>
                    </div>
                    <ThemeIcon color="gray" variant="subtle">
                      <IconSettings size={18} />
                    </ThemeIcon>
                  </Group>

                  <Stack gap="sm">
                    <Button
                      fullWidth
                      variant="white"
                      color="blue"
                      size="md"
                      radius="md"
                      leftSection={<ThemeIcon size={24} radius="sm" color="blue" variant="light"><IconUsers size={14} /></ThemeIcon>}
                      component={Link}
                      href="/employees/manage"
                      styles={{
                        root: { border: '1px solid #eef2f6', height: '52px' },
                        inner: { justifyContent: 'flex-start' },
                        label: { fontSize: '15px', fontWeight: 600 }
                      }}
                    >
                      Employee Directory
                    </Button>
                    <Button
                      fullWidth
                      variant="white"
                      color="violet"
                      size="md"
                      radius="md"
                      leftSection={<ThemeIcon size={24} radius="sm" color="violet" variant="light"><IconCalendar size={14} /></ThemeIcon>}
                      component={Link}
                      href="/device-config"
                      styles={{
                        root: { border: '1px solid #eef2f6', height: '52px' },
                        inner: { justifyContent: 'flex-start' },
                        label: { fontSize: '15px', fontWeight: 600 }
                      }}
                    >
                      Shift Calendars
                    </Button>
                    <Indicator label={pendingLeaves.length} color="red" size={20} disabled={pendingLeaves.length === 0} offset={2} withBorder processing>
                      <Button
                        fullWidth
                        variant="white"
                        color="orange"
                        size="md"
                        radius="md"
                        leftSection={<ThemeIcon size={24} radius="sm" color="orange" variant="light"><IconAlertCircle size={14} /></ThemeIcon>}
                        onClick={() => setAlertsModalOpen(true)}
                        styles={{
                          root: { border: '1px solid #eef2f6', height: '52px' },
                          inner: { justifyContent: 'flex-start' },
                          label: { fontSize: '15px', fontWeight: 600 }
                        }}
                      >
                        Pending Requests
                      </Button>
                    </Indicator>
                  </Stack>

                  <Divider label={<Text size="xs" fw={700} c="dimmed">SUMMARY</Text>} labelPosition="center" />

                  <Grid gutter="sm">
                    <Grid.Col span={6}>
                      <Paper withBorder p="md" radius="md" ta="center" style={{ background: 'white' }}>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Workforce</Text>
                        <Text size="xl" fw={900} c="indigo">{totalEmployees}</Text>
                      </Paper>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Paper withBorder p="md" radius="md" ta="center" style={{ background: 'white', cursor: 'pointer' }} onClick={() => setPunchOutMissingModalOpen(true)}>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={4}>Missed Out</Text>
                        <Text size="xl" fw={900} c="yellow">{metrics.punchOutMissing}</Text>
                      </Paper>
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>



        {/* Tabs for Status by Department and Attendance Logs */}
        <UniversalTabs value={activeTab} onChange={setActiveTab}>
          <UniversalTabs.List>
            <UniversalTabs.Tab value="status">Employee Status by Department</UniversalTabs.Tab>
            <UniversalTabs.Tab value="logs">Recent Attendance Logs</UniversalTabs.Tab>
          </UniversalTabs.List>

          <UniversalTabs.Panel value="status" pt="xl" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 800px' }}>
            <Stack gap="lg">
              <Group justify="space-between" align="center" mb="xs">
                <div>
                  <Text fw={800} size="lg">Departmental Overview</Text>
                  <Text size="xs" c="dimmed" fw={500}>Live status of personnel across all units</Text>
                </div>
                <TextInput
                  placeholder="Seach personnel or unit..."
                  leftSection={<IconSearch size={14} />}
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.currentTarget.value)}
                  size="xs"
                  radius="md"
                  w={280}
                  styles={{
                    input: {
                      backgroundColor: 'white',
                      border: '1px solid #eee',
                      fontWeight: 600
                    }
                  }}
                />
              </Group>

              <Stack gap="lg">
                {metricsLoading ? (
                  <Paper withBorder p="xl" radius="lg" ta="center">
                    <Stack align="center" gap="sm">
                      <IconRefresh size={32} className="mantine-rotate" color="gray" />
                      <Text c="dimmed" fw={500}>Updating employee status records...</Text>
                    </Stack>
                  </Paper>
                ) : filteredDepartmentEmployees.length === 0 ? (
                  <Paper withBorder p="xl" radius="lg" ta="center">
                    <Stack align="center" gap="xs">
                      <IconUserX size={40} color="var(--mantine-color-gray-4)" />
                      <Text c="dimmed" fw={600}>No personnel found matching &quot;{globalSearchQuery}&quot;</Text>
                      <Button variant="subtle" size="xs" onClick={() => setGlobalSearchQuery('')}>Clear search</Button>
                    </Stack>
                  </Paper>
                ) : (
                  <DepartmentStatusGrid
                    departmentData={filteredDepartmentEmployees}
                    expandedDepartments={expandedDepartments}
                    setExpandedDepartments={setExpandedDepartments}
                  />
                )}
              </Stack>
            </Stack>
          </UniversalTabs.Panel>

          {/* Stat Detail Modals - REDESIGNED */}
          {[
            {
              open: lateModalOpen,
              set: setLateModalOpen,
              data: lateEmployees,
              title: 'Personnel Late-In',
              subtitle: 'Team members arriving after scheduled threshold',
              icon: <IconClock size={24} />,
              color: 'orange'
            },
            {
              open: absentModalOpen,
              set: setAbsentModalOpen,
              data: absentEmployees,
              title: 'Personnel Absent',
              subtitle: 'No attendance activity recorded for today',
              icon: <IconUserX size={24} />,
              color: 'red'
            },
            {
              open: onTimeModalOpen,
              set: setOnTimeModalOpen,
              data: onTimeEmployees,
              title: 'Personnel On-Time',
              subtitle: 'Optimal punctuality threshold achieved',
              icon: <IconUserCheck size={24} />,
              color: 'teal'
            },
            {
              open: presentModalOpen,
              set: setPresentModalOpen,
              data: presentEmployees,
              title: 'Total Personnel Present',
              subtitle: 'Consolidated report of all active onsite personnel',
              icon: <IconUsers size={24} />,
              color: 'blue'
            },
            {
              open: punchOutMissingModalOpen,
              set: setPunchOutMissingModalOpen,
              data: punchOutMissingEmployees,
              title: 'Missing Punch-Out',
              subtitle: 'Active sessions requiring terminal synchronization',
              icon: <IconAlertCircle size={24} />,
              color: 'yellow'
            }
          ].map((modal) => (
            <Modal
              key={modal.title}
              opened={modal.open}
              onClose={() => modal.set(false)}
              size="1000px"
              radius="32px"
              padding="32px"
              title={
                <Group gap="md">
                  <ThemeIcon variant="light" color={modal.color} size="xl" radius="md">
                    {modal.icon}
                  </ThemeIcon>
                  <Box>
                    <Text fw={900} size="xl" ls={-0.5}>{modal.title}</Text>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={0.5}>{modal.subtitle}</Text>
                  </Box>
                </Group>
              }
              styles={{
                content: {
                  backgroundColor: '#ffffff',
                  boxShadow: '0 30px 60px -10px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(0,0,0,0.08)'
                },
                header: { paddingBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.05)' }
              }}
            >
              {modal.data.length === 0 ? (
                <Center py={60}>
                  <Stack align="center" gap="xs">
                    <ThemeIcon variant="light" color="gray" size={60} radius="xl">
                      <IconSearch size={30} stroke={1.5} />
                    </ThemeIcon>
                    <Text fw={700} c="dimmed">No Personnel Records</Text>
                    <Text size="sm" c="dimmed">Data is synchronized and up-to-date.</Text>
                  </Stack>
                </Center>
              ) : (
                <ScrollArea.Autosize maxHeight="70vh" offsetScrollbars>
                  <Grid gutter="xs" pt="md">
                    {modal.data.map((emp) => (
                      <Grid.Col key={emp.id} span={{ base: 12, sm: 6 }}>
                        <Paper
                          p="md"
                          radius="lg"
                          withBorder
                          component={Link}
                          href={`/employees/${emp.id}`}
                          onClick={() => modal.set(false)}
                          style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all 0.15s ease',
                            backgroundColor: '#fafafa',
                          }}
                          className="hover-card-minimal"
                        >
                          <Group gap="md" wrap="nowrap">
                            <Avatar
                              size="md"
                              radius="md"
                              color={modal.color}
                              variant="light"
                              fw={800}
                            >
                              {emp.name?.[0]}
                            </Avatar>
                            <Box style={{ flex: 1 }}>
                              <Group justify="space-between" mb={4} wrap="nowrap">
                                <Text fw={700} size="sm" truncate>{emp.name}</Text>
                                {emp.status && (
                                  <Badge
                                    size="xs"
                                    variant="filled"
                                    color={
                                      emp.status === 'On-Time' || emp.status === 'Present' || emp.status === 'Worked on Day Off' ? 'teal.7' :
                                        emp.status === 'Late-In' ? 'orange.8' :
                                          emp.status === 'Punch Out Missing' ? 'yellow.8' : 'gray.6'
                                    }
                                    radius="sm"
                                  >
                                    {emp.status}
                                  </Badge>
                                )}
                              </Group>

                              <Group gap={8} align="center">
                                <Text size="xs" c="dimmed" fw={600}>{emp.department}</Text>
                                <Divider orientation="vertical" h={10} />
                                <Text size="xs" c="dimmed" fw={600}>{emp.schedule}</Text>
                              </Group>

                              {(emp.inTime || emp.outTime) && (
                                <Group gap={4} mt={8}>
                                  {emp.inTime && (
                                    <Group gap={4} px={8} py={2} bg="white" style={{ borderRadius: '4px', border: '1px solid #eee' }}>
                                      <Text size="9px" fw={800} c="blue.8" tt="uppercase">In</Text>
                                      <Text size="xs" ff="monospace" fw={600}>{formatUTC12HourTime(emp.inTime)}</Text>
                                    </Group>
                                  )}
                                  {emp.outTime && (
                                    <Group gap={4} px={8} py={2} bg="white" style={{ borderRadius: '4px', border: '1px solid #eee' }}>
                                      <Text size="9px" fw={800} c="gray.7" tt="uppercase">Out</Text>
                                      <Text size="xs" ff="monospace" fw={600}>{formatUTC12HourTime(emp.outTime)}</Text>
                                    </Group>
                                  )}
                                </Group>
                              )}
                            </Box>
                          </Group>
                        </Paper>
                      </Grid.Col>
                    ))}
                  </Grid>
                </ScrollArea.Autosize>
              )}
            </Modal>
          ))}


          <UniversalTabs.Panel value="logs" pt="xl">
            <Stack gap="lg">
              <Paper withBorder p="xl" radius="lg" style={{ background: 'white' }}>
                <Stack gap="xl">
                  <Group justify="space-between" align="center">
                    <div>
                      <Title order={3} fw={850} style={{ letterSpacing: '-0.5px' }}>Raw Attendance Data</Title>
                      <Text size="sm" c="dimmed">Sequential log of all biometric terminal events</Text>
                    </div>
                    <Group gap="sm">
                      <TextInput
                        placeholder="Filter by name, ID, or status..."
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        value={logsSearchQuery}
                        onChange={(e) => setLogsSearchQuery(e.currentTarget.value)}
                        size="md"
                        radius="md"
                        w={350}
                        styles={{ input: { background: '#f8f9fa' } }}
                      />
                    </Group>
                  </Group>

                  {logsSearchQuery && (
                    <Text size="xs" fw={700} c="blue" tt="uppercase" ls={1}>
                      Filtered View: Found {filteredLogs.length} entries matching &quot;{logsSearchQuery}&quot;
                    </Text>
                  )}

                  <Box style={{ position: 'relative' }}>
                    <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} zIndex={10} />
                    <UniversalTable>
                      <UniversalTable.Thead>
                        <Table.Tr>
                          <Table.Th>Ref ID</Table.Th>
                          <Table.Th>Personnel</Table.Th>
                          <Table.Th>Unit</Table.Th>
                          <Table.Th>Event Time</Table.Th>
                          <Table.Th>Action</Table.Th>
                          <Table.Th>Sync Hash</Table.Th>
                        </Table.Tr>
                      </UniversalTable.Thead>
                      <UniversalTable.Tbody>
                        {rows.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Stack align="center" py="xl" gap="xs">
                                <Text fw={600} c="dimmed">No log data found</Text>
                                <Text size="xs" c="dimmed">Try adjusting your filters or syncing the device.</Text>
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          paginatedFilteredLogs.map((log) => {
                            const employee = Array.isArray(log.employees) ? log.employees[0] : log.employees
                            const employeeName = getEmployeeName(log.employees)
                            const initials = employeeName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

                            return (
                              <Table.Tr key={log.id}>
                                <Table.Td><Text size="xs" ff="monospace" c="dimmed">{log.zk_user_id}</Text></Table.Td>
                                <Table.Td>
                                  <Group gap="sm">
                                    <ThemeIcon size={28} radius="xl" variant="light" color="indigo">
                                      <Text size="xs" fw={700}>{initials}</Text>
                                    </ThemeIcon>
                                    <Link href={employee?.id ? `/employees/${employee.id}` : '#'} style={{ color: 'inherit', textDecoration: 'none' }}>
                                      <Text fw={600} size="sm" className="employee-name-link">
                                        {employeeName}
                                      </Text>
                                    </Link>
                                  </Group>
                                </Table.Td>
                                <Table.Td><Text size="sm" fw={500}>{coalesce(log.department_name)}</Text></Table.Td>
                                <Table.Td><Text size="sm" fw={600} ff="monospace">{formatDateTime(log.log_time)}</Text></Table.Td>
                                <Table.Td>
                                  <Badge
                                    variant="outline"
                                    radius="sm"
                                    color={log.punch_text?.toLowerCase().includes('in') ? 'blue' : 'gray'}
                                    size="sm"
                                    fw={700}
                                  >
                                    {coalesce(log.punch_text)}
                                  </Badge>
                                </Table.Td>
                                <Table.Td><Text size="xs" c="dimmed" ff="monospace">{formatDateTime(log.synced_at)}</Text></Table.Td>
                              </Table.Tr>
                            )
                          })
                        )}
                      </UniversalTable.Tbody>
                    </UniversalTable>
                  </Box>

                  <Group justify="space-between" mt="xl">
                    <Text size="xs" c="dimmed" fw={500}>
                      Showing page {currentPage} of {logsSearchQuery.trim() ? filteredTotalPages : totalPages}
                    </Text>
                    <Pagination
                      total={logsSearchQuery.trim() ? filteredTotalPages : totalPages}
                      value={currentPage}
                      onChange={(p) => {
                        setCurrentPage(p)
                        if (!logsSearchQuery.trim()) {
                          fetchLogs(p, logsPerPage, false)
                        }
                      }}
                      radius="md"
                      size="sm"
                    />
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </UniversalTabs.Panel>
        </UniversalTabs >



        {/* Alerts Modal */}
        < Modal
          opened={alertsModalOpen}
          onClose={() => setAlertsModalOpen(false)}
          title={< Text fw={600} size="lg" > Pending Alerts</Text >}
          size="lg"
          styles={{
            body: { padding: 'var(--mantine-spacing-lg)' },
          }}
        >
          <Stack>
            {pendingLeaves.length > 0 ? (
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Pending Leave Requests</Text>
                  <Badge color="red" size="sm" circle>{pendingLeaves.length}</Badge>
                </Group>
                {pendingLeaves.map(request => (
                  <Paper
                    key={request.id}
                    withBorder
                    p="md"
                    radius="md"
                    component={Link}
                    href="/leave-management?tab=requests"
                    onClick={() => setAlertsModalOpen(false)}
                    style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit', transition: 'all 0.2s' }}
                    className="hover-paper"
                  >
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm">
                        <div>
                          <Text fw={600} size="sm">{request.employee?.first_name} {request.employee?.last_name}</Text>
                          <Text size="xs" c="dimmed">{request.employee?.department?.name}</Text>
                        </div>
                      </Group>
                      <Badge color="yellow" variant="light">Pending</Badge>
                    </Group>
                    <Group mt="xs" gap="xs">
                      <Badge variant="dot" color="blue" size="sm">{request.leave_types?.name}</Badge>
                      <Text size="xs" c="dimmed">•</Text>
                      <Text size="xs" fw={500}>{request.total_days} Day{request.total_days !== 1 ? 's' : ''}</Text>
                      <Text size="xs" c="dimmed">•</Text>
                      <Text size="xs">{request.start_date} to {request.end_date}</Text>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Stack align="center" py="xl">
                <IconAlertCircle size={48} color="var(--mantine-color-gray-3)" />
                <Text c="dimmed" ta="center">No pending alerts</Text>
              </Stack>
            )}
          </Stack>
        </Modal >
      </Container >
    </Box >
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <Dashboard />
    </ThemeProvider>
  )
}
