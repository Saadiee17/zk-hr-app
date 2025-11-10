'use client'

import { useState, useEffect } from 'react'
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
} from '@mantine/core'
import {
  IconCalendar,
  IconClock,
  IconFileText,
  IconDownload,
  IconUser,
  IconAlertCircle,
  IconSettings,
} from '@tabler/icons-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    leaveBalance: [],
    pendingRequests: 0,
    monthWorkHours: 0,
  })
  const [recentLogs, setRecentLogs] = useState([])

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
        monthWorkHours: Math.round(totalHours * 10) / 10,
      })

      setRecentLogs(recentReportsData.data?.slice(0, 7) || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    if (!status) return 'gray'
    if (status === 'On-Time') return 'green'
    if (status.includes('Late')) return 'orange'
    if (status === 'Absent') return 'red'
    if (status === 'On Leave') return 'blue'
    return 'gray'
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
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={500} c="dimmed">
                  Leave Balance
                </Text>
                <IconCalendar size={20} color="var(--mantine-color-blue-6)" />
              </Group>
              <Stack gap="xs">
                {stats.leaveBalance.length > 0 ? (
                  stats.leaveBalance.map((balance) => (
                    <Group key={balance.id} justify="space-between">
                      <Text size="sm">{balance.leave_type?.name}</Text>
                      <Badge variant="light" color="blue">
                        {balance.remaining || 0} days
                      </Badge>
                    </Group>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    No leave balance data
                  </Text>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={500} c="dimmed">
                  Pending Requests
                </Text>
                <IconAlertCircle size={20} color="var(--mantine-color-yellow-6)" />
              </Group>
              <Text size="xl" fw={700}>
                {stats.pendingRequests}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Awaiting approval
              </Text>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text size="sm" fw={500} c="dimmed">
                  This Month's Hours
                </Text>
                <IconClock size={20} color="var(--mantine-color-green-6)" />
              </Group>
              <Text size="xl" fw={700}>
                {stats.monthWorkHours} hrs
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Total work hours
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Quick Actions */}
        <Paper withBorder p="md" radius="md">
          <Text size="lg" fw={600} mb="md">
            Quick Actions
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/employee/leave"
                fullWidth
                variant="light"
                leftSection={<IconCalendar size={18} />}
              >
                Request Leave
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/employee/reports"
                fullWidth
                variant="light"
                leftSection={<IconFileText size={18} />}
              >
                View Reports
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/employee/profile"
                fullWidth
                variant="light"
                leftSection={<IconUser size={18} />}
              >
                Edit Profile
              </Button>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Button
                component={Link}
                href="/employee/bridge-installer"
                fullWidth
                variant="light"
                leftSection={<IconDownload size={18} />}
              >
                Download Bridge
              </Button>
            </Grid.Col>
          </Grid>
        </Paper>

        {/* Recent Attendance */}
        <Paper withBorder p="md" radius="md">
          <Text size="lg" fw={600} mb="md">
            Recent Attendance (Last 7 Days)
          </Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>In Time</Table.Th>
                <Table.Th>Out Time</Table.Th>
                <Table.Th>Hours</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{log.date}</Table.Td>
                    <Table.Td>
                      {log.inTime ? formatUTC12HourTime(log.inTime) : '-'}
                    </Table.Td>
                    <Table.Td>
                      {log.outTime ? formatUTC12HourTime(log.outTime) : '-'}
                    </Table.Td>
                    <Table.Td>{log.durationHours || 0} hrs</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(log.status)} variant="light">
                        {log.status || 'N/A'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
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

