'use client'

import { useEffect, useState } from 'react'
import { Container, Title, Paper, Tabs, Text, TextInput, NumberInput, Button, Group, Table, Modal, ActionIcon, Stack, Select, Switch, Badge, Divider } from '@mantine/core'
import { IconPencil, IconTrash, IconEdit, IconPlus, IconCalendar } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { useForm } from '@mantine/form'
import { DatePickerInput } from '@mantine/dates'
import { LeaveStatusBadge } from '@/components/shared/LeaveStatusBadge'
import { LeaveRequestForm } from '@/components/shared/LeaveRequestForm'
import { formatEmployeeName, toYMD } from '@/utils/attendanceUtils'

export default function LeaveManagementPage() {
  const [activeTab, setActiveTab] = useState('types')

  // Leave Types state
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveTypesLoading, setLeaveTypesLoading] = useState(false)

  // Leave Requests state
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false)
  const [employees, setEmployees] = useState([])

  // Leave Balances state
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveBalancesLoading, setLeaveBalancesLoading] = useState(false)

  // Fetch leave types
  const fetchLeaveTypes = async () => {
    try {
      setLeaveTypesLoading(true)
      const res = await fetch('/api/hr/leave-types?active_only=false')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch leave types')
      setLeaveTypes(json.data || [])
    } catch (error) {
      showError(error.message || 'Could not load leave types', 'Load failed')
    } finally {
      setLeaveTypesLoading(false)
    }
  }

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch employees')
      setEmployees(json.data || [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
    }
  }

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    try {
      setLeaveRequestsLoading(true)
      const res = await fetch('/api/hr/leave-requests')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch leave requests')
      setLeaveRequests(json.data || [])
    } catch (error) {
      showError(error.message || 'Could not load leave requests', 'Load failed')
    } finally {
      setLeaveRequestsLoading(false)
    }
  }

  // Fetch leave balances
  const fetchLeaveBalances = async () => {
    try {
      setLeaveBalancesLoading(true)
      const res = await fetch('/api/hr/leave-balances')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch leave balances')
      setLeaveBalances(json.data || [])
    } catch (error) {
      showError(error.message || 'Could not load leave balances', 'Load failed')
    } finally {
      setLeaveBalancesLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveTypes()
    fetchEmployees()
    if (activeTab === 'requests') {
      fetchLeaveRequests()
    } else if (activeTab === 'balances') {
      fetchLeaveBalances()
    }
  }, [activeTab])

  // Leave Types Management
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [editTypeOpen, setEditTypeOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)

  const typeForm = useForm({
    initialValues: {
      name: '',
      code: '',
      max_days_per_year: null,
      requires_approval: true,
    },
    validate: {
      name: (value) => (!value ? 'Name is required' : null),
      code: (value) => (!value ? 'Code is required' : null),
      max_days_per_year: (value) => (value !== null && value !== '' && (Number(value) < 0 || !Number.isFinite(Number(value))) ? 'Must be a non-negative number' : null),
    },
  })

  const handleCreateType = async (values) => {
    try {
      const res = await fetch('/api/hr/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create leave type')
      showSuccess(`${values.name} was added`, 'Leave type created')
      setCreateTypeOpen(false)
      typeForm.reset()
      await fetchLeaveTypes()
    } catch (error) {
      showError(error.message || 'Could not create leave type', 'Create failed')
    }
  }

  const handleEditType = (type) => {
    setEditingType(type)
    typeForm.setValues({
      name: type.name || '',
      code: type.code || '',
      max_days_per_year: type.max_days_per_year || null,
      requires_approval: type.requires_approval !== undefined ? type.requires_approval : true,
    })
    setEditTypeOpen(true)
  }

  const handleSaveType = async (values) => {
    try {
      if (!editingType?.id) return
      const res = await fetch(`/api/hr/leave-types/${editingType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update leave type')
      showSuccess(`${values.name} was saved`, 'Leave type updated')
      setEditTypeOpen(false)
      setEditingType(null)
      typeForm.reset()
      await fetchLeaveTypes()
    } catch (error) {
      showError(error.message || 'Could not update leave type', 'Update failed')
    }
  }

  const handleDeleteType = async (type) => {
    try {
      const res = await fetch(`/api/hr/leave-types/${type.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete leave type')
      showSuccess(`${type.name} was removed`, 'Leave type deleted')
      await fetchLeaveTypes()
    } catch (error) {
      showError(error.message || 'Could not delete leave type', 'Delete failed')
    }
  }

  // Leave Requests Management
  const [createRequestOpen, setCreateRequestOpen] = useState(false)
  const [approveRequestOpen, setApproveRequestOpen] = useState(false)
  const [rejectRequestOpen, setRejectRequestOpen] = useState(false)
  const [changeStatusOpen, setChangeStatusOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)


  const approveForm = useForm({
    initialValues: {
      rejection_reason: '',
    },
  })

  const changeStatusForm = useForm({
    initialValues: {
      status: 'pending',
      rejection_reason: '',
    },
  })

  const handleCreateRequest = async (formData) => {
    try {
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create leave request')
      showSuccess('Request submitted successfully. Schedule exceptions will be created automatically when approved.', 'Leave request created')
      setCreateRequestOpen(false)
      await fetchLeaveRequests()
    } catch (error) {
      showError(error.message || 'Could not create leave request', 'Create failed')
    }
  }

  const handleApproveRequest = async () => {
    try {
      if (!selectedRequest?.id) return
      const res = await fetch(`/api/hr/leave-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          approved_by: null, // TODO: Get current user ID
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to approve request')
      
      // Optionally create schedule exceptions when approving (if they don't exist)
      // Check if exceptions already exist for this leave period
      const checkRes = await fetch(`/api/hr/schedule-exceptions?employee_id=${selectedRequest.employee_id}`)
      const checkJson = await checkRes.json()
      const existingExceptions = checkJson.data || []
      
      const startDate = new Date(selectedRequest.start_date)
      const endDate = new Date(selectedRequest.end_date)
      const missingDates = []
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const exists = existingExceptions.some(ex => ex.date === dateStr)
        if (!exists) {
          missingDates.push(dateStr)
        }
      }
      
      // Create schedule exceptions for missing dates (mark as day off)
      if (missingDates.length > 0) {
        for (const dateStr of missingDates) {
          await fetch('/api/hr/schedule-exceptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              employee_id: selectedRequest.employee_id,
              date: dateStr,
              is_day_off: true,
              is_half_day: false,
              start_time: null,
              end_time: null,
            }),
          })
        }
        
        showSuccess(`Leave approved. Created ${missingDates.length} schedule exception(s)`, 'Request approved')
      } else {
        showSuccess('Leave request has been approved', 'Request approved')
      }
      
      setApproveRequestOpen(false)
      setSelectedRequest(null)
      await fetchLeaveRequests()
      await fetchLeaveBalances()
    } catch (error) {
      showError(error.message || 'Could not approve request', 'Approve failed')
    }
  }

  const handleRejectRequest = async (values) => {
    try {
      if (!selectedRequest?.id) return
      const res = await fetch(`/api/hr/leave-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          approved_by: null, // TODO: Get current user ID
          rejection_reason: values.rejection_reason || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to reject request')
      showError('Leave request has been rejected', 'Request rejected')
      setRejectRequestOpen(false)
      setSelectedRequest(null)
      approveForm.reset()
      await fetchLeaveRequests()
      await fetchLeaveBalances()
    } catch (error) {
      showError(error.message || 'Could not reject request', 'Reject failed')
    }
  }

  const handleChangeStatus = async (values) => {
    try {
      if (!selectedRequest?.id) return
      const res = await fetch(`/api/hr/leave-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: values.status,
          approved_by: null, // TODO: Get current user ID
          rejection_reason: values.status === 'rejected' ? (values.rejection_reason || null) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to change status')
      
      // If approving, create schedule exceptions
      if (values.status === 'approved') {
        const checkRes = await fetch(`/api/hr/schedule-exceptions?employee_id=${selectedRequest.employee_id}`)
        const checkJson = await checkRes.json()
        const existingExceptions = checkJson.data || []
        
        const startDate = new Date(selectedRequest.start_date)
        const endDate = new Date(selectedRequest.end_date)
        const missingDates = []
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const exists = existingExceptions.some(ex => ex.date === dateStr)
          if (!exists) {
            missingDates.push(dateStr)
          }
        }
        
        if (missingDates.length > 0) {
          for (const dateStr of missingDates) {
            await fetch('/api/hr/schedule-exceptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee_id: selectedRequest.employee_id,
                date: dateStr,
                is_day_off: true,
                is_half_day: false,
                start_time: null,
                end_time: null,
              }),
            })
          }
        }
      }
      
      showSuccess(`Leave request status changed to ${values.status}`, 'Status updated')
      setChangeStatusOpen(false)
      setSelectedRequest(null)
      changeStatusForm.reset()
      await fetchLeaveRequests()
      await fetchLeaveBalances()
    } catch (error) {
      showError(error.message || 'Could not change status', 'Update failed')
    }
  }


  // Leave Balances Management
  const [editBalanceOpen, setEditBalanceOpen] = useState(false)
  const [editingBalance, setEditingBalance] = useState(null)

  const balanceForm = useForm({
    initialValues: {
      total_allotted: 0,
    },
    validate: {
      total_allotted: (value) => (Number(value) < 0 || !Number.isFinite(Number(value)) ? 'Must be a non-negative number' : null),
    },
  })

  const handleEditBalance = (balance) => {
    setEditingBalance(balance)
    balanceForm.setValues({
      total_allotted: balance.total_allotted || 0,
    })
    setEditBalanceOpen(true)
  }

  const handleSaveBalance = async (values) => {
    try {
      if (!editingBalance?.employee_id || !editingBalance?.leave_type_id) return
      const res = await fetch(`/api/hr/leave-balances/${editingBalance.employee_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type_id: editingBalance.leave_type_id,
          total_allotted: Number(values.total_allotted),
          year: new Date().getFullYear(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update balance')
      showSuccess('Leave balance was updated', 'Balance updated')
      setEditBalanceOpen(false)
      setEditingBalance(null)
      balanceForm.reset()
      await fetchLeaveBalances()
    } catch (error) {
      showError(error.message || 'Could not update balance', 'Update failed')
    }
  }


  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Leave Management</Title>

      <Paper withBorder shadow="sm" p="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="types">Leave Types</Tabs.Tab>
            <Tabs.Tab value="requests">Leave Requests</Tabs.Tab>
            <Tabs.Tab value="balances">Leave Balances</Tabs.Tab>
          </Tabs.List>

          {/* Leave Types Tab */}
          <Tabs.Panel value="types" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Manage Leave Types</Title>
                <Button leftSection={<IconPlus size={18} />} onClick={() => setCreateTypeOpen(true)}>
                  Add Leave Type
                </Button>
              </Group>

              <Paper withBorder>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Code</Table.Th>
                      <Table.Th>Max Days/Year</Table.Th>
                      <Table.Th>Requires Approval</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {leaveTypes.map((type) => (
                      <Table.Tr key={type.id}>
                        <Table.Td>{type.name}</Table.Td>
                        <Table.Td>{type.code}</Table.Td>
                        <Table.Td>{type.max_days_per_year ?? '-'}</Table.Td>
                        <Table.Td>{type.requires_approval ? 'Yes' : 'No'}</Table.Td>
                        <Table.Td>
                          <Badge color={type.is_active ? 'green' : 'gray'} variant="light">
                            {type.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon variant="light" color="blue" onClick={() => handleEditType(type)}>
                              <IconEdit size={18} />
                            </ActionIcon>
                            <ActionIcon variant="light" color="red" onClick={() => handleDeleteType(type)}>
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {leaveTypes.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text c="dimmed">{leaveTypesLoading ? 'Loading...' : 'No leave types found'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Leave Requests Tab */}
          <Tabs.Panel value="requests" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Leave Requests</Title>
                <Button leftSection={<IconPlus size={18} />} onClick={() => setCreateRequestOpen(true)}>
                  New Request
                </Button>
              </Group>

              <Paper withBorder>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Leave Type</Table.Th>
                      <Table.Th>Start Date</Table.Th>
                      <Table.Th>End Date</Table.Th>
                      <Table.Th>Days</Table.Th>
                      <Table.Th>Reason</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Requested At</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {leaveRequests.map((request) => {
                      // Handle Supabase join: leave_types might be an object or array
                      const leaveType = Array.isArray(request.leave_types) 
                        ? request.leave_types[0] 
                        : request.leave_types
                      const leaveTypeName = leaveType?.name || leaveType?.code || '-'
                      
                      return (
                      <Table.Tr key={request.id}>
                        <Table.Td>
                          {formatEmployeeName(request.employee)}
                        </Table.Td>
                        <Table.Td>{leaveTypeName}</Table.Td>
                        <Table.Td>{request.start_date}</Table.Td>
                        <Table.Td>{request.end_date}</Table.Td>
                        <Table.Td>{request.total_days}</Table.Td>
                        <Table.Td>
                          <Text size="sm" c={request.reason ? undefined : 'dimmed'}>
                            {request.reason || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td><LeaveStatusBadge status={request.status} /></Table.Td>
                        <Table.Td>
                          {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : '-'}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="xs"
                                  color="green"
                                  leftSection={<IconCheck size={14} />}
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setApproveRequestOpen(true)
                                  }}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  leftSection={<IconX size={14} />}
                                  onClick={() => {
                                    setSelectedRequest(request)
                                    setRejectRequestOpen(true)
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => {
                                setSelectedRequest(request)
                                changeStatusForm.setValues({
                                  status: request.status,
                                  rejection_reason: request.rejection_reason || '',
                                })
                                setChangeStatusOpen(true)
                              }}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                      )
                    })}
                    {leaveRequests.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={9}>
                          <Text c="dimmed">{leaveRequestsLoading ? 'Loading...' : 'No leave requests found'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* Leave Balances Tab */}
          <Tabs.Panel value="balances" pt="md">
            <Stack gap="md">
              <Title order={4}>Employee Leave Balances</Title>

              <Paper withBorder>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Leave Type</Table.Th>
                      <Table.Th>Total Allotted</Table.Th>
                      <Table.Th>Used</Table.Th>
                      <Table.Th>Pending</Table.Th>
                      <Table.Th>Remaining</Table.Th>
                      <Table.Th>Year</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {leaveBalances.map((balance) => (
                      <Table.Tr key={balance.id}>
                        <Table.Td>
                          {formatEmployeeName(balance.employee)}
                        </Table.Td>
                        <Table.Td>{balance.leave_type?.name || '-'}</Table.Td>
                        <Table.Td>{balance.total_allotted || 0}</Table.Td>
                        <Table.Td>{balance.used || 0}</Table.Td>
                        <Table.Td>{balance.pending || 0}</Table.Td>
                        <Table.Td>{balance.remaining || 0}</Table.Td>
                        <Table.Td>{balance.year}</Table.Td>
                        <Table.Td>
                          <ActionIcon variant="light" color="blue" onClick={() => handleEditBalance(balance)}>
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {leaveBalances.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={8}>
                          <Text c="dimmed">{leaveBalancesLoading ? 'Loading...' : 'No leave balances found'}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Create Leave Type Modal */}
      <Modal opened={createTypeOpen} onClose={() => setCreateTypeOpen(false)} title="Create Leave Type">
        <form onSubmit={typeForm.onSubmit(handleCreateType)}>
          <Stack>
            <TextInput label="Name" placeholder="e.g. Sick Leave" required {...typeForm.getInputProps('name')} />
            <TextInput label="Code" placeholder="e.g. SL" required {...typeForm.getInputProps('code')} />
            <NumberInput
              label="Max Days Per Year"
              placeholder="Optional"
              {...typeForm.getInputProps('max_days_per_year')}
            />
            <Switch
              label="Requires Approval"
              {...typeForm.getInputProps('requires_approval', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setCreateTypeOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Edit Leave Type Modal */}
      <Modal opened={editTypeOpen} onClose={() => setEditTypeOpen(false)} title="Edit Leave Type">
        <form onSubmit={typeForm.onSubmit(handleSaveType)}>
          <Stack>
            <TextInput label="Name" required {...typeForm.getInputProps('name')} />
            <TextInput label="Code" required {...typeForm.getInputProps('code')} />
            <NumberInput
              label="Max Days Per Year"
              {...typeForm.getInputProps('max_days_per_year')}
            />
            <Switch
              label="Requires Approval"
              {...typeForm.getInputProps('requires_approval', { type: 'checkbox' })}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditTypeOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Create Leave Request Modal */}
      <Modal opened={createRequestOpen} onClose={() => setCreateRequestOpen(false)} title="Create Leave Request">
        <Stack gap="md">
          <LeaveRequestForm
            leaveTypes={leaveTypes}
            employees={employees}
            onSubmit={handleCreateRequest}
            onCancel={() => setCreateRequestOpen(false)}
            showEmployeeSelect={true}
          />
          <Text size="sm" c="dimmed">
            Note: When this leave is approved, schedule exceptions will be automatically created as "Day Off" for the leave period. 
            You can customize exceptions (half days, custom times) via the HR Management page after approval.
          </Text>
        </Stack>
      </Modal>

      {/* Approve Request Modal */}
      <Modal opened={approveRequestOpen} onClose={() => setApproveRequestOpen(false)} title="Approve Leave Request">
        <Stack>
          {selectedRequest && (() => {
            const leaveType = Array.isArray(selectedRequest.leave_types) 
              ? selectedRequest.leave_types[0] 
              : selectedRequest.leave_types
            const leaveTypeName = leaveType?.name || leaveType?.code || '-'
            
            return (
            <>
              <Text>
                <strong>Employee:</strong> {selectedRequest.employee ? `${selectedRequest.employee.first_name || ''} ${selectedRequest.employee.last_name || ''}`.trim() : '-'}
              </Text>
              <Text>
                <strong>Leave Type:</strong> {leaveTypeName}
              </Text>
              <Text>
                <strong>Duration:</strong> {selectedRequest.start_date} to {selectedRequest.end_date} ({selectedRequest.total_days} days)
              </Text>
              {selectedRequest.reason && (
                <Text>
                  <strong>Reason:</strong> {selectedRequest.reason}
                </Text>
              )}
            </>
            )
          })()}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setApproveRequestOpen(false)}>Cancel</Button>
            <Button color="green" onClick={handleApproveRequest}>Approve</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Reject Request Modal */}
      <Modal opened={rejectRequestOpen} onClose={() => setRejectRequestOpen(false)} title="Reject Leave Request">
        <form onSubmit={approveForm.onSubmit(handleRejectRequest)}>
          <Stack>
            {selectedRequest && (() => {
              const leaveType = Array.isArray(selectedRequest.leave_types) 
                ? selectedRequest.leave_types[0] 
                : selectedRequest.leave_types
              const leaveTypeName = leaveType?.name || leaveType?.code || '-'
              
              return (
              <>
                <Text>
                  <strong>Employee:</strong> {formatEmployeeName(selectedRequest.employee)}
                </Text>
                <Text>
                  <strong>Leave Type:</strong> {leaveTypeName}
                </Text>
                <Text>
                  <strong>Duration:</strong> {selectedRequest.start_date} to {selectedRequest.end_date} ({selectedRequest.total_days} days)
                </Text>
              </>
              )
            })()}
            <TextInput
              label="Rejection Reason"
              placeholder="Optional"
              {...approveForm.getInputProps('rejection_reason')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setRejectRequestOpen(false)}>Cancel</Button>
              <Button color="red" type="submit">Reject</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Change Status Modal */}
      <Modal opened={changeStatusOpen} onClose={() => setChangeStatusOpen(false)} title="Change Leave Request Status">
        <form onSubmit={changeStatusForm.onSubmit(handleChangeStatus)}>
          <Stack>
            {selectedRequest && (() => {
              const leaveType = Array.isArray(selectedRequest.leave_types) 
                ? selectedRequest.leave_types[0] 
                : selectedRequest.leave_types
              const leaveTypeName = leaveType?.name || leaveType?.code || '-'
              
              return (
              <>
                <Text>
                  <strong>Employee:</strong> {formatEmployeeName(selectedRequest.employee)}
                </Text>
                <Text>
                  <strong>Leave Type:</strong> {leaveTypeName}
                </Text>
                <Text>
                  <strong>Period:</strong> {selectedRequest.start_date} to {selectedRequest.end_date} ({selectedRequest.total_days} days)
                </Text>
                <Text size="sm" c="dimmed">
                  <strong>Current Status:</strong> {selectedRequest.status?.charAt(0).toUpperCase() + selectedRequest.status?.slice(1)}
                </Text>
                <Select
                  label="New Status"
                  placeholder="Select status"
                  required
                  data={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                  {...changeStatusForm.getInputProps('status')}
                />
                {changeStatusForm.values.status === 'rejected' && (
                  <TextInput
                    label="Rejection Reason"
                    placeholder="Optional"
                    {...changeStatusForm.getInputProps('rejection_reason')}
                  />
                )}
                <Text size="sm" c="dimmed">
                  Note: Changing status will automatically update leave balances. If approving, schedule exceptions will be created.
                </Text>
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setChangeStatusOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Status</Button>
                </Group>
              </>
              )
            })()}
          </Stack>
        </form>
      </Modal>

      {/* Edit Balance Modal */}
      <Modal opened={editBalanceOpen} onClose={() => setEditBalanceOpen(false)} title="Edit Leave Balance">
        <form onSubmit={balanceForm.onSubmit(handleSaveBalance)}>
          <Stack>
            {editingBalance && (
              <>
                <Text>
                  <strong>Employee:</strong> {formatEmployeeName(editingBalance.employee)}
                </Text>
                <Text>
                  <strong>Leave Type:</strong> {editingBalance.leave_type?.name || '-'}
                </Text>
              </>
            )}
            <NumberInput
              label="Total Allotted Days"
              required
              min={0}
              {...balanceForm.getInputProps('total_allotted')}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditBalanceOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  )
}

