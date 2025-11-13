'use client'

import { useState, useEffect, Fragment } from 'react'
import {
  Container,
  Title,
  Text,
  Paper,
  Grid,
  Stack,
  Card,
  Group,
  Button,
  Badge,
  Table,
  LoadingOverlay,
  ActionIcon,
  Divider,
  Progress,
} from '@mantine/core'
import {
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconSettings,
  IconChevronDown,
  IconChevronRight,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { formatUTC12Hour, formatUTC12HourTime } from '@/utils/dateFormatting'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

// Helper function to convert decimal hours to "Xh Ym" format
const formatHoursMinutes = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0h'
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours - hours) * 60)
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

// Calculate working days from start of month up to current date (excluding weekends)
const getWorkingDaysInMonth = (year, month, currentDate) => {
  const firstDay = new Date(year, month, 1)
  const today = currentDate || new Date()
  const currentDay = today.getDate()
  let workingDays = 0
  
  // Only count days from start of month up to today
  for (let day = 1; day <= currentDay; day++) {
    const checkDate = new Date(year, month, day)
    const dayOfWeek = checkDate.getDay()
    // Exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
  }
  
  return workingDays
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    leaveBalance: [],
    pendingRequests: 0,
    monthWorkHours: 0,
    monthRequiredHours: 0,
  })
  const [recentLogs, setRecentLogs] = useState([])
  const [expandedRows, setExpandedRows] = useState(new Set())

  useEffect(() => {
    if (user?.employeeId) {
      console.log('[Dashboard] User loaded:', user)
      fetchDashboardData()
    } else if (user) {
      console.log('[Dashboard] User exists but no employeeId:', user)
    }
  }, [user])

  const fetchDashboardData = async () => {
    if (!user?.employeeId) {
      console.error('[Dashboard] No employeeId available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('[Dashboard] Fetching data for employee:', user.employeeId)

      // Fetch leave balances
      const leaveBalanceRes = await fetch(`/api/hr/leave-balances?employee_id=${user.employeeId}`)
      const leaveBalanceData = await leaveBalanceRes.json()

      // Fetch leave requests (pending only)
      const leaveRequestsRes = await fetch('/api/hr/leave-requests')
      const leaveRequestsData = await leaveRequestsRes.json()
      const pending = leaveRequestsData.data?.filter((r) => r.status === 'pending').length || 0

      // Fetch this month's work hours
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startDateStr = startOfMonth.toISOString().slice(0, 10)
      const endDateStr = now.toISOString().slice(0, 10)

      const reportsRes = await fetch(
        `/api/reports/daily-work-time?employee_id=${user.employeeId}&start_date=${startDateStr}&end_date=${endDateStr}`
      )
      const reportsData = await reportsRes.json()
      const totalHours = reportsData.data?.reduce((sum, day) => sum + (day.durationHours || 0), 0) || 0
      
      // Calculate working days (excluding weekends) from start of month up to today
      const workingDays = getWorkingDaysInMonth(now.getFullYear(), now.getMonth(), now)
      const requiredHours = workingDays * 9 // 9 hours per working day

      // Fetch recent attendance logs (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

      const recentReportsRes = await fetch(
        `/api/reports/daily-work-time?employee_id=${user.employeeId}&start_date=${sevenDaysAgoStr}&end_date=${endDateStr}`
      )
      const recentReportsData = await recentReportsRes.json()

      setStats({
        leaveBalance: leaveBalanceData.data || [],
        pendingRequests: pending,
        monthWorkHours: totalHours,
        monthRequiredHours: requiredHours,
      })

      setRecentLogs(recentReportsData.data?.slice(0, 7) || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (dateStr) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr)
    } else {
      newExpanded.add(dateStr)
    }
    setExpandedRows(newExpanded)
  }

  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return { dayName: '', dateStr: '' }
    const date = new Date(dateStr + 'T00:00:00')
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[date.getDay()]
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return {
      dayName,
      dateStr: `${month}/${day}/${year}`,
    }
  }

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        <AdminAccessBanner />
        
        {/* Welcome Section */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1}>
              Welcome back, {user?.firstName}!
            </Title>
            <Text c="dimmed" size="lg">
              Here's your attendance overview
            </Text>
          </div>
          {user?.isAdmin && (
            <Button
              component={Link}
              href="/"
              size="lg"
              variant="filled"
              color="blue"
              leftSection={<IconSettings size={20} />}
              style={{ fontWeight: 600 }}
            >
              Go to Admin Dashboard
            </Button>
          )}
        </Group>

        {/* Stats Cards */}
        <Grid gutter="md">
          {/* Leave Balance Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card 
              shadow="sm" 
              padding="xl" 
              radius="lg" 
              withBorder
              style={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid var(--mantine-color-blue-6)',
                background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-white) 100%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 99, 235, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
                      Leave Balance
                    </Text>
                    <Text size="lg" fw={700} c="blue">
                      {stats.leaveBalance.length} Types
                    </Text>
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--mantine-color-blue-1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconCalendar size={24} color="var(--mantine-color-blue-6)" />
                  </div>
                </Group>
                <Divider />
                <Stack gap={8}>
                  {stats.leaveBalance.length > 0 ? (
                    stats.leaveBalance.slice(0, 3).map((balance) => (
                      <Group key={balance.id || `default-${balance.leave_type_id}`} justify="space-between" p="xs" style={{ borderRadius: '8px', background: 'var(--mantine-color-gray-0)' }}>
                        <Text size="sm" fw={500}>{balance.leave_type?.name}</Text>
                        <Badge 
                          variant="light" 
                          color="blue" 
                          size="lg"
                          radius="md"
                          style={{ fontWeight: 600 }}
                        >
                          {balance.remaining || 0} days
                        </Badge>
                      </Group>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      No leave balance data
                    </Text>
                  )}
                  {stats.leaveBalance.length > 3 && (
                    <Text size="xs" c="dimmed" ta="center" mt={4}>
                      +{stats.leaveBalance.length - 3} more
                    </Text>
                  )}
                </Stack>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Pending Requests Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card 
              shadow="sm" 
              padding="xl" 
              radius="lg" 
              withBorder
              style={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid var(--mantine-color-yellow-6)',
                background: 'linear-gradient(135deg, var(--mantine-color-yellow-0) 0%, var(--mantine-color-white) 100%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(234, 179, 8, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
                      Pending Requests
                    </Text>
                    <Text size={36} fw={700} c="yellow" lh={1}>
                      {stats.pendingRequests}
                    </Text>
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--mantine-color-yellow-1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconAlertCircle size={24} color="var(--mantine-color-yellow-6)" />
                  </div>
                </Group>
                <Divider />
                <Text size="sm" c="dimmed" fw={500}>
                  Awaiting approval
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          {/* This Month's Hours Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card 
              shadow="sm" 
              padding="xl" 
              radius="lg" 
              withBorder
              style={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid var(--mantine-color-green-6)',
                background: 'linear-gradient(135deg, var(--mantine-color-green-0) 0%, var(--mantine-color-white) 100%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(34, 197, 94, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
                      This Month's Hours
                    </Text>
                    <Text size={32} fw={700} c="green" lh={1.2}>
                      {formatHoursMinutes(stats.monthWorkHours)}
                    </Text>
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--mantine-color-green-1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconClock size={24} color="var(--mantine-color-green-6)" />
                  </div>
                </Group>
                <Divider />
                <div>
                  <Group justify="space-between" mb={8}>
                    <Text size="sm" c="dimmed" fw={500}>
                      Progress
                    </Text>
                    <Text size="sm" fw={600} c="green">
                      {stats.monthRequiredHours > 0 
                        ? Math.round((stats.monthWorkHours / stats.monthRequiredHours) * 100) 
                        : 0}%
                    </Text>
                  </Group>
                  <Progress 
                    value={stats.monthRequiredHours > 0 ? (stats.monthWorkHours / stats.monthRequiredHours) * 100 : 0} 
                    color="green" 
                    size="lg" 
                    radius="xl"
                    animated
                  />
                  <Text size="xs" c="dimmed" mt={8}>
                    {formatHoursMinutes(stats.monthWorkHours)} / {formatHoursMinutes(stats.monthRequiredHours)} required
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Attendance */}
        <Paper withBorder p="md" radius="md">
          <Text size="lg" fw={600} mb="md">
            Recent Attendance (Last 7 Days)
          </Text>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>In Time</Table.Th>
                <Table.Th>Out Time</Table.Th>
                <Table.Th>Regular Hours</Table.Th>
                <Table.Th>Overtime Hours</Table.Th>
                <Table.Th>Total Hours</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log, idx) => {
                  const dateInfo = formatDateWithDay(log.date)
                  const uniqueKey = `${log.date}-${idx}`
                  const isExpanded = expandedRows.has(uniqueKey)
                  
                  return (
                    <Fragment key={uniqueKey}>
                      <Table.Tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRow(uniqueKey)}
                      >
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleRow(uniqueKey)
                              }}
                            >
                              {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </ActionIcon>
                            <div>
                              <Text fw={500} size="sm">
                                {dateInfo.dayName}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {dateInfo.dateStr}
                              </Text>
                            </div>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>
                            {log.inTime ? formatUTC12HourTime(log.inTime) : '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>
                            {log.outTime ? formatUTC12HourTime(log.outTime) : '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>{formatHoursMinutes(log.regularHours ?? 0)}</Table.Td>
                        <Table.Td>{formatHoursMinutes(log.overtimeHours ?? 0)}</Table.Td>
                        <Table.Td>{formatHoursMinutes((log.regularHours ?? 0) + (log.overtimeHours ?? 0))}</Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              log.status === 'On-Time' ? 'green' :
                              log.status === 'Late-In' ? 'orange' :
                              log.status === 'Present' ? 'blue' :
                              log.status === 'On Leave' ? 'violet' :
                              log.status === 'Half Day' ? 'yellow' :
                              log.status === 'Out of Schedule' ? 'grape' :
                              log.status === 'Punch Out Missing' ? 'red' :
                              log.status === 'Absent' ? 'red' : 'gray'
                            }
                            variant="light"
                          >
                            {log.status || 'Unknown'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && (
                        <Table.Tr key={`${uniqueKey}-expanded`}>
                          <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Paper p="md" withBorder>
                              <Stack gap="xs">
                                <Group justify="space-between">
                                  <Text size="sm" fw={600}>Full Details</Text>
                                  <Badge
                                    color={
                                      log.status === 'On-Time' ? 'green' :
                                      log.status === 'Late-In' ? 'orange' :
                                      log.status === 'Present' ? 'blue' :
                                      log.status === 'On Leave' ? 'violet' :
                                      log.status === 'Half Day' ? 'yellow' :
                                      log.status === 'Out of Schedule' ? 'grape' :
                                      log.status === 'Punch Out Missing' ? 'red' :
                                      log.status === 'Absent' ? 'red' : 'gray'
                                    }
                                    variant="light"
                                  >
                                    {log.status || 'Unknown'}
                                  </Badge>
                                </Group>
                                <Divider />
                                <Grid>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Date</Text>
                                    <Text fw={500}>{dateInfo.dayName}, {dateInfo.dateStr}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Status</Text>
                                    <Text fw={500}>{log.status || 'Unknown'}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">In Time</Text>
                                    <Text fw={500}>{log.inTime ? formatUTC12Hour(log.inTime) : '-'}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Out Time</Text>
                                    <Text fw={500}>{log.outTime ? formatUTC12Hour(log.outTime) : '-'}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Regular Hours</Text>
                                    <Text fw={500}>{formatHoursMinutes(log.regularHours ?? 0)}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={6}>
                                    <Text size="xs" c="dimmed">Overtime Hours</Text>
                                    <Text fw={500}>{formatHoursMinutes(log.overtimeHours ?? 0)}</Text>
                                  </Grid.Col>
                                  <Grid.Col span={12}>
                                    <Text size="xs" c="dimmed">Total Duration</Text>
                                    <Text fw={500}>{formatHoursMinutes(log.durationHours ?? 0)}</Text>
                                  </Grid.Col>
                                </Grid>
                              </Stack>
                            </Paper>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Fragment>
                  )
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">
                      No recent attendance data
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  )
}

