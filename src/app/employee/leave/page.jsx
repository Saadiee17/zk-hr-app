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
import { DatePickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconCalendar, IconPlus } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function EmployeeLeavePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  
  // Request form state
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [selectedLeaveType, setSelectedLeaveType] = useState(null)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [reason, setReason] = useState('')

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
      notifications.show({
        title: 'Error',
        message: 'Failed to load leave data',
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async () => {
    if (!selectedLeaveType || !startDate || !endDate) {
      notifications.show({
        title: 'Error',
        message: 'Please fill all required fields',
        color: 'red',
        icon: <IconX size={18} />,
      })
      return
    }

    if (startDate > endDate) {
      notifications.show({
        title: 'Error',
        message: 'End date must be after start date',
        color: 'red',
        icon: <IconX size={18} />,
      })
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: user.employeeId,
          leave_type_id: selectedLeaveType,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          reason,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Leave request submitted successfully',
          color: 'green',
          icon: <IconCheck size={18} />,
        })
        setRequestModalOpen(false)
        resetForm()
        fetchData()
      } else {
        throw new Error(data.error || 'Failed to submit request')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedLeaveType(null)
    setStartDate(null)
    setEndDate(null)
    setReason('')
  }

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      cancelled: 'gray',
    }
    return (
      <Badge color={colors[status] || 'gray'} variant="light">
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    )
  }

  return (
    <Container size="xl" py="xl">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <AdminAccessBanner />
        <Group justify="space-between">
          <Title order={1}>Leave Management</Title>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => setRequestModalOpen(true)}
          >
            Request Leave
          </Button>
        </Group>

        <Tabs defaultValue="requests">
          <Tabs.List>
            <Tabs.Tab value="requests" leftSection={<IconCalendar size={16} />}>
              My Requests
            </Tabs.Tab>
            <Tabs.Tab value="balance" leftSection={<IconCalendar size={16} />}>
              Leave Balance
            </Tabs.Tab>
          </Tabs.List>

          {/* My Requests Tab */}
          <Tabs.Panel value="requests" pt="md">
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Leave Type</Table.Th>
                    <Table.Th>Start Date</Table.Th>
                    <Table.Th>End Date</Table.Th>
                    <Table.Th>Days</Table.Th>
                    <Table.Th>Reason</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Requested At</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((request) => {
                      const leaveType = Array.isArray(request.leave_types)
                        ? request.leave_types[0]
                        : request.leave_types
                      return (
                        <Table.Tr key={request.id}>
                          <Table.Td>{leaveType?.name || '-'}</Table.Td>
                          <Table.Td>{request.start_date}</Table.Td>
                          <Table.Td>{request.end_date}</Table.Td>
                          <Table.Td>{request.total_days}</Table.Td>
                          <Table.Td>
                            <Text size="sm" lineClamp={2}>
                              {request.reason || '-'}
                            </Text>
                          </Table.Td>
                          <Table.Td>{getStatusBadge(request.status)}</Table.Td>
                          <Table.Td>
                            {request.requested_at
                              ? new Date(request.requested_at).toLocaleDateString()
                              : '-'}
                          </Table.Td>
                        </Table.Tr>
                      )
                    })
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text c="dimmed" ta="center">
                          No leave requests found
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* Leave Balance Tab */}
          <Tabs.Panel value="balance" pt="md">
            <Grid>
              {leaveBalances.length > 0 ? (
                leaveBalances.map((balance) => (
                  <Grid.Col key={balance.id || `default-${balance.leave_type_id}`} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text size="lg" fw={600} mb="md">
                        {balance.leave_type?.name}
                      </Text>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Total Allotted
                          </Text>
                          <Text size="sm" fw={500}>
                            {balance.total_allotted} days
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Used
                          </Text>
                          <Text size="sm" fw={500} c="red">
                            {balance.used} days
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Pending
                          </Text>
                          <Text size="sm" fw={500} c="yellow">
                            {balance.pending} days
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Remaining
                          </Text>
                          <Text size="lg" fw={700} c="green">
                            {balance.remaining} days
                          </Text>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))
              ) : (
                <Grid.Col span={12}>
                  <Paper withBorder p="xl">
                    <Text c="dimmed" ta="center">
                      No leave balance data available
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Request Leave Modal */}
      <Modal
        opened={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Leave"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Leave Type"
            placeholder="Select leave type"
            data={leaveTypes.map((type) => ({
              value: type.id,
              label: type.name,
            }))}
            value={selectedLeaveType}
            onChange={setSelectedLeaveType}
            required
          />

          <DatePickerInput
            label="Start Date"
            placeholder="Select start date"
            value={startDate}
            onChange={setStartDate}
            required
            minDate={new Date()}
          />

          <DatePickerInput
            label="End Date"
            placeholder="Select end date"
            value={endDate}
            onChange={setEndDate}
            required
            minDate={startDate || new Date()}
          />

          <Textarea
            label="Reason"
            placeholder="Enter reason for leave (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />

          {startDate && endDate && (
            <Text size="sm" c="dimmed">
              Total days:{' '}
              {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} loading={submitting}>
              Submit Request
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}



