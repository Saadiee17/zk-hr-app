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
  ActionIcon
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconRefresh, IconCheck, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AppShellWrapper } from '@/components/AppShellWrapper'

function Dashboard() {
  // State for logs table
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  
  // State for sync
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const syncingRef = useRef(false)
  
  // State for metrics
  const [metrics, setMetrics] = useState({ present: 0, late: 0, absent: 0, onTime: 0 })
  const [metricsLoading, setLoadingMetrics] = useState(false)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [lateEmployees, setLateEmployees] = useState([])
  const [absentEmployees, setAbsentEmployees] = useState([])
  const [onTimeEmployees, setOnTimeEmployees] = useState([])
  const [presentEmployees, setPresentEmployees] = useState([])
  const [departmentEmployees, setDepartmentEmployees] = useState([])
  
  // State for modals
  const [lateModalOpen, setLateModalOpen] = useState(false)
  const [absentModalOpen, setAbsentModalOpen] = useState(false)
  const [onTimeModalOpen, setOnTimeModalOpen] = useState(false)
  const [presentModalOpen, setPresentModalOpen] = useState(false)
  
  // State for department collapse
  const [expandedDepartments, setExpandedDepartments] = useState({})

  // Fetch attendance logs with pagination
  const fetchLogs = async (page = 1, limit = 50) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/logs/filter?page=${page}&limit=${limit}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch logs')
      }

      setLogs(result.data || [])
      setTotalPages(result.totalPages || 1)
    } catch (error) {
      console.error('[Logs] Error:', error)
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to fetch logs',
        color: 'red',
        icon: <IconX size={18} />,
      })
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
      
      if (!silent) {
        notifications.show({
          id: 'syncing',
          loading: true,
          title: 'Syncing data',
          message: 'Fetching attendance from device...',
          autoClose: false,
          withCloseButton: false,
        })
      }

      const response = await fetch('/api/sync', { method: 'POST' })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      setLastSyncTime(new Date())
      
      if (!silent) {
        notifications.update({
          id: 'syncing',
          color: 'teal',
          title: 'Success',
          message: result.message || 'Data synced successfully',
        icon: <IconCheck size={18} />,
          autoClose: 2000,
      })
      }

      // Refresh logs after successful sync
      await fetchLogs(currentPage, logsPerPage)
      await fetchMetrics()
    } catch (error) {
      console.error('[Sync] Error:', error)
      if (!silent) {
        notifications.update({
          id: 'syncing',
        color: 'red',
          title: 'Sync Error',
          message: error.message || 'Failed to sync data',
        icon: <IconX size={18} />,
          autoClose: 4000,
      })
      }
    } finally {
      setSyncing(false)
      syncingRef.current = false
    }
  }, [currentPage, logsPerPage])

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
      
      // Determine the "effective working day" based on company settings
      let effectiveDateStr = pakistanNow.toISOString().slice(0, 10)
      let yesterdayDateStr = new Date(pakistanNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      
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

      // Fetch reports for all employees (yesterday and today for overnight shifts)
      const results = await Promise.all(
        employees.map(async (e) => {
          try {
            const reportResponse = await fetch(
              `/api/reports/daily-work-time?employee_id=${e.id}&start_date=${pakistanYesterdayStr}&end_date=${pakistanDateStr}`
            )
            const reportResult = await reportResponse.json()
            
            if (!reportResponse.ok) {
              console.warn(`[Metrics] Failed to fetch report for ${e.first_name} ${e.last_name}:`, reportResult.error)
              return null
            }

            const reports = reportResult.data || []
            const todayRow = reports.find(r => r.date === pakistanDateStr)
            const yesterdayRow = reports.find(r => r.date === pakistanYesterdayStr)
            
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
              relevantRow = todayRow
            } else if (yesterdayRow && yesterdayRow.status === 'Punch Out Missing') {
              // If someone from the previous day hasn't clocked out, show that
              status = 'Punch Out Missing'
              relevantRow = yesterdayRow
            }

            return {
              employee: e,
              reportData: relevantRow || todayRow,
              yesterdayReportData: yesterdayRow,
              employeeName,
              departmentName,
              scheduleInfo,
              status: status
            }
          } catch (err) {
            console.error(`[Metrics] Error processing ${e.first_name} ${e.last_name}:`, err)
            return null
          }
        })
      )

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

      setTotalEmployees(employees.length)
      setMetrics({ present: presentCount, late: lateCount, absent: absentCount, onTime: onTimeCount })
      setLateEmployees(lateList)
      setAbsentEmployees(absentList)
      setOnTimeEmployees(onTimeList)
      setPresentEmployees(presentList)
      
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
        notifications.show({ 
          title: 'Metrics error', 
          message: e.message || 'Failed to compute overview', 
          color: 'red', 
          icon: <IconX size={18} /> 
        })
      }
    } finally {
      setLoadingMetrics(false)
    }
  }, [])
  
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

  // Table rows for logs
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
      <Table.Td>{coalesce(log.status_text)}</Table.Td>
      <Table.Td>{formatDateTime(log.synced_at)}</Table.Td>
    </Table.Tr>
    )
  })

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Title order={1}>HR Attendance Dashboard</Title>
        <Group gap="md">
          {lastSyncTime && (
            <Text size="sm" c="dimmed">
              Last sync: {formatUTC12HourTime(lastSyncTime.toISOString())}
            </Text>
          )}
        <Button
            onClick={() => handleSync(false)}
          loading={syncing}
            leftSection={<IconRefresh size={16} />}
        >
          Sync Data Now
        </Button>
      </Group>
      </Group>

      {/* Metrics Grid */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onClick={() => setPresentModalOpen(true)}
          >
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>Employees Present</Text>
              <Text size="xl" fw={700} c="blue">{metrics.present}</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setOnTimeModalOpen(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>Employees On-Time</Text>
              <Text size="xl" fw={700} c="green">{metrics.onTime}</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setLateModalOpen(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>Employees Late-In</Text>
              <Text size="xl" fw={700} c="orange">{metrics.late}</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => setAbsentModalOpen(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>Employees Absent</Text>
              <Text size="xl" fw={700} c="red">{metrics.absent}</Text>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Card 
            shadow="sm" 
            padding="lg" 
            radius="md" 
            withBorder 
            style={{ transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>Total Employees</Text>
              <Text size="xl" fw={700} c="gray">{totalEmployees}</Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Refresh Controls */}
      <Paper withBorder p="md" mb="md" radius="md">
        <Group justify="space-between">
            <div>
            <Text fw={500}>Dashboard Controls</Text>
            <Text size="sm" c="dimmed">Auto-refresh enabled (every 2 minutes)</Text>
            </div>
          <Button 
            onClick={() => fetchMetrics(false)}
            loading={metricsLoading}
            leftSection={<IconRefresh size={16} />}
            variant="light"
          >
            Refresh Metrics
          </Button>
        </Group>
      </Paper>

      {/* Department-Wise Employee Status */}
      <Paper withBorder p="md" mb="md" radius="md">
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

      {/* Modals for Late, Absent, and On-Time Employees */}
      <Modal
        opened={lateModalOpen}
        onClose={() => setLateModalOpen(false)}
        title="Employees Late-In Today"
        size="lg"
      >
        {lateEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No late employees</Text>
        ) : (
          <Table striped highlightOnHover>
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
                      <Text component="span" className="employee-name-link">
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td>{emp.department}</Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>{emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      <Modal
        opened={absentModalOpen}
        onClose={() => setAbsentModalOpen(false)}
        title="Employees Absent Today"
        size="lg"
      >
        {absentEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No absent employees</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Schedule</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {absentEmployees.map((emp) => (
                <Table.Tr key={emp.id}>
                  <Table.Td>
                    <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Text component="span" className="employee-name-link">
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td>{emp.department}</Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      <Modal
        opened={onTimeModalOpen}
        onClose={() => setOnTimeModalOpen(false)}
        title="Employees On-Time Today"
        size="lg"
      >
        {onTimeEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No on-time employees</Text>
        ) : (
          <Table striped highlightOnHover>
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
                      <Text component="span" className="employee-name-link">
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td>{emp.department}</Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>{emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      <Modal
        opened={presentModalOpen}
        onClose={() => setPresentModalOpen(false)}
        title="Employees Present Today"
        size="lg"
      >
        {presentEmployees.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">No present employees</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Department</Table.Th>
                <Table.Th>Schedule</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Check-In Time</Table.Th>
                <Table.Th>Check-Out Time</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {presentEmployees.map((emp) => (
                <Table.Tr key={emp.id}>
                  <Table.Td>
                    <Link href={`/employees/${emp.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      <Text component="span" className="employee-name-link">
                        {emp.name}
                      </Text>
                    </Link>
                  </Table.Td>
                  <Table.Td>{emp.department}</Table.Td>
                  <Table.Td>{emp.schedule}</Table.Td>
                  <Table.Td>
                    <Badge 
                      color={
                        emp.status === 'On-Time' ? 'green' : 
                        emp.status === 'Late-In' ? 'orange' : 
                        'yellow'
                      }
                    >
                      {emp.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{emp.inTime ? formatUTC12HourTime(emp.inTime) : 'N/A'}</Table.Td>
                  <Table.Td>{emp.outTime ? formatUTC12HourTime(emp.outTime) : 'Still Working'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Modal>

      {/* Attendance Logs */}
      <Title order={2} mb="md">Recent Attendance Logs</Title>
      <Paper withBorder radius="md" p="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ZK User ID</Table.Th>
              <Table.Th>Employee</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Log Time</Table.Th>
              <Table.Th>Punch Status</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Synced At</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        {/* Pagination */}
        <Group justify="center" mt="xl">
          <Pagination 
            total={totalPages} 
            value={currentPage} 
            onChange={(p) => {
              setCurrentPage(p)
              fetchLogs(p, logsPerPage)
            }} 
          />
        </Group>
      </Paper>
    </Container>
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
