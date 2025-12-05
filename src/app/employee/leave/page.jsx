'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Paper,
  Tabs,
  Stack,
  Button,
  Table,
  Badge,
  Group,
  LoadingOverlay,
  Modal,
  Select,
  Textarea,
  Text,
  Grid,
  Card,
} from '@mantine/core'
import { UniversalTabs } from '@/components/shared/UniversalTabs'
import { UniversalTable } from '@/components/shared/UniversalTable'
import { DatePickerInput } from '@mantine/dates'
import { IconCalendar, IconPlus, IconCalendarStats, IconRefresh } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'
import { formatDateFriendly } from '@/utils/dateFormatting'
import { LeaveStatusBadge } from '@/components/shared/LeaveStatusBadge'
import { LeaveRequestForm } from '@/components/shared/LeaveRequestForm'
import { LeaveBalanceCard } from '@/components/shared/LeaveBalanceCard'
import { toYMD } from '@/utils/attendanceUtils'

export default function EmployeeLeavePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])

  // Request form state
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch leave types
      const typesRes = await fetch('/api/hr/leave-types?active_only=true')
      const typesData = await typesRes.json()
      setLeaveTypes(typesData.data || [])

      // Fetch leave requests
      const requestsRes = await fetch('/api/hr/leave-requests')
      const requestsData = await requestsRes.json()
      setLeaveRequests(requestsData.data || [])

      // Fetch leave balances
      const balancesRes = await fetch(`/api/hr/leave-balances?employee_id=${user.employeeId}`)
      const balancesData = await balancesRes.json()
      setLeaveBalances(balancesData.data || [])
    } catch (error) {
      console.error('Failed to fetch leave data:', error)
      showError('Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async (formData) => {
    try {
      setSubmitting(true)

      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        showSuccess('Leave request submitted successfully')
        setRequestModalOpen(false)
        fetchData()
      } else {
        throw new Error(data.error || 'Failed to submit request')
      }
    } catch (error) {
      showError(error.message)
    } finally {
      setSubmitting(false)
    }
  }


  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <LoadingOverlay visible={loading} />

      <Stack gap="lg" mb={30}>
        <AdminAccessBanner />
        <Group justify="space-between" align="flex-end">
          <div>
            <Text c="dimmed" size="sm" fw={500} mb={4} tt="uppercase" ls={1}>
              Employee Portal
            </Text>
            <Title order={1} style={{ fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-1px', color: '#2d3436' }}>
              Leave Management
            </Title>
          </div>
          <Group>
            <Button
              leftSection={<IconRefresh size={18} />}
              variant="light"
              color="gray"
              onClick={fetchData}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => setRequestModalOpen(true)}
            >
              Request Leave
            </Button>
          </Group>
        </Group>
      </Stack>

      <UniversalTabs
        defaultValue="requests"
      >
        <UniversalTabs.List mb="lg">
          <UniversalTabs.Tab value="requests" leftSection={<IconCalendar size={16} />}>
            My Requests
          </UniversalTabs.Tab>
          <UniversalTabs.Tab value="balance" leftSection={<IconCalendarStats size={16} />}>
            Leave Balance
          </UniversalTabs.Tab>
        </UniversalTabs.List>

        {/* My Requests Tab */}
        <UniversalTabs.Panel value="requests" pt="md">
          <UniversalTable>
            <UniversalTable.Thead>
              <Table.Tr>
                <Table.Th>Leave Type</Table.Th>
                <Table.Th>Start Date</Table.Th>
                <Table.Th>End Date</Table.Th>
                <Table.Th>Days</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Requested At</Table.Th>
              </Table.Tr>
            </UniversalTable.Thead>
            <UniversalTable.Tbody>
              {leaveRequests.length > 0 ? (
                leaveRequests.map((request) => {
                  const leaveType = Array.isArray(request.leave_types)
                    ? request.leave_types[0]
                    : request.leave_types
                  return (
                    <Table.Tr key={request.id}>
                      <Table.Td>
                        <Badge variant="dot" color="blue">{leaveType?.name || '-'}</Badge>
                      </Table.Td>
                      <Table.Td>{formatDateFriendly(request.start_date)}</Table.Td>
                      <Table.Td>{formatDateFriendly(request.end_date)}</Table.Td>
                      <Table.Td fw={600}>{request.total_days}</Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2} c={request.reason ? undefined : 'dimmed'}>
                          {request.reason || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td><LeaveStatusBadge status={request.status} /></Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {request.requested_at
                            ? new Date(request.requested_at).toLocaleDateString()
                            : '-'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center" py="xl">
                      No leave requests found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </UniversalTable.Tbody>
          </UniversalTable>
        </UniversalTabs.Panel>

        {/* Leave Balance Tab */}
        <UniversalTabs.Panel value="balance" pt="md">
          <Grid>
            {leaveBalances.length > 0 ? (
              leaveBalances.map((balance) => (
                <Grid.Col key={balance.id || `default-${balance.leave_type_id}`} span={{ base: 12, sm: 6, md: 4 }}>
                  <LeaveBalanceCard balance={balance} />
                </Grid.Col>
              ))
            ) : (
              <Grid.Col span={12}>
                <Paper withBorder p="xl" radius="lg">
                  <Text c="dimmed" ta="center">
                    No leave balance data available
                  </Text>
                </Paper>
              </Grid.Col>
            )}
          </Grid>
        </UniversalTabs.Panel>
      </UniversalTabs>

      {/* Request Leave Modal */}
      <Modal
        opened={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Leave"
        size="md"
      >
        <LeaveRequestForm
          leaveTypes={leaveTypes}
          employeeId={user?.employeeId}
          onSubmit={handleSubmitRequest}
          onCancel={() => setRequestModalOpen(false)}
          loading={submitting}
        />
      </Modal>
    </Container>
  )
}



