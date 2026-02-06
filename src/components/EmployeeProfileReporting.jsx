'use client'

import { useEffect, useMemo, useState } from 'react'
import { Container, Title, Paper, Group, Text, Stack, Divider, Grid, Badge, ActionIcon, Select, Modal, TextInput, Button, Switch, LoadingOverlay } from '@mantine/core'
import { IconEdit, IconCalendar, IconUser, IconBuilding, IconId, IconClock, IconMail, IconPhone, IconBriefcase, IconShield, IconBadge } from '@tabler/icons-react'
import { Calendar, TimeInput } from '@mantine/dates'
import { showSuccess, showError } from '@/utils/notifications'
import { useForm } from '@mantine/form'
import { toYMD } from '@/utils/attendanceUtils'
import { PRIVILEGE_OPTIONS } from '@/utils/employeeUtils'
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions'
import { DateRangeFilter } from '@/components/shared/DateRangeFilter'
import { AdherenceMetrics } from '@/components/shared/AdherenceMetrics'
import { AttendanceTable } from '@/components/shared/AttendanceTable'
import { useDateRange } from '@/hooks/useDateRange'
import { useStatusFilter } from '@/hooks/useStatusFilter'
import { useAdherenceMetrics } from '@/hooks/useAdherenceMetrics'
import { useAttendanceReport } from '@/hooks/useAttendanceReport'

export function EmployeeProfileReporting({ employeeId, isAdminView = false }) {
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  // Use shared hooks
  const { dateRange, setDateRange, dateFilter, setDateFilter } = useDateRange('this-month')
  const { reportRows, loading: reportLoading } = useAttendanceReport(employeeId, dateRange)
  const { statusFilter, setStatusFilter, statusOptions, filteredRows } = useStatusFilter(reportRows)
  const adherenceMetrics = useAdherenceMetrics(reportRows)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const { options: deptOptions } = useDepartmentOptions()
  const [timeZones, setTimeZones] = useState([])
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


  const fetchEmployee = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch employee')
      const found = (json.data || []).find((e) => e.id === employeeId)
      setEmployee(found || null)
    } catch (e) {
      showError(e.message || 'Failed to load employee')
    } finally {
      setLoading(false)
    }
  }



  const fetchTimeZones = async () => {
    if (!isAdminView) return
    try {
      const res = await fetch('/api/hr/time-zones')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch TZs')
      setTimeZones(json.data || [])
    } catch (error) {
      setTimeZones([])
    }
  }

  const fetchExceptions = async (employeeId) => {
    if (!isAdminView || !employeeId) return
    try {
      const res = await fetch(`/api/hr/schedule-exceptions?employee_id=${employeeId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch exceptions')
      setExceptions(json.data || [])
    } catch (error) {
      showError(error.message)
    }
  }

  const fetchLeaveRequests = async (employeeId) => {
    if (!isAdminView || !employeeId) return
    try {
      const res = await fetch(`/api/hr/leave-requests?employee_id=${employeeId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch leave requests')
      setLeaveRequests(json.data || [])
    } catch (error) {
      showError(error.message)
    }
  }

  const fetchEmployeeSchedule = async (employeeId) => {
    if (!isAdminView || !employeeId) return
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

  useEffect(() => {
    if (employeeId) {
      fetchEmployee()
      if (isAdminView) {
        fetchTimeZones()
        fetchEmployeeSchedule(employeeId)
      }
    }
  }, [employeeId, isAdminView])

  const profileItems = useMemo(() => {
    if (!employee) return []

    let scheduleValue = 'N/A'
    if (employeeSchedule) {
      if (employeeSchedule.schedule_name) {
        const scheduleType = employeeSchedule.schedule_type === 'individual' ? 'Individual Override' :
          employeeSchedule.schedule_type === 'department' ? 'Department Default' :
            'No Schedule'
        scheduleValue = `${scheduleType}: ${employeeSchedule.schedule_name}`
      } else {
        scheduleValue = employeeSchedule.schedule_type === 'individual' ? 'Individual Override (No Name)' :
          employeeSchedule.schedule_type === 'department' ? 'Department Default (No Name)' :
            'No Schedule'
      }
    } else if (employee.primary_schedule && employee.primary_schedule !== 'Not Assigned') {
      scheduleValue = employee.primary_schedule
    }

    return [
      { label: 'Name', value: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() },
      { label: 'Department', value: employee?.department?.name || 'N/A' },
      { label: 'Employee ID', value: employee.employee_id || 'N/A' },
      { label: 'ZK User ID', value: employee.zk_user_id ?? 'N/A' },
      { label: 'Schedule', value: scheduleValue },
      { label: 'Status', value: employee.is_active ? 'Enabled' : 'Disabled' },
      { label: 'Email', value: employee.email || 'N/A' },
      { label: 'Phone', value: employee.phone || 'N/A' },
      { label: 'Position', value: employee.position || 'N/A' },
      { label: 'Privilege', value: employee.privilege_text || employee.privilege || 'N/A' },
    ]
  }, [employee, employeeSchedule])


  const tzOptions = timeZones.map((t) => ({ value: String(t.id), label: `${t.id} - ${t.name}` }))

  const handleCreateLeaveRequest = async () => {
    if (!employee?.id || !selectedDate || !isAdminView) return
    try {
      setExceptionSaving(true)
      const payload = {
        employee_id: employee.id,
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
      showSuccess('Leave request created and approved.')
      setShowLeaveRequestForm(false)
      setLeaveRequestForm({ leave_type: 'casual_leave', reason: '' })
      await fetchLeaveRequests(employee.id)
    } catch (error) {
      showError(error.message)
    } finally {
      setExceptionSaving(false)
    }
  }

  const handleDateSelect = (date) => {
    if (!isAdminView) return
    setSelectedDate(date)
    const ymd = toYMD(date)
    const found = exceptions.find(ex => ex.date === ymd)
    setCurrentException(found || { date: ymd, start_time: '', end_time: '', is_day_off: false, is_half_day: false })
  }

  const handleSaveException = async () => {
    if (!isAdminView || !employee?.id || !currentException?.date) return
    try {
      setExceptionSaving(true)

      const payload = {
        employee_id: employee.id,
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
      showSuccess('Exception saved.')
      await fetchExceptions(employee.id)
    } catch (error) {
      showError(error.message, 'Save Failed')
    } finally {
      setExceptionSaving(false)
    }
  }

  const handleDeleteException = async () => {
    if (!isAdminView || !employee?.id || !currentException?.date) return
    try {
      setExceptionSaving(true)
      const res = await fetch('/api/hr/schedule-exceptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          date: currentException.date,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete exception')
      }
      showSuccess('Exception cleared.')
      setCurrentException(null)
      await fetchExceptions(employee.id)
      handleDateSelect(selectedDate)
    } catch (error) {
      showError(error.message, 'Delete Failed')
    } finally {
      setExceptionSaving(false)
    }
  }


  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Group justify="space-between" mb="md">
        <Title order={1}>{isAdminView ? 'Employee Profile' : 'My Attendance Report'}</Title>
        {isAdminView && employee && (
          <ActionIcon
            variant="light"
            color="blue"
            size="lg"
            aria-label="Edit Employee"
            onClick={() => {
              editForm.setValues({
                full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                department_id: employee.department_id || null,
                privilege: employee.privilege ?? 0,
                is_active: Boolean(employee.is_active),
                card_number: employee.card_number || '',
                individual_tz_1: employee.individual_tz_1 ?? null,
                individual_tz_2: employee.individual_tz_2 ?? null,
                individual_tz_3: employee.individual_tz_3 ?? null,
              })
              fetchExceptions(employee.id)
              fetchLeaveRequests(employee.id)
              setAssignOpen(true)
            }}
          >
            <IconEdit size={20} />
          </ActionIcon>
        )}
      </Group>
      <Paper withBorder shadow="sm" p="md" pos="relative">
        <LoadingOverlay visible={loading} />
        {employee ? (
          <Stack>
            {/* Employee Details Section */}
            <Paper withBorder p="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
              <Title order={3} mb="md" size="h4">Employee Information</Title>
              <Grid gutter="md">
                {profileItems.map((it) => {
                  const getIcon = (label) => {
                    switch (label) {
                      case 'Name': return <IconUser size={18} />
                      case 'Department': return <IconBuilding size={18} />
                      case 'Employee ID': return <IconId size={18} />
                      case 'ZK User ID': return <IconBadge size={18} />
                      case 'Schedule': return <IconClock size={18} />
                      case 'Status': return <IconShield size={18} />
                      case 'Email': return <IconMail size={18} />
                      case 'Phone': return <IconPhone size={18} />
                      case 'Position': return <IconBriefcase size={18} />
                      case 'Privilege': return <IconShield size={18} />
                      default: return null
                    }
                  }

                  const isHighlighted = it.label === 'Name' || it.label === 'Status'
                  const isStatus = it.label === 'Status'

                  return (
                    <Grid.Col key={it.label} span={{ base: 12, sm: 6, md: 4 }}>
                      <Group gap="xs" align="flex-start">
                        <div style={{
                          color: 'var(--mantine-color-gray-6)',
                          marginTop: '2px'
                        }}>
                          {getIcon(it.label)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" c="dimmed" fw={500} mb={4}>
                            {it.label}
                          </Text>
                          {isStatus ? (
                            <Badge
                              color={it.value === 'Enabled' ? 'green' : 'red'}
                              variant="light"
                              size="sm"
                            >
                              {it.value}
                            </Badge>
                          ) : (
                            <Text
                              fw={isHighlighted ? 700 : 600}
                              size={isHighlighted ? "md" : "sm"}
                              c={it.value === 'N/A' ? 'dimmed' : undefined}
                              style={{ wordBreak: 'break-word' }}
                            >
                              {it.value}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Grid.Col>
                  )
                })}
              </Grid>
            </Paper>
            <Divider my="sm" />
            <Stack gap="md">
              <div>
                <Text size="sm" fw={500} mb="xs">Quick Filters</Text>
                <DateRangeFilter
                  value={dateRange}
                  onChange={setDateRange}
                  defaultFilter={dateFilter}
                  dateFilter={dateFilter}
                  onFilterChange={setDateFilter}
                />
              </div>

              <Select
                label="Filter by Status"
                placeholder="All Statuses"
                data={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                clearable
                style={{ minWidth: 200 }}
              />
            </Stack>

            {/* Adherence Metrics Visualization */}
            {reportRows.length > 0 && (
              <AdherenceMetrics metrics={adherenceMetrics} />
            )}

            {/* Attendance Table */}
            <AttendanceTable
              data={reportRows}
              loading={reportLoading}
              filteredData={filteredRows}
            />
          </Stack>
        ) : (
          <Text c="dimmed">No employee found</Text>
        )}
      </Paper>

      {/* Admin-only modals */}
      {isAdminView && (
        <>
          <Modal opened={assignOpen} onClose={() => setAssignOpen(false)} title="Edit Employee">
            <form onSubmit={editForm.onSubmit(async (values) => {
              try {
                setAssignSaving(true)
                if (!employee?.id) throw new Error('Missing employee id')
                const [firstName, ...rest] = (values.full_name || '').trim().split(/\s+/)
                const lastName = rest.join(' ')
                const res = await fetch(`/api/hr/employee-update/${employee.id}`, {
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
                showSuccess('Changes saved successfully', 'Employee updated')
                setAssignOpen(false)
                await fetchEmployee()
              } catch (error) {
                showError(error.message || 'Could not update employee', 'Update failed')
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
                  data={PRIVILEGE_OPTIONS}
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
                    fetchEmployeeSchedule(employee?.id)
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
                  Use this if the employee permanently follows a different weekly schedule than their department&apos;s default.
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

          <Modal opened={exceptionModalOpen} onClose={() => setExceptionModalOpen(false)} title={`Exception Schedule: ${employee?.first_name || ''} ${employee?.last_name || ''}`.trim()} size="xl">
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
        </>
      )}
    </Container>
  )
}

