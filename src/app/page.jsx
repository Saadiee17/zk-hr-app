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
  TextInput
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
  IconCalendar
} from '@tabler/icons-react'
import { showError, showLoading, updateNotification } from '@/utils/notifications'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import { DatePickerInput } from '@mantine/dates'
import { formatHoursMinutes, toYMD } from '@/utils/attendanceUtils'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppShellWrapper } from '@/components/AppShellWrapper'
import { MetricCard } from '@/components/shared/MetricCard'

function Dashboard() {
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

  // State for department collapse
  const [expandedDepartments, setExpandedDepartments] = useState({})

  // State for search and tabs
  const [logsSearchQuery, setLogsSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('status')
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Fetch attendance logs with pagination
  const fetchLogs = async (page = 1, limit = 50, fetchAll = false) => {
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
  }

  // Sync data from Python Bridge
  const handleSync = useCallback(async (silent = false) => {
    // Prevent multiple simultaneous syncs
    if (syncingRef.current) {
      return
    }

    try {
      syncingRef.current = true
      setSyncing(true)

      const notificationId = !silent ? showLoading('Fetching attendance from device...', 'Syncing data', { id: 'syncing' }) : null

      const response = await fetch('/api/sync', { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      setLastSyncTime(new Date())

      if (!silent && notificationId) {
        updateNotification('syncing', result.message || 'Data synced successfully', 'Success', 'success', { autoClose: 2000 })
      }

      // Refresh logs after successful sync
      // If searching, refresh all logs; otherwise refresh current page
      if (logsSearchQuery.trim() && allLogs.length > 0) {
        await fetchLogs(1, logsPerPage, true)
      } else {
        await fetchLogs(currentPage, logsPerPage, false)
      }
      await fetchMetrics()
    } catch (error) {
      console.error('[Sync] Error:', error)
      if (!silent && notificationId) {
        updateNotification('syncing', error.message || 'Failed to sync data', 'Sync Error', 'error', { autoClose: 4000 })
      }
    } finally {
      setSyncing(false)
      syncingRef.current = false
    }
  }, [currentPage, logsPerPage, logsSearchQuery, allLogs.length])

  // Fetch dashboard metrics using API (single source of truth!)
  const fetchMetrics = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoadingMetrics(true)
      }

      // Fetch company working day settings
      const settingsResponse = await fetch('/api/hr/company-settings')
      const settingsResult = await settingsResponse.json()
      const workingDayEnabled = settingsResult.data?.working_day_enabled || false
      const workingDayStartTime = settingsResult.data?.working_day_start_time || '10:00'

      // Get current date in Pakistan timezone (UTC+5)
      const now = new Date()
      const pakistanOffset = 5 * 60 * 60 * 1000
      const pakistanNow = new Date(now.getTime() + pakistanOffset)

      // Determine if selected date is "today" (compare YMD)
      const isToday = toYMD(selectedDate) === toYMD(now)

      // Determine the "effective working day" based on company settings
      let effectiveDateStr
      let yesterdayDateStr

      if (isToday) {
        effectiveDateStr = pakistanNow.toISOString().slice(0, 10)
        yesterdayDateStr = new Date(pakistanNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

        if (workingDayEnabled) {
          // Parse working day start time (e.g., "10:00")
          const [startHour, startMinute] = workingDayStartTime.split(':').map(Number)
          const currentHour = pakistanNow.getUTCHours()
          const currentMinute = pakistanNow.getUTCMinutes()
          const currentTimeMinutes = currentHour * 60 + currentMinute
          const workingDayStartMinutes = startHour * 60 + startMinute

          // If current time is before working day start, we're still on yesterday's working day
          if (currentTimeMinutes < workingDayStartMinutes) {
            effectiveDateStr = yesterdayDateStr
            console.log(`[Metrics] Before working day start (${workingDayStartTime}), using yesterday's working day: ${effectiveDateStr}`)
          } else {
            console.log(`[Metrics] After working day start (${workingDayStartTime}), using today's working day: ${effectiveDateStr}`)
          }
        }
      } else {
        // Use selected date directly
        effectiveDateStr = toYMD(selectedDate)
        const selDate = new Date(selectedDate)
        const prevDate = new Date(selDate)
        prevDate.setDate(prevDate.getDate() - 1)
        yesterdayDateStr = toYMD(prevDate)
        console.log(`[Metrics] Using selected date: ${effectiveDateStr}`)
      }

      const pakistanDateStr = effectiveDateStr
      const pakistanYesterdayStr = yesterdayDateStr

      console.log(`[Metrics] Fetching for Effective Date: ${pakistanDateStr}, Previous Day: ${pakistanYesterdayStr}`)

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

        // Status logic: Use effective working day's data
        // Note: If we're before working day start, effectiveDateStr is yesterday's date
        // so todayRow will actually contain yesterday's data
        let status = 'Absent'
        let relevantRow = null

        if (todayRow && todayRow.status) {
          // Use the effective date's status
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
          // If someone from the previous day hasn't clocked out, show that
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
          yesterdayReportData: yesterdayRow ? {
            date: yesterdayRow.date,
            inTime: yesterdayRow.inTime,
            outTime: yesterdayRow.outTime,
            durationHours: yesterdayRow.durationHours,
            regularHours: yesterdayRow.regularHours,
            overtimeHours: yesterdayRow.overtimeHours,
            status: yesterdayRow.status,
          } : null,
          employeeName,
          departmentName,
          scheduleInfo,
          status: status
        }
      })

      // Calculate metrics using API statuses (single source of truth!)
      let presentCount = 0
      let lateCount = 0
      let absentCount = 0
      let onTimeCount = 0
      const lateList = []
      const absentList = []
      const onTimeList = []
      const presentList = []

      for (const result of results) {
        if (!result) continue

        const { status, reportData: r, employeeName, departmentName, scheduleInfo, employee: e } = result

        // ✅ Use API status directly - no duplicate calculation logic!
        if (status === 'On-Time') {
          presentCount++
          onTimeCount++
          onTimeList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: r?.outTime
          })
          presentList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: r?.outTime,
            status: 'On-Time'
          })
        } else if (status === 'Late-In') {
          presentCount++
          lateCount++
          lateList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: r?.outTime
          })
          presentList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: r?.outTime,
            status: 'Late-In'
          })
        } else if (status === 'Punch Out Missing') {
          presentCount++ // Still working
          presentList.push({
            id: e.id,
            name: employeeName,
            department: departmentName,
            schedule: scheduleInfo,
            inTime: r?.inTime,
            outTime: null,
            status: 'Punch Out Missing'
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
        // Ignore "Shift Not Started" from metrics
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

      // Round to 2 decimal places
      totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100
      totalWorkingHours = Math.round(totalWorkingHours * 100) / 100

      setTotalEmployees(employees.length)
      setMetrics({
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        onTime: onTimeCount,
        totalOvertimeHours,
        totalWorkingHours,
        punchOutMissing: punchOutMissingCount
      })
      setLateEmployees(lateList)
      setAbsentEmployees(absentList)
      setOnTimeEmployees(onTimeList)
      setPresentEmployees(presentList)
      setPunchOutMissingEmployees(punchOutMissingList)

      // Build department-wise employee list - SIMPLIFIED!
      // ✅ REUSE the same API results - single source of truth!
      const deptMap = new Map()

      for (const result of results) {
        if (!result) continue

        try {
          const { status, reportData: r, employeeName, departmentName, scheduleInfo, employee: e } = result

          // Group by department
          if (!deptMap.has(departmentName)) {
            deptMap.set(departmentName, [])
          }

          // Add employee to department list with API status
          deptMap.get(departmentName).push({
            id: e.id,
            name: employeeName,
            employeeId: e.employee_id || 'N/A',
            status: status, // ← FROM API! Same calculation as status badges ✅
            inTime: r?.inTime || null,
            schedule: scheduleInfo
          })
        } catch (err) {
          console.error(`[DeptList] Error adding ${employeeName} to department list:`, err)
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

    } catch (e) {
      console.error('[Metrics] Error:', e)
      if (!background) {
        showError(e.message || 'Failed to compute overview', 'Metrics error')
      }
    } finally {
      setLoadingMetrics(false)
    }
  }, [selectedDate])

  // Auto-sync: Initial sync after 2 seconds, then every 5 minutes
  useEffect(() => {
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
  }, [handleSync])

  // Background metrics refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(true) // true = background refresh
    }, 2 * 60 * 1000) // 2 minutes

    return () => clearInterval(interval)
  }, [fetchMetrics])

  // Initial data load
  useEffect(() => {
    fetchLogs()
    fetchMetrics()
  }, [fetchMetrics])

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
  const filteredLogs = logsToFilter.filter((log) => {
    if (!logsSearchQuery.trim()) return true

    const query = logsSearchQuery.toLowerCase()
    const employee = Array.isArray(log.employees) ? log.employees[0] : log.employees
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

  // Client-side pagination for filtered results
  const filteredTotalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
  const paginatedFilteredLogs = logsSearchQuery.trim()
    ? filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)
    : filteredLogs

  // Table rows for logs
  const rows = paginatedFilteredLogs.map((log) => {
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
        <Table.Td>{coalesce(log.punch_text)}</Table.Td>
        <Table.Td>{formatDateTime(log.synced_at)}</Table.Td>
      </Table.Tr>
    )
  })

  return (
    <Box
      style={{
        minHeight: '100vh',
      }}
    >
      <Container size="xl" mx="auto" py="md">
        {/* Header Section */}
        <Stack gap="lg" mb={30}>
          <Group justify="space-between" align="flex-end">
            <div>
              <Text c="dimmed" size="sm" fw={500} mb={4} tt="uppercase" ls={1}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Title order={1} style={{ fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-1px', color: '#2d3436' }}>
                Good Morning, Admin
              </Title>
              {lastSyncTime && (
                <Group gap={6} mt={4}>
                  <IconRefresh size={14} className={syncing ? 'mantine-rotate' : ''} style={{ opacity: 0.5 }} />
                  <Text size="sm" c="dimmed">
                    Last synced: {formatUTC12HourTime(lastSyncTime.toISOString())}
                  </Text>
                </Group>
              )}
            </div>
            <Group gap="sm">
              <DatePickerInput
                value={selectedDate}
                onChange={setSelectedDate}
                maxDate={new Date()}
                leftSection={<IconCalendar size={16} />}
                size="md"
                w={150}
                clearable={false}
                styles={{
                  input: {
                    fontWeight: 500,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}
              />
              <Button
                onClick={() => handleSync(false)}
                loading={syncing}
                leftSection={<IconRefresh size={18} />}
                size="md"
                radius="md"
                color="dark"
                variant="filled"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                Sync Data
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Bento Grid Layout */}
        <Grid gutter="lg" mb={30}>
          {/* Primary Stats Row */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <MetricCard
              value={metrics.present}
              label="Present"
              description="Checked in today"
              color="blue"
              icon={IconUserCheck}
              clickable
              onClick={() => setPresentModalOpen(true)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <MetricCard
              value={metrics.onTime}
              label="On Time"
              description="Arrived on schedule"
              color="teal"
              icon={IconClock}
              clickable
              onClick={() => setOnTimeModalOpen(true)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <MetricCard
              value={metrics.late}
              label="Late In"
              description="Arrived after start time"
              color="orange"
              icon={IconAlertCircle}
              clickable
              onClick={() => setLateModalOpen(true)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <MetricCard
              value={metrics.absent}
              label="Absent"
              description="Not checked in"
              color="red"
              icon={IconUserX}
              clickable
              onClick={() => setAbsentModalOpen(true)}
            />
          </Grid.Col>

          {/* Secondary Stats Row - Bento Style */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card
              padding="lg"
              radius="lg"
              style={{
                height: '100%',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Group justify="space-between" mb="md">
                <Title order={4}>Quick Actions</Title>
                <IconBriefcase size={20} color="gray" />
              </Group>
              <Grid>
                <Grid.Col span={4}>
                  <Button fullWidth variant="light" color="blue" h={80} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} component={Link} href="/employees/manage">
                    <IconUsers size={24} />
                    Manage Employees
                  </Button>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Button fullWidth variant="light" color="violet" h={80} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} component={Link} href="/device-config">
                    <IconCalendar size={24} />
                    View Schedule
                  </Button>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Button fullWidth variant="light" color="orange" h={80} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={() => setPunchOutMissingModalOpen(true)}>
                    <IconAlertCircle size={24} />
                    Review Alerts
                  </Button>
                </Grid.Col>
              </Grid>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              <MetricCard
                value={totalEmployees}
                label="Total Workforce"
                color="indigo"
                icon={IconUsers}
                size="md"
              />
              <Group grow>
                <MetricCard
                  value={formatHoursMinutes(metrics.totalWorkingHours || 0)}
                  label="Work Hrs"
                  color="grape"
                  icon={IconBriefcase}
                  size="sm"
                />
                <MetricCard
                  value={formatHoursMinutes(metrics.totalOvertimeHours || 0)}
                  label="Overtime"
                  color="pink"
                  icon={IconHourglassHigh}
                  size="sm"
                />
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <MetricCard
              value={metrics.punchOutMissing || 0}
              label="Missing Out"
              description="Forgot to clock out"
              color="yellow"
              icon={IconAlertCircle}
              clickable
              onClick={() => setPunchOutMissingModalOpen(true)}
            />
          </Grid.Col>
        </Grid>


        {/* Refresh Controls - Compact */}
        <Paper withBorder p="sm" radius="lg" style={{ background: 'var(--mantine-color-gray-0)' }}>
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Text size="sm" fw={500} c="dimmed">Auto-refresh: Every 2 minutes</Text>
              <Badge size="sm" variant="dot" color="green">Active</Badge>
            </Group>
            <Button
              onClick={() => fetchMetrics(false)}
              loading={metricsLoading}
              leftSection={<IconRefresh size={14} />}
              variant="light"
              size="xs"
            >
              Refresh Now
            </Button>
          </Group>
        </Paper>

        {/* Tabs for Status by Department and Attendance Logs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="status">Employee Status by Department</Tabs.Tab>
            <Tabs.Tab value="logs">Recent Attendance Logs</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="status" pt="md">
            <Paper withBorder p="md" radius="lg">
              <Stack gap="md">
                <div>
                  <Title order={3} mb={4}>Employee Status by Department</Title>
                  <Text size="sm" c="dimmed">Real-time attendance overview (same calculation as badges above ✅)</Text>
                </div>

                {metricsLoading ? (
                  <Text c="dimmed" ta="center" py="md">Loading employee status...</Text>
                ) : departmentEmployees.length === 0 ? (
                  <Text c="dimmed" ta="center" py="md">No employee data available</Text>
                ) : (
                  <Stack gap="sm">
                    {departmentEmployees.map((dept) => (
                      <Card key={dept.department} withBorder radius="md">
                        <Group
                          justify="space-between"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setExpandedDepartments(prev => ({
                              ...prev,
                              [dept.department]: !prev[dept.department]
                            }))
                          }}
                        >
                          <div>
                            <Text fw={600} size="lg">{dept.department}</Text>
                            <Text size="sm" c="dimmed">{dept.employees.length} employees</Text>
                          </div>
                          <ActionIcon variant="subtle" size="lg">
                            {expandedDepartments[dept.department] ?
                              <IconChevronUp size={20} /> :
                              <IconChevronDown size={20} />
                            }
                          </ActionIcon>
                        </Group>

                        <Collapse in={expandedDepartments[dept.department]}>
                          <div style={{ marginTop: '1rem' }}>
                            <Table
                              striped
                              highlightOnHover
                              style={{ tableLayout: 'fixed', width: '100%' }}
                            >
                              <colgroup>
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '30%' }} />
                              </colgroup>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Name</Table.Th>
                                  <Table.Th>Schedule</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                  <Table.Th>Login Time</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {dept.employees.map((emp) => {
                                  let badgeColor = 'gray'
                                  if (emp.status === 'On-Time') badgeColor = 'green'
                                  else if (emp.status === 'Late-In') badgeColor = 'orange'
                                  else if (emp.status === 'Absent') badgeColor = 'red'
                                  else if (emp.status === 'Shift Not Started') badgeColor = 'blue'
                                  else if (emp.status === 'Punch Out Missing') badgeColor = 'yellow'
                                  else if (emp.status === 'Out of Schedule') badgeColor = 'grape'

                                  return (
                                    <Table.Tr key={emp.id}>
                                      <Table.Td>
                                        <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                          <Text component="span" className="employee-name-link">
                                            {emp.name}
                                          </Text>
                                        </Link>
                                      </Table.Td>
                                      <Table.Td>
                                        <Text size="sm">{emp.schedule}</Text>
                                      </Table.Td>
                                      <Table.Td>
                                        <Badge color={badgeColor} variant="light">
                                          {emp.status}
                                        </Badge>
                                      </Table.Td>
                                      <Table.Td>
                                        <Text size="sm">
                                          {emp.inTime ? formatUTC12HourTime(emp.inTime) : 'No punch'}
                                        </Text>
                                      </Table.Td>
                                    </Table.Tr>
                                  )
                                })}
                              </Table.Tbody>
                            </Table>
                          </div>
                        </Collapse>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* Modals for Late, Absent, and On-Time Employees */}
          <Modal
            opened={lateModalOpen}
            onClose={() => setLateModalOpen(false)}
            title={
              <Text fw={600} size="lg">Employees Late-In Today</Text>
            }
            size="xl"
            styles={{
              body: { padding: 'var(--mantine-spacing-lg)' },
              content: { maxWidth: '1000px' }
            }}
          >
            {lateEmployees.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl" size="lg">No late employees</Text>
            ) : (
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders={false}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: '150px' }}>Name</Table.Th>
                    <Table.Th style={{ minWidth: '120px' }}>Department</Table.Th>
                    <Table.Th style={{ minWidth: '100px' }}>Schedule</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-In Time</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-Out Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lateEmployees.map((emp) => (
                    <Table.Tr key={emp.id}>
                      <Table.Td>
                        <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Text component="span" className="employee-name-link" fw={500}>
                            {emp.name}
                          </Text>
                        </Link>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.department}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.schedule}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace" c="dimmed">
                          {emp.outTime ? formatUTC12HourTime(emp.outTime) : 'Still Working'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Modal>

          <Modal
            opened={absentModalOpen}
            onClose={() => setAbsentModalOpen(false)}
            title={
              <Text fw={600} size="lg">Employees Absent Today</Text>
            }
            size="xl"
            styles={{
              body: { padding: 'var(--mantine-spacing-lg)' },
              content: { maxWidth: '900px' }
            }}
          >
            {absentEmployees.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl" size="lg">No absent employees</Text>
            ) : (
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders={false}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: '150px' }}>Name</Table.Th>
                    <Table.Th style={{ minWidth: '120px' }}>Department</Table.Th>
                    <Table.Th style={{ minWidth: '100px' }}>Schedule</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {absentEmployees.map((emp) => (
                    <Table.Tr key={emp.id}>
                      <Table.Td>
                        <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Text component="span" className="employee-name-link" fw={500}>
                            {emp.name}
                          </Text>
                        </Link>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.department}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.schedule}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Modal>

          <Modal
            opened={onTimeModalOpen}
            onClose={() => setOnTimeModalOpen(false)}
            title={
              <Text fw={600} size="lg">Employees On-Time Today</Text>
            }
            size="xl"
            styles={{
              body: { padding: 'var(--mantine-spacing-lg)' },
              content: { maxWidth: '1000px' }
            }}
          >
            {onTimeEmployees.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl" size="lg">No on-time employees</Text>
            ) : (
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders={false}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: '150px' }}>Name</Table.Th>
                    <Table.Th style={{ minWidth: '120px' }}>Department</Table.Th>
                    <Table.Th style={{ minWidth: '100px' }}>Schedule</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-In Time</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-Out Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {onTimeEmployees.map((emp) => (
                    <Table.Tr key={emp.id}>
                      <Table.Td>
                        <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Text component="span" className="employee-name-link" fw={500}>
                            {emp.name}
                          </Text>
                        </Link>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.department}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.schedule}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace" c="dimmed">
                          {emp.outTime ? formatUTC12HourTime(emp.outTime) : 'Still Working'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Modal>

          <Modal
            opened={presentModalOpen}
            onClose={() => setPresentModalOpen(false)}
            title={
              <Text fw={600} size="lg">Employees Present Today</Text>
            }
            size="xl"
            styles={{
              body: { padding: 'var(--mantine-spacing-lg)' },
              content: { maxWidth: '1200px' }
            }}
          >
            {presentEmployees.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl" size="lg">No present employees</Text>
            ) : (
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders={false}
                style={{ tableLayout: 'auto' }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: '150px' }}>Name</Table.Th>
                    <Table.Th style={{ minWidth: '120px' }}>Department</Table.Th>
                    <Table.Th style={{ minWidth: '100px' }}>Schedule</Table.Th>
                    <Table.Th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Status</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-In Time</Table.Th>
                    <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-Out Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {presentEmployees.map((emp) => (
                    <Table.Tr key={emp.id}>
                      <Table.Td>
                        <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <Text component="span" className="employee-name-link" fw={500}>
                            {emp.name}
                          </Text>
                        </Link>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.department}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{emp.schedule}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            emp.status === 'On-Time' ? 'green' :
                              emp.status === 'Late-In' ? 'orange' :
                                'yellow'
                          }
                          size="md"
                          variant="light"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {emp.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text
                          size="sm"
                          ff="monospace"
                          c={emp.outTime ? undefined : 'dimmed'}
                          fw={emp.outTime ? undefined : 500}
                        >
                          {emp.outTime ? formatUTC12HourTime(emp.outTime) : 'Still Working'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Modal>

          <Tabs.Panel value="logs" pt="md">
            <Paper withBorder radius="lg" p="md">
              <Stack gap="md">
                <div>
                  <Title order={3} mb={4}>Recent Attendance Logs</Title>
                  <TextInput
                    placeholder="Search by employee name, ZK User ID, department, punch status, time, etc..."
                    leftSection={<IconSearch size={16} />}
                    value={logsSearchQuery}
                    onChange={(e) => setLogsSearchQuery(e.currentTarget.value)}
                    mb="md"
                  />
                  {logsSearchQuery && (
                    <Text size="sm" c="dimmed" mb="md">
                      Showing {filteredLogs.length} of {logs.length} logs
                    </Text>
                  )}
                </div>

                <LoadingOverlay visible={loading} />
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>ZK User ID</Table.Th>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Department</Table.Th>
                      <Table.Th>Log Time</Table.Th>
                      <Table.Th>Punch Status</Table.Th>
                      <Table.Th>Synced At</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text c="dimmed" ta="center" py="md">
                            {logsSearchQuery ? 'No logs match your search' : 'No logs available'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      rows
                    )}
                  </Table.Tbody>
                </Table>

                {/* Pagination */}
                <Group justify="center" mt="xl">
                  <Pagination
                    total={logsSearchQuery.trim() ? filteredTotalPages : totalPages}
                    value={currentPage}
                    onChange={(p) => {
                      setCurrentPage(p)
                      // Only fetch from server if not searching (client-side pagination when searching)
                      if (!logsSearchQuery.trim()) {
                        fetchLogs(p, logsPerPage, false)
                      }
                    }}
                  />
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Punch Out Missing Modal */}
        <Modal
          opened={punchOutMissingModalOpen}
          onClose={() => setPunchOutMissingModalOpen(false)}
          title={
            <Text fw={600} size="lg">Employees with Missing Punch Out</Text>
          }
          size="xl"
          styles={{
            body: { padding: 'var(--mantine-spacing-lg)' },
            content: { maxWidth: '1000px' }
          }}
        >
          {punchOutMissingEmployees.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="lg">No employees with missing punch out</Text>
          ) : (
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders={false}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ minWidth: '150px' }}>Name</Table.Th>
                  <Table.Th style={{ minWidth: '120px' }}>Department</Table.Th>
                  <Table.Th style={{ minWidth: '100px' }}>Schedule</Table.Th>
                  <Table.Th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Check-In Time</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {punchOutMissingEmployees.map((emp) => (
                  <Table.Tr key={emp.id}>
                    <Table.Td>
                      <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <Text component="span" className="employee-name-link" fw={500}>
                          {emp.name}
                        </Text>
                      </Link>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{emp.department}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{emp.schedule}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">
                        {emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Modal>
      </Container>
    </Box>
  )
}

export default function Home() {
  return (
    <ThemeProvider>
      <AppShellWrapper>
        <Dashboard />
      </AppShellWrapper>
    </ThemeProvider>
  )
}
