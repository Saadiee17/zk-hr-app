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
import { IconCalendar, IconPlus } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'
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
                          <Table.Td><LeaveStatusBadge status={request.status} /></Table.Td>
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
                    <LeaveBalanceCard balance={balance} />
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



