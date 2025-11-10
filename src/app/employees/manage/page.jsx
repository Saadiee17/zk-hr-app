'use client'

import { useEffect, useState, useMemo } from 'react'
import { Container, Title, Paper, Text, TextInput, Button, Group, Table, Modal, ActionIcon, Stack, Select, Switch, Divider, Grid } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconCheck, IconX, IconCalendar, IconSearch, IconLockOpen } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { Calendar, TimeInput } from '@mantine/dates'
import Link from 'next/link'
import { IconSelector } from '@tabler/icons-react'

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState([])
  const [empLoading, setEmpLoading] = useState(false)
  const [deptOptions, setDeptOptions] = useState([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignEmp, setAssignEmp] = useState(null)
  const [assignSaving, setAssignSaving] = useState(false)
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false)
  const [exceptions, setExceptions] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentException, setCurrentException] = useState(null)
  const [exceptionSaving, setExceptionSaving] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null)
  const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false)
  const [leaveRequestForm, setLeaveRequestForm] = useState({
    leave_type: 'casual_leave',
    reason: ''
  })
  const [employeeSchedule, setEmployeeSchedule] = useState(null)
  const [timeZones, setTimeZones] = useState([])
  const [empSort, setEmpSort] = useState({ key: 'name', dir: 'asc' })
  const [searchQuery, setSearchQuery] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState(false)
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState(null)

  const editForm = useForm({
    initialValues: {
      full_name: '',
      department_id: null,
      privilege: 0,
      is_active: true,
      card_number: '',
      password: '',
      individual_tz_1: null,
      individual_tz_2: null,
      individual_tz_3: null,
    },
    transformValues: (values) => values,
  })

  const fetchEmployees = async () => {
    try {
      setEmpLoading(true)
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch employees')
      setEmployees(json.data || [])
    } catch (error) {
      notifications.show({
        title: 'Load employees failed',
        message: error.message || 'Could not load employees',
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setEmpLoading(false)
    }
  }

  const fetchDeptOptions = async () => {
    try {
      const res = await fetch('/api/hr/departments')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch departments')
      const opts = (json.data || []).map((d) => ({ value: d.id, label: d.name }))
      setDeptOptions(opts)
    } catch (error) {
      setDeptOptions([])
    }
  }

  const fetchTimeZones = async () => {
    try {
      const res = await fetch('/api/hr/time-zones')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch TZs')
      setTimeZones(json.data || [])
    } catch (error) {
      setTimeZones([])
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchDeptOptions()
    fetchTimeZones()
  }, [])

  const tzOptions = timeZones.map((t) => ({ value: String(t.id), label: `${t.id} - ${t.name}` }))

  const toggleEmpSort = (key) => {
    setEmpSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
  }

  const getSortIndicator = (key) => {
    if (empSort.key !== key) return <IconSelector size={14} style={{ opacity: 0.4 }} />
    return empSort.dir === 'asc' ? '▲' : '▼'
  }

  const safeLower = (v) => (typeof v === 'string' ? v.toLowerCase() : '')
  
  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees
    
    const query = safeLower(searchQuery)
    return employees.filter((emp) => {
      const fullName = safeLower(`${emp.first_name || ''} ${emp.last_name || ''}`.trim())
      const employeeId = safeLower(emp.employee_id || '')
      const zkUserId = String(emp.zk_user_id || '')
      const department = safeLower(emp?.department?.name || '')
      const schedule = safeLower(emp?.primary_schedule || '')
      const privilege = String(emp?.privilege ?? '')
      const status = emp?.is_active ? 'enabled' : 'disabled'
      
      return (
        fullName.includes(query) ||
        employeeId.includes(query) ||
        zkUserId.includes(query) ||
        department.includes(query) ||
        schedule.includes(query) ||
        privilege.includes(query) ||
        status.includes(query)
      )
    })
  }, [employees, searchQuery])
  
  const empSorted = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
    const dir = empSort.dir === 'asc' ? 1 : -1
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim()
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim()
    const depA = a?.department?.name || ''
    const depB = b?.department?.name || ''
    const schedA = a?.primary_schedule || ''
    const schedB = b?.primary_schedule || ''
    const privA = Number(a?.privilege ?? 0)
    const privB = Number(b?.privilege ?? 0)
    const zkA = Number(a?.zk_user_id ?? -Infinity)
    const zkB = Number(b?.zk_user_id ?? -Infinity)
    const statA = a?.is_active ? 'Enabled' : 'Disabled'
    const statB = b?.is_active ? 'Enabled' : 'Disabled'
    switch (empSort.key) {
      case 'name':
        return dir * (safeLower(nameA) > safeLower(nameB) ? 1 : safeLower(nameA) < safeLower(nameB) ? -1 : 0)
      case 'zk':
        return dir * (zkA - zkB)
      case 'primary':
        return dir * (safeLower(schedA) > safeLower(schedB) ? 1 : safeLower(schedA) < safeLower(schedB) ? -1 : 0)
      case 'department':
        return dir * (safeLower(depA) > safeLower(depB) ? 1 : safeLower(depA) < safeLower(depB) ? -1 : 0)
      case 'privilege':
        return dir * (privA - privB)
      case 'status':
        return dir * (safeLower(statA) > safeLower(statB) ? 1 : safeLower(statA) < safeLower(statB) ? -1 : 0)
      default:
        return 0
    }
    })
  }, [filteredEmployees, empSort])

  const toYMD = (d) => new Date(d).toISOString().slice(0, 10)

  const fetchExceptions = async (employeeId) => {
    if (!employeeId) return
    try {
      const res = await fetch(`/api/hr/schedule-exceptions?employee_id=${employeeId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch exceptions')
      setExceptions(json.data || [])
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordEmployee) return
    
    try {
      const res = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: resetPasswordEmployee.id }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Password reset successfully. Employee will be prompted to set a new password on next login.',
          color: 'green',
          icon: <IconCheck size={18} />,
        })
        setResetPasswordModal(false)
        setResetPasswordEmployee(null)
      } else {
        throw new Error(data.error || 'Failed to reset password')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      })
    }
  }

  const fetchLeaveRequests = async (employeeId) => {
    if (!employeeId) return
    try {
      const res = await fetch(`/api/hr/leave-requests?employee_id=${employeeId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch leave requests')
      setLeaveRequests(json.data || [])
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    }
  }

  const fetchEmployeeSchedule = async (employeeId) => {
    if (!employeeId) return
    try {
      const res = await fetch(`/api/hr/employee-schedule?employee_id=${employeeId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch schedule')
      setEmployeeSchedule(json.data)
    } catch (error) {
      console.error('Error fetching schedule:', error)
      setEmployeeSchedule(null)
    }
  }

  const handleCreateLeaveRequest = async () => {
    if (!assignEmp?.id || !selectedDate) return
    try {
      setExceptionSaving(true)
      const payload = {
        employee_id: assignEmp.id,
        leave_type: leaveRequestForm.leave_type,
        start_date: toYMD(selectedDate),
        end_date: toYMD(selectedDate),
        reason: leaveRequestForm.reason || '',
        status: 'approved',
      }
      
      const res = await fetch('/api/hr/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      
      if (!res.ok) {
        const errorMsg = json.error || 'Failed to create leave request'
        const details = json.details ? ` (${json.details})` : ''
        throw new Error(errorMsg + details)
      }
      notifications.show({ title: 'Success', message: 'Leave request created and approved.', color: 'green' })
      setShowLeaveRequestForm(false)
      setLeaveRequestForm({ leave_type: 'casual_leave', reason: '' })
      await fetchLeaveRequests(assignEmp.id)
    } catch (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' })
    } finally {
      setExceptionSaving(false)
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    const ymd = toYMD(date)
    const found = exceptions.find(ex => ex.date === ymd)
    setCurrentException(found || { date: ymd, start_time: '', end_time: '', is_day_off: false, is_half_day: false })
  }

  const handleSaveException = async () => {
    if (!assignEmp?.id || !currentException?.date) return
    try {
      setExceptionSaving(true)
      
      const payload = {
        employee_id: assignEmp.id,
        date: String(currentException.date || ''),
        start_time: currentException.is_day_off ? null : (String(currentException.start_time || '').trim() || null),
        end_time: currentException.is_day_off ? null : (String(currentException.end_time || '').trim() || null),
        is_day_off: Boolean(currentException.is_day_off || false),
        is_half_day: Boolean(currentException.is_half_day || false),
      }
      
      const res = await fetch('/api/hr/schedule-exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save exception')
      notifications.show({ title: 'Success', message: 'Exception saved.', color: 'green' })
      await fetchExceptions(assignEmp.id)
    } catch (error) {
      notifications.show({ title: 'Save Failed', message: error.message, color: 'red' })
    } finally {
      setExceptionSaving(false)
    }
  }
  
  const handleDeleteException = async () => {
    if (!assignEmp?.id || !currentException?.date) return
    try {
      setExceptionSaving(true)
      const res = await fetch('/api/hr/schedule-exceptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: assignEmp.id,
          date: currentException.date,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(()=>({}))
        throw new Error(json.error || 'Failed to delete exception')
      }
      notifications.show({ title: 'Success', message: 'Exception cleared.', color: 'green' })
      setCurrentException(null)
      await fetchExceptions(assignEmp.id)
      handleDateSelect(selectedDate)
    } catch (error) {
      notifications.show({ title: 'Delete Failed', message: error.message, color: 'red' })
    } finally {
      setExceptionSaving(false)
    }
  }

  const empRows = empSorted.map((e) => (
    <Table.Tr key={e.id}>
      <Table.Td>
        <Link href={`/employees/${e.id}`} style={{ textDecoration: 'none' }}>
          {`${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || 'Unknown'}
        </Link>
      </Table.Td>
      <Table.Td>{e.zk_user_id ?? ''}</Table.Td>
      <Table.Td>{e?.department?.name || ''}</Table.Td>
      <Table.Td>{e?.primary_schedule || 'Not Assigned'}</Table.Td>
      <Table.Td>{e?.privilege_text ?? e?.privilege ?? ''}</Table.Td>
      <Table.Td>{e?.is_active ? 'Enabled' : 'Disabled'}</Table.Td>
      <Table.Td>
        <Group gap="xs">
        <ActionIcon variant="light" color="blue" aria-label="Edit" onClick={() => {
          setAssignEmp(e)
          editForm.setValues({
            full_name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
            department_id: e.department_id || null,
            privilege: e.privilege ?? 0,
            is_active: Boolean(e.is_active),
            card_number: e.card_number || '',
            individual_tz_1: e.individual_tz_1 ?? null,
            individual_tz_2: e.individual_tz_2 ?? null,
            individual_tz_3: e.individual_tz_3 ?? null,
          })
          fetchExceptions(e.id)
          fetchLeaveRequests(e.id)
          setAssignOpen(true)
        }}>
          <IconEdit size={18} />
        </ActionIcon>
          <ActionIcon variant="light" color="orange" aria-label="Reset Password" onClick={() => {
            setResetPasswordEmployee(e)
            setResetPasswordModal(true)
          }}>
            <IconLockOpen size={18} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Employee Management</Title>

      <Paper withBorder shadow="sm" p="md">
        <Stack gap="md">
          <TextInput
            placeholder="Search by name, employee ID, ZK User ID, department, schedule, privilege, or status..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ maxWidth: 600 }}
          />
          
          {searchQuery && (
            <Text size="sm" c="dimmed">
              Showing {empSorted.length} of {employees.length} employees
            </Text>
          )}
          
          <Paper withBorder>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('name')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>Employee</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('name')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('zk')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>ZK User ID</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('zk')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('department')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>Department</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('department')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('primary')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>Primary Schedule</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('primary')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('privilege')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>Privilege</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('privilege')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} onClick={() => toggleEmpSort('status')} style={{ cursor: 'pointer' }}>
                    <Group justify="space-between" gap={6} wrap="nowrap">
                      <span>Status</span>
                      <Text c="dimmed" size="xs">{getSortIndicator('status')}</Text>
                    </Group>
                  </Table.Th>
                  <Table.Th fw={600} style={{ width: 120 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {empRows}
                {empLoading && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed">Loading...</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {!empLoading && (!employees || employees.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed">No employees found</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
                {!empLoading && employees.length > 0 && empSorted.length === 0 && searchQuery && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed">No employees match your search query</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>

        <Modal opened={assignOpen} onClose={() => setAssignOpen(false)} title="Edit Employee">
          <form onSubmit={editForm.onSubmit(async (values) => {
            try {
              setAssignSaving(true)
              if (!assignEmp?.id) throw new Error('Missing employee id')
              const [firstName, ...rest] = (values.full_name || '').trim().split(/\s+/)
              const lastName = rest.join(' ')
              const res = await fetch(`/api/hr/employee-update/${assignEmp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  first_name: firstName || '',
                  last_name: lastName || '',
                  department_id: values.department_id || null,
                  privilege: Number(values.privilege ?? 0),
                  is_active: Boolean(values.is_active),
                  card_number: values.card_number || null,
                  password: values.password || undefined,
                  individual_tz_1: values.individual_tz_1 ?? null,
                  individual_tz_2: values.individual_tz_2 ?? null,
                  individual_tz_3: values.individual_tz_3 ?? null,
                }),
              })
              const json = await res.json()
              if (!res.ok) throw new Error(json.error || 'Failed to save employee')
              notifications.show({
                title: 'Employee updated',
                message: 'Changes saved successfully',
                color: 'green',
                icon: <IconCheck size={18} />,
              })
              setAssignOpen(false)
              await fetchEmployees()
            } catch (error) {
              notifications.show({
                title: 'Update failed',
                message: error.message || 'Could not update employee',
                color: 'red',
                icon: <IconX size={18} />,
              })
            } finally {
              setAssignSaving(false)
            }
          })}>
            <Stack>
              <TextInput
                label="Employee Name"
                placeholder="e.g. Jane Doe"
                {...editForm.getInputProps('full_name')}
                required
              />
              <Select
                label="Department"
                placeholder="Select department"
                data={deptOptions}
                {...editForm.getInputProps('department_id')}
                searchable
                clearable
                nothingFoundMessage="No departments"
              />
              <Select
                label="Privilege"
                data={[
                  { value: '0', label: 'Employee' },
                  { value: '1', label: 'Registrar' },
                  { value: '2', label: 'Administrator' },
                  { value: '3', label: 'Super Admin' },
                ]}
                {...editForm.getInputProps('privilege')}
              />
              <Switch
                label="Status (Enabled)"
                {...editForm.getInputProps('is_active', { type: 'checkbox' })}
              />
              <TextInput
                label="Card Number"
                placeholder="Optional"
                {...editForm.getInputProps('card_number')}
              />
              <TextInput
                label="Password"
                placeholder="Optional (device password)"
                {...editForm.getInputProps('password')}
              />
              
              <Divider my="sm" label="Schedule Management" />

              <Button 
                leftSection={<IconCalendar size={14} />} 
                variant="outline" 
                onClick={() => {
                  const today = new Date()
                  setSelectedDate(today)
                  const ymd = toYMD(today)
                  const found = exceptions.find(ex => ex.date === ymd)
                  setCurrentException(found || { date: ymd, start_time: '', end_time: '', is_day_off: false, is_half_day: false })
                  fetchEmployeeSchedule(assignEmp?.id)
                  setExceptionModalOpen(true)
                }}
              >
                Manage Exception Schedule
              </Button>
              <Text c="dimmed" size="xs" mt={-10} mb={10}>
                For single-day changes, like a requested day off or a temporary shift change for a specific date.
              </Text>

              <Title order={5}>Individual Weekly Schedule Override (Optional)</Title>
              <Text c="dimmed" size="xs" mt={-10} mb={10}>
                Use this if the employee permanently follows a different weekly schedule than their department's default.
              </Text>
              <Select
                label="Time Zone 1"
                placeholder="Use Department Default"
                data={[{ value: '', label: 'Use Department Default' }, ...tzOptions]}
                value={editForm.values.individual_tz_1 === null ? '' : String(editForm.values.individual_tz_1)}
                onChange={(v) => editForm.setFieldValue('individual_tz_1', v === '' || v === null ? null : Number(v))}
                searchable
                clearable
              />
              <Select
                label="Time Zone 2"
                placeholder="Use Department Default"
                data={[{ value: '', label: 'Use Department Default' }, ...tzOptions]}
                value={editForm.values.individual_tz_2 === null ? '' : String(editForm.values.individual_tz_2)}
                onChange={(v) => editForm.setFieldValue('individual_tz_2', v === '' || v === null ? null : Number(v))}
                searchable
                clearable
              />
              <Select
                label="Time Zone 3"
                placeholder="Use Department Default"
                data={[{ value: '', label: 'Use Department Default' }, ...tzOptions]}
                value={editForm.values.individual_tz_3 === null ? '' : String(editForm.values.individual_tz_3)}
                onChange={(v) => editForm.setFieldValue('individual_tz_3', v === '' || v === null ? null : Number(v))}
                searchable
                clearable
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setAssignOpen(false)}>Cancel</Button>
                <Button type="submit" loading={assignSaving} disabled={assignSaving}>Save</Button>
              </Group>
            </Stack>
          </form>
        </Modal>

        <Modal opened={exceptionModalOpen} onClose={() => setExceptionModalOpen(false)} title={`Exception Schedule: ${assignEmp?.first_name || ''} ${assignEmp?.last_name || ''}`.trim()} size="xl">
          <Grid>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <div style={{ position: 'relative' }}>
                <Calendar
                  value={selectedDate}
                  onChange={handleDateSelect}
                  getDayProps={(date) => {
                    const dateObj = new Date(date)
                    if (isNaN(dateObj.getTime())) {
                      return {}
                    }
                    const ymd = toYMD(dateObj)
                    const exception = exceptions.find(ex => ex.date === ymd)
                    const isSelected = ymd === toYMD(selectedDate)
                    
                    let backgroundColor = undefined
                    if (isSelected) {
                      backgroundColor = exception 
                        ? (exception.is_day_off ? 'rgba(255, 0, 0, 0.2)' : exception.is_half_day ? 'rgba(255, 165, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)')
                        : 'rgba(34, 139, 34, 0.2)'
                    } else if (exception) {
                      backgroundColor = exception.is_day_off 
                        ? 'rgba(255, 0, 0, 0.1)' 
                        : exception.is_half_day
                        ? 'rgba(255, 165, 0, 0.1)'
                        : 'rgba(0, 0, 255, 0.1)'
                    }
                    
                    return {
                      onClick: (e) => {
                        e.stopPropagation()
                        handleDateSelect(dateObj)
                      },
                      style: {
                        position: 'relative',
                        cursor: 'pointer',
                        backgroundColor: backgroundColor,
                        border: isSelected ? '2px solid #228B22' : undefined,
                        borderRadius: isSelected ? '4px' : undefined,
                        fontWeight: isSelected ? 'bold' : undefined,
                      }
                    }
                  }}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  🟢 Green border = Selected • 🔴 Red = Day Off • 🔵 Blue = Custom Schedule
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5 }}>
              {currentException ? (
                <Stack>
                  <Title order={5}>{selectedDate.toLocaleDateString()}</Title>
                  
                  {employeeSchedule && (
                    <>
                      <Divider label="Current Schedule" />
                      <Text size="xs" c="dimmed" mb="xs">
                        {employeeSchedule.schedule_type === 'individual' ? 'Individual Override' : employeeSchedule.schedule_type === 'department' ? 'Department Default' : 'No Schedule'}
                        {employeeSchedule.schedule_name && ` • ${employeeSchedule.schedule_name}`}
                      </Text>
                      <Paper p="xs" withBorder>
                        <Stack gap={4}>
                          {employeeSchedule.weekly_schedule && employeeSchedule.weekly_schedule.length > 0 ? (
                            employeeSchedule.weekly_schedule.map((day, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <Text fw={day.isWorking ? 500 : 400} c={day.isWorking ? undefined : 'dimmed'}>
                                  {day.day}
                                </Text>
                                {day.isWorking ? (
                                  <Text size="xs" c="dimmed">
                                    {day.startTime} - {day.endTime}
                                  </Text>
                                ) : (
                                  <Text size="xs" c="dimmed" fs="italic">Day Off</Text>
                                )}
                              </div>
                            ))
                          ) : (
                            <Text size="xs" c="dimmed" fs="italic">No schedule assigned</Text>
                          )}
                        </Stack>
                      </Paper>
                    </>
                  )}
                  
                  <Divider label="Leave Request (Optional)" />
                  <Text size="xs" c="dimmed">Link this exception to a formal leave request or create a new one.</Text>
                  
                  {!showLeaveRequestForm ? (
                    <Stack gap="xs">
                      <Select
                        label="Link to Existing Leave Request"
                        placeholder="Select a leave request or create new"
                        data={leaveRequests
                          .filter(lr => lr.status === 'approved' || lr.status === 'pending')
                          .map(lr => {
                            const leaveType = Array.isArray(lr.leave_types) 
                              ? lr.leave_types[0] 
                              : lr.leave_types
                            const leaveTypeName = leaveType?.name || leaveType?.code || 'Unknown'
                            return {
                              value: lr.id,
                              label: `${leaveTypeName} - ${lr.start_date} (${lr.status})`
                            }
                          })}
                        value={selectedLeaveRequest}
                        onChange={setSelectedLeaveRequest}
                        clearable
                      />
                      <Button size="xs" variant="light" onClick={() => setShowLeaveRequestForm(true)}>
                        + Create New Leave Request
                      </Button>
                    </Stack>
                  ) : (
                    <Stack gap="xs">
                      <Select
                        label="Leave Type"
                        data={[
                          { value: 'casual_leave', label: 'Casual Leave' },
                          { value: 'sick_leave', label: 'Sick Leave' },
                          { value: 'early_off', label: 'Early Off' },
                          { value: 'late_in', label: 'Late In' },
                        ]}
                        value={leaveRequestForm.leave_type}
                        onChange={(v) => setLeaveRequestForm(f => ({ ...f, leave_type: v }))}
                      />
                      <TextInput
                        label="Reason (Optional)"
                        placeholder="Medical appointment, personal, etc."
                        value={leaveRequestForm.reason || ''}
                        onChange={(e) => {
                          const value = e?.currentTarget?.value ?? e?.target?.value ?? (typeof e === 'string' ? e : '')
                          setLeaveRequestForm(f => ({ ...f, reason: value }))
                        }}
                      />
                      <Group>
                        <Button size="xs" variant="default" onClick={() => setShowLeaveRequestForm(false)}>
                          Cancel
                        </Button>
                        <Button size="xs" onClick={handleCreateLeaveRequest} loading={exceptionSaving}>
                          Create & Approve
                        </Button>
                      </Group>
                    </Stack>
                  )}
                  
                  <Divider label="Schedule Override" />
                  
                  <Switch
                    label="Day Off"
                    checked={currentException.is_day_off || false}
                    onChange={(checked) => setCurrentException(c => ({ ...c, is_day_off: checked, is_half_day: checked ? false : c.is_half_day }))}
                  />
                  <Switch
                    label="Half Day"
                    checked={currentException.is_half_day || false}
                    onChange={(checked) => setCurrentException(c => ({ ...c, is_half_day: checked, is_day_off: checked ? false : c.is_day_off }))}
                    disabled={currentException.is_day_off}
                    description="Calculate half the regular hours for this day"
                  />
                  <Group grow>
                    <TimeInput
                      label="Start Time"
                      value={currentException.start_time || ''}
                      onChange={(e) => {
                        let value = ''
                        if (e instanceof Date) {
                          const hours = String(e.getHours()).padStart(2, '0')
                          const minutes = String(e.getMinutes()).padStart(2, '0')
                          value = `${hours}:${minutes}`
                        } else if (typeof e === 'string') {
                          value = e
                        } else if (e?.currentTarget?.value) {
                          value = e.currentTarget.value
                        } else if (e?.target?.value) {
                          value = e.target.value
                        }
                        setCurrentException(c => ({ ...c, start_time: value }))
                      }}
                      disabled={currentException.is_day_off}
                    />
                    <TimeInput
                      label="End Time"
                      value={currentException.end_time || ''}
                      onChange={(e) => {
                        let value = ''
                        if (e instanceof Date) {
                          const hours = String(e.getHours()).padStart(2, '0')
                          const minutes = String(e.getMinutes()).padStart(2, '0')
                          value = `${hours}:${minutes}`
                        } else if (typeof e === 'string') {
                          value = e
                        } else if (e?.currentTarget?.value) {
                          value = e.currentTarget.value
                        } else if (e?.target?.value) {
                          value = e.target.value
                        }
                        setCurrentException(c => ({ ...c, end_time: value }))
                      }}
                      disabled={currentException.is_day_off}
                    />
                  </Group>
                  <Group justify="flex-end">
                    <Button variant="outline" color="red" onClick={handleDeleteException} loading={exceptionSaving}>
                      Clear Exception
                    </Button>
                    <Button onClick={handleSaveException} loading={exceptionSaving}>
                      Save Exception
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Text c="dimmed">Select a date to set an exception.</Text>
              )}
            </Grid.Col>
          </Grid>
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          opened={resetPasswordModal}
          onClose={() => {
            setResetPasswordModal(false)
            setResetPasswordEmployee(null)
          }}
          title="Reset Employee Password"
        >
          <Stack gap="md">
            <Text>
              Are you sure you want to reset the password for{' '}
              <strong>
                {resetPasswordEmployee
                  ? `${resetPasswordEmployee.first_name || ''} ${resetPasswordEmployee.last_name || ''}`.trim() || 'this employee'
                  : 'this employee'}
              </strong>
              ?
            </Text>
            <Text size="sm" c="dimmed">
              The employee will be required to set a new password on their next login attempt.
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setResetPasswordModal(false)
                  setResetPasswordEmployee(null)
                }}
              >
                Cancel
              </Button>
              <Button color="orange" onClick={handleResetPassword}>
                Reset Password
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Paper>
    </Container>
  )
}

