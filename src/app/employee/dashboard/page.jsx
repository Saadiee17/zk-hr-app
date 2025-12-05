'use client'

import { useState, useEffect, Fragment } from 'react'
import {
  Container,
  Title,
  Text,
  Grid,
  Stack,
  Group,
  Button,
  Badge,
  Table,
  LoadingOverlay,
  ActionIcon,
  Divider,
  Paper,
  TextInput,
  SimpleGrid,
  ThemeIcon
} from '@mantine/core'
import {
  IconCalendar,
  IconClock,
  IconAlertCircle,
  IconSettings,
  IconChevronDown,
  IconChevronRight,
  IconUser,
  IconHourglass,
  IconBriefcase,
  IconSearch,
  IconCheck,
  IconX,
  IconMoodSmile,
  IconMoodEmpty
} from '@tabler/icons-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { formatUTC12Hour, formatUTC12HourTime, formatDateFriendly } from '@/utils/dateFormatting'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'
import { formatHoursMinutes, formatDateWithDay } from '@/utils/attendanceUtils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ModernStatCard } from '@/components/shared/ModernStatCard'
import { DarkStatsGroup } from '@/components/shared/DarkStatsGroup'
import { UniversalTable } from '@/components/shared/UniversalTable'

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    leaveBalance: [],
    pendingRequests: 0,
    monthWorkHours: 0,
    monthRequiredHours: 0,
    monthlyReports: [], // Added to store full month data
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

      // Calculate required hours based on scheduled days (excluding days off and leaves)
      // We use the API data itself to determine working days
      const scheduledDaysCount = reportsData.data?.filter(r => r.status !== 'Day Off' && r.status !== 'On Leave').length || 0
      const requiredHours = scheduledDaysCount * 9 // 9 hours per working day

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
        monthlyReports: reportsData.data || [],
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

  // Calculate derived stats using API data
  // scheduledDays: Days that are not 'Day Off' or 'On Leave'
  const scheduledDays = stats.monthlyReports.filter(r => r.status !== 'Day Off' && r.status !== 'On Leave').length

  // presentDays: Days where employee has punched in (inTime is not null)
  const presentDays = stats.monthlyReports.filter(r => r.inTime !== null).length

  // Attendance Rate: Present / Scheduled
  const attendanceRate = scheduledDays > 0 ? Math.round((presentDays / scheduledDays) * 100) : 0

  // Status Counts (using exact status strings from API)
  const lateCount = stats.monthlyReports.filter(r => r.status === 'Late-In').length
  const onTimeCount = stats.monthlyReports.filter(r => r.status === 'On-Time' || r.status === 'Present').length
  const absentCount = stats.monthlyReports.filter(r => r.status === 'Absent').length

  // Find today's log
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayLog = recentLogs.find(log => log.date === todayStr)

  const darkStatsData = [
    {
      label: "TODAY'S STATUS",
      value: todayLog?.status || 'Not Checked In',
      icon: IconUser,
      color: todayLog?.status === 'Present' || todayLog?.status === 'On-Time' ? 'green' : (todayLog?.status === 'Absent' ? 'red' : 'gray')
    },
    {
      label: "CHECK IN",
      value: todayLog?.inTime ? formatUTC12HourTime(todayLog.inTime) : '--:--',
      icon: IconClock,
      color: 'blue'
    },
    {
      label: "CHECK OUT",
      value: todayLog?.outTime ? formatUTC12HourTime(todayLog.outTime) : '--:--',
      icon: IconClock,
      color: 'orange'
    },
    {
      label: "DURATION",
      value: todayLog?.durationHours ? formatHoursMinutes(todayLog.durationHours) : '0h 0m',
      icon: IconHourglass,
      color: 'grape'
    },
  ]

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        <AdminAccessBanner />

        {/* Header */}
        <Group justify="space-between" align="flex-end">
          <div>
            <Text c="dimmed" size="sm" fw={600} mb={4} tt="uppercase" ls={1}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
            <Title order={1}>
              Good Morning, {user?.firstName}
            </Title>
          </div>
          {user?.isAdmin && (
            <Button
              component={Link}
              href="/"
              size="md"
              variant="light"
              color="blue"
              leftSection={<IconSettings size={18} />}
            >
              Admin Dashboard
            </Button>
          )}
        </Group>

        {/* Top Cards */}
        <Grid gutter="md">
          {/* Card 1: Attendance Rate */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <ModernStatCard
              title="Attendance Rate"
              value={`${attendanceRate}%`}
              badgeLabel="RATE"
              color="blue"
              borderPosition="left"
            />
          </Grid.Col>

          {/* Card 2: Pending Requests */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <ModernStatCard
              title="Pending Requests"
              value={stats.pendingRequests}
              badgeLabel={stats.pendingRequests > 0 ? "WAITING" : "CLEAR"}
              badgeColor={stats.pendingRequests > 0 ? "yellow" : "green"}
              color="yellow"
              borderPosition="right"
            />
          </Grid.Col>

          {/* Card 3: Month Hours */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <ModernStatCard
              title="Month Hours"
              value={formatHoursMinutes(stats.monthWorkHours)}
              badgeLabel={`/ ${formatHoursMinutes(stats.monthRequiredHours)}`}
              color="green"
              borderPosition="right"
            />
          </Grid.Col>

          {/* Card 4: Attendance Statuses */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <ModernStatCard
              title="Attendance Status"
              color="red"
              borderPosition="right"
            >
              <Group gap="xs" align="center" style={{ height: '100%' }}>
                <Stack gap={4} align="center" style={{ flex: 1 }}>
                  <ThemeIcon variant="light" color="green" radius="md" size="lg">
                    <IconCheck size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={700} lh={1}>{onTimeCount}</Text>
                  <Text size="xs" c="dimmed" fw={600}>On Time</Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack gap={4} align="center" style={{ flex: 1 }}>
                  <ThemeIcon variant="light" color="yellow" radius="md" size="lg">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={700} lh={1}>{lateCount}</Text>
                  <Text size="xs" c="dimmed" fw={600}>Late</Text>
                </Stack>

                <Divider orientation="vertical" />

                <Stack gap={4} align="center" style={{ flex: 1 }}>
                  <ThemeIcon variant="light" color="red" radius="md" size="lg">
                    <IconX size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={700} lh={1}>{absentCount}</Text>
                  <Text size="xs" c="dimmed" fw={600}>Absent</Text>
                </Stack>
              </Group>
            </ModernStatCard>
          </Grid.Col>
        </Grid>

        {/* Dark Stats Bar */}
        <DarkStatsGroup data={darkStatsData} />

        {/* Main Content Area */}
        <Grid gutter="xl">
          <Grid.Col span={12}>
            <Group justify="space-between" mb="md" align="center">
              <Title order={3}>Recent Attendance</Title>
              <TextInput
                placeholder="Search logs..."
                leftSection={<IconSearch size={16} />}
                style={{ width: 300 }}
                radius="md"
              />
            </Group>
            <UniversalTable>
              <UniversalTable.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>In Time</Table.Th>
                  <Table.Th>Out Time</Table.Th>
                  <Table.Th>Regular Hours</Table.Th>
                  <Table.Th>Overtime Hours</Table.Th>
                  <Table.Th>Total Hours</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </UniversalTable.Thead>
              <UniversalTable.Tbody>
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
                                  {formatDateFriendly(log.date)}
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
                            <StatusBadge status={log.status} />
                          </Table.Td>
                        </Table.Tr>
                        {isExpanded && (
                          <Table.Tr key={`${uniqueKey}-expanded`}>
                            <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                              <Paper p="md" withBorder>
                                <Stack gap="xs">
                                  <Group justify="space-between">
                                    <Text size="sm" fw={600}>Full Details</Text>
                                    <StatusBadge status={log.status} />
                                  </Group>
                                  <Divider />
                                  <Grid>
                                    <Grid.Col span={6}>
                                      <Text size="xs" c="dimmed">Date</Text>
                                      <Text fw={500}>{dateInfo.dayName}, {formatDateFriendly(log.date)}</Text>
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
              </UniversalTable.Tbody>
            </UniversalTable>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
