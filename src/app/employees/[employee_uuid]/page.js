'use client'

import { useEffect, useMemo, useState, Fragment } from 'react'
import { useParams } from 'next/navigation'
import { Container, Title, Paper, Group, Text, Table, LoadingOverlay, Stack, Divider, Progress, RingProgress, Grid, Badge, Card, Alert, Collapse, ActionIcon, Select, Modal, TextInput, Button, Switch, Tooltip } from '@mantine/core'
import { IconInfoCircle, IconChevronDown, IconChevronRight, IconEdit, IconCheck, IconX, IconCalendar, IconUser, IconBuilding, IconId, IconClock, IconMail, IconPhone, IconBriefcase, IconShield, IconBadge } from '@tabler/icons-react'
import { DatePickerInput, Calendar, TimeInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useForm } from '@mantine/form'
import { formatUTC12Hour, formatUTC12HourTime } from '@/utils/dateFormatting'

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

export default function EmployeeProfilePage() {
  const params = useParams()
  const employeeId = params?.employee_uuid

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportRows, setReportRows] = useState([])
  const [statusBreakdownOpen, setStatusBreakdownOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('')
  const [dateRange, setDateRange] = useState(() => {
    // Default to this month
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date()
    return [start, end]
  })
  const [dateFilter, setDateFilter] = useState('this-month')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignSaving, setAssignSaving] = useState(false)
  const [deptOptions, setDeptOptions] = useState([])
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
      notifications.show({ title: 'Error', message: e.message || 'Failed to load employee', color: 'red' })
    } finally {
      setLoading(false)
    }
  }

  const toYMD = (d) => new Date(d).toISOString().slice(0, 10)

  const fetchReport = async () => {
    if (!employeeId || !dateRange?.[0] || !dateRange?.[1]) return
    try {
      setReportLoading(true)
      const qs = new URLSearchParams({
        employee_id: employeeId,
        start_date: toYMD(dateRange[0]),
        end_date: toYMD(dateRange[1]),
      })
      const res = await fetch(`/api/reports/daily-work-time?${qs.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch report')
      setReportRows(json.data || [])
    } catch (e) {
      notifications.show({ title: 'Error', message: e.message || 'Failed to load report', color: 'red' })
    } finally {
      setReportLoading(false)
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

  useEffect(() => {
    fetchEmployee()
    fetchDeptOptions()
    fetchTimeZones()
    fetchEmployeeSchedule(employeeId)
  }, [employeeId])

  useEffect(() => {
    fetchReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, dateRange])

  const profileItems = useMemo(() => {
    if (!employee) return []
    
    // Format schedule information
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
      // Fallback to primary_schedule if employeeSchedule is not loaded yet
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

  // Calculate adherence metrics
  const adherenceMetrics = useMemo(() => {
    if (!reportRows || reportRows.length === 0) {
      return {
        adherence: 0,
        totalDays: 0,
        onTime: 0,
        lateIn: 0,
        absent: 0,
        present: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalHours: 0,
        statusBreakdown: {},
      }
    }

    const statusCounts = {}
    let onTime = 0
    let lateIn = 0
    let absent = 0
    let present = 0
    let onLeave = 0
    let halfDay = 0
    let totalRegularHours = 0
    let totalOvertimeHours = 0

    reportRows.forEach((row) => {
      const status = row.status || 'Unknown'
      statusCounts[status] = (statusCounts[status] || 0) + 1

      if (status === 'On-Time') onTime++
      else if (status === 'Late-In') lateIn++
      else if (status === 'Absent') absent++
      else if (status === 'Present') present++
      else if (status === 'On Leave') onLeave++
      else if (status === 'Half Day') {
        // Half days count as present but track separately
        present++
        halfDay++
      }
      else if (status === 'Out of Schedule') {
        // Out of Schedule counts as present but track separately
        present++
      }

      totalRegularHours += Number(row.regularHours) || 0
      totalOvertimeHours += Number(row.overtimeHours) || 0
    })

    const totalDays = reportRows.length
    const attendedDays = onTime + lateIn + present
    const adherence = totalDays > 0 ? Math.round((onTime / totalDays) * 100) : 0

    return {
      adherence,
      totalDays,
      onTime,
      lateIn,
      absent,
      present,
      onLeave,
      halfDay,
      attendedDays,
      totalRegularHours: Math.round(totalRegularHours * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalHours: Math.round((totalRegularHours + totalOvertimeHours) * 100) / 100,
      statusBreakdown: statusCounts,
    }
  }, [reportRows])

  // Helper to format date with day name
  const formatDateWithDay = (dateStr) => {
    try {
      const date = new Date(dateStr + 'T00:00:00Z')
      // Add 5 hours to get Pakistan date
      const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[pakistaniDate.getUTCDay()]
      const month = String(pakistaniDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(pakistaniDate.getUTCDate()).padStart(2, '0')
      const year = pakistaniDate.getUTCFullYear()
      return { dayName, dateStr: `${month}/${day}/${year}` }
    } catch (e) {
      return { dayName: '', dateStr: dateStr }
    }
  }

  // Get unique statuses for filter dropdown
  const statusOptions = useMemo(() => {
    const statuses = [...new Set(reportRows.map(r => r.status).filter(Boolean))]
    return [
      { value: '', label: 'All Statuses' },
      ...statuses.map(s => ({ value: s, label: s }))
    ]
  }, [reportRows])

  // Filter rows by status
  const filteredRows = useMemo(() => {
    if (!statusFilter || statusFilter === '') return reportRows
    return reportRows.filter(r => r.status === statusFilter)
  }, [reportRows, statusFilter])

  const toggleRow = (dateStr) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr)
    } else {
      newExpanded.add(dateStr)
    }
    setExpandedRows(newExpanded)
  }

  const tzOptions = timeZones.map((t) => ({ value: String(t.id), label: `${t.id} - ${t.name}` }))

  const handleCreateLeaveRequest = async () => {
    if (!employee?.id || !selectedDate) return
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
      notifications.show({ title: 'Success', message: 'Leave request created and approved.', color: 'green' })
      setShowLeaveRequestForm(false)
      setLeaveRequestForm({ leave_type: 'casual_leave', reason: '' })
      await fetchLeaveRequests(employee.id)
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
    if (!employee?.id || !currentException?.date) return
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
      notifications.show({ title: 'Success', message: 'Exception saved.', color: 'green' })
      await fetchExceptions(employee.id)
    } catch (error) {
      notifications.show({ title: 'Save Failed', message: error.message, color: 'red' })
    } finally {
      setExceptionSaving(false)
    }
  }
  
  const handleDeleteException = async () => {
    if (!employee?.id || !currentException?.date) return
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
        const json = await res.json().catch(()=>({}))
        throw new Error(json.error || 'Failed to delete exception')
      }
      notifications.show({ title: 'Success', message: 'Exception cleared.', color: 'green' })
      setCurrentException(null)
      await fetchExceptions(employee.id)
      handleDateSelect(selectedDate)
    } catch (error) {
      notifications.show({ title: 'Delete Failed', message: error.message, color: 'red' })
    } finally {
      setExceptionSaving(false)
    }
  }

  const rows = filteredRows.map((r, idx) => {
    const isExpanded = expandedRows.has(r.date)
    const dateInfo = formatDateWithDay(r.date)
    const isWeekend = dateInfo.dayName === 'Saturday' || dateInfo.dayName === 'Sunday'
    // Use a unique key combining date and index to handle duplicate dates
    const uniqueKey = `${r.date}-${idx}`
    
    return (
      <Fragment key={uniqueKey}>
        <Table.Tr 
          style={{ cursor: 'pointer' }}
          onClick={() => toggleRow(r.date)}
        >
          <Table.Td>
            <Group gap="xs">
              <ActionIcon variant="subtle" size="sm">
                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </ActionIcon>
              <div>
                <Text 
                  fw={isWeekend ? 600 : 500} 
                  size="sm"
                  c={isWeekend ? 'blue' : undefined}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
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
              {r.inTime ? formatUTC12HourTime(r.inTime) : '-'}
            </Text>
          </Table.Td>
          <Table.Td>
            <Text fw={500}>
              {r.outTime ? formatUTC12HourTime(r.outTime) : '-'}
            </Text>
          </Table.Td>
          <Table.Td>{formatHoursMinutes(r.regularHours ?? 0)}</Table.Td>
          <Table.Td>{formatHoursMinutes(r.overtimeHours ?? 0)}</Table.Td>
          <Table.Td>{formatHoursMinutes((r.regularHours ?? 0) + (r.overtimeHours ?? 0))}</Table.Td>
          <Table.Td>
            <Badge
              color={
                r.status === 'On-Time' ? 'green' :
                r.status === 'Late-In' ? 'orange' :
                r.status === 'Present' ? 'blue' :
                r.status === 'On Leave' ? 'violet' :
                r.status === 'Half Day' ? 'yellow' :
                r.status === 'Out of Schedule' ? 'grape' :
                r.status === 'Punch Out Missing' ? 'red' :
                r.status === 'Absent' ? 'red' : 'gray'
              }
              variant="light"
            >
              {r.status || 'Unknown'}
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
                        r.status === 'On-Time' ? 'green' :
                        r.status === 'Late-In' ? 'orange' :
                        r.status === 'Present' ? 'blue' :
                        r.status === 'On Leave' ? 'violet' :
                        r.status === 'Half Day' ? 'yellow' :
                        r.status === 'Out of Schedule' ? 'grape' :
                        r.status === 'Punch Out Missing' ? 'red' :
                        r.status === 'Absent' ? 'red' : 'gray'
                      }
                      variant="light"
                    >
                      {r.status || 'Unknown'}
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
                      <Text fw={500}>{r.status || 'Unknown'}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">In Time</Text>
                      <Text fw={500}>{r.inTime ? formatUTC12Hour(r.inTime) : '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">Out Time</Text>
                      <Text fw={500}>{r.outTime ? formatUTC12Hour(r.outTime) : '-'}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">Regular Hours</Text>
                      <Text fw={500}>{formatHoursMinutes(r.regularHours ?? 0)}</Text>
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <Text size="xs" c="dimmed">Overtime Hours</Text>
                      <Text fw={500}>{formatHoursMinutes(r.overtimeHours ?? 0)}</Text>
                    </Grid.Col>
                    <Grid.Col span={12}>
                      <Text size="xs" c="dimmed">Total Duration</Text>
                      <Text fw={500}>{formatHoursMinutes(r.durationHours ?? 0)}</Text>
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

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Group justify="space-between" mb="md">
        <Title order={1}>Employee Profile</Title>
        {employee && (
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
                  // Map labels to icons
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
                  
                  // Determine if value should be highlighted
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
              {/* Quick Date Filters */}
              <div>
                <Text size="sm" fw={500} mb="xs">Quick Filters</Text>
                <Group gap="xs" wrap="wrap">
                  <Button
                    variant={dateFilter === 'today' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      setDateRange([today, today])
                      setDateFilter('today')
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant={dateFilter === 'yesterday' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      yesterday.setHours(0, 0, 0, 0)
                      setDateRange([yesterday, yesterday])
                      setDateFilter('yesterday')
                    }}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant={dateFilter === 'this-week' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const startOfWeek = new Date(now)
                      const day = startOfWeek.getDay()
                      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday as start of week
                      startOfWeek.setDate(diff)
                      startOfWeek.setHours(0, 0, 0, 0)
                      setDateRange([startOfWeek, now])
                      setDateFilter('this-week')
                    }}
                  >
                    This Week
                  </Button>
                  <Button
                    variant={dateFilter === 'last-week' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const startOfThisWeek = new Date(now)
                      const day = startOfThisWeek.getDay()
                      const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1)
                      startOfThisWeek.setDate(diff)
                      startOfThisWeek.setHours(0, 0, 0, 0)
                      const endOfLastWeek = new Date(startOfThisWeek)
                      endOfLastWeek.setDate(endOfLastWeek.getDate() - 1)
                      const startOfLastWeek = new Date(endOfLastWeek)
                      startOfLastWeek.setDate(startOfLastWeek.getDate() - 6)
                      setDateRange([startOfLastWeek, endOfLastWeek])
                      setDateFilter('last-week')
                    }}
                  >
                    Last Week
                  </Button>
                  <Button
                    variant={dateFilter === 'this-month' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      const start = new Date(now.getFullYear(), now.getMonth(), 1)
                      setDateRange([start, now])
                      setDateFilter('this-month')
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant={dateFilter === 'custom' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => {
                      setDateFilter('custom')
                    }}
                  >
                    Custom
                  </Button>
                </Group>
              </div>
              
              {/* Custom Date Picker (shown when custom is selected) */}
              {dateFilter === 'custom' && (
              <DatePickerInput
                type="range"
                  label="Custom Date Range"
                placeholder="Pick range"
                value={dateRange}
                  onChange={(range) => {
                    setDateRange(range)
                    if (range && range[0] && range[1]) {
                      setDateFilter('custom')
                    } else {
                      // If cleared, reset to this month
                      const now = new Date()
                      const start = new Date(now.getFullYear(), now.getMonth(), 1)
                      setDateRange([start, now])
                      setDateFilter('this-month')
                    }
                  }}
                clearable
              />
              )}
              
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
              <Paper withBorder p="md" mt="md" radius="md">
                <Stack gap="md">
                  <div>
                    <Title order={4} mb={4}>Attendance Adherence</Title>
                    <Text size="sm" c="dimmed">Performance overview for the selected period</Text>
                  </div>
                  
                  <Grid gutter="md">
                    {/* On-Time Adherence Card - Compact */}
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                      <Card withBorder p="md" radius="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Stack gap="md" align="center" justify="center" style={{ flex: 1, minHeight: 0 }}>
                          <Text size="xs" c="dimmed" fw={500} ta="center" style={{ letterSpacing: '0.5px' }}>
                            On-Time Rate
                          </Text>
                          <RingProgress
                            size={140}
                            thickness={14}
                            sections={[
                              { 
                                value: adherenceMetrics.adherence, 
                                color: adherenceMetrics.adherence >= 80 ? 'teal' : adherenceMetrics.adherence >= 60 ? 'yellow' : 'red' 
                              },
                            ]}
                            label={
                              <div style={{ textAlign: 'center' }}>
                                <Text ta="center" fw={700} size="xl" style={{ lineHeight: 1.2 }}>
                                {adherenceMetrics.adherence}%
                              </Text>
                              </div>
                            }
                          />
                          <div style={{ textAlign: 'center', width: '100%' }}>
                            <Text size="sm" fw={600} mb={2}>
                              {adherenceMetrics.onTime} / {adherenceMetrics.totalDays}
                          </Text>
                            <Text size="xs" c="dimmed">
                              days on-time
                            </Text>
                          </div>
                        </Stack>
                      </Card>
                    </Grid.Col>
                    
                    {/* Status Breakdown Card - Simplified */}
                    <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
                      <Card withBorder p="md" radius="md" style={{ height: '100%' }}>
                        <Stack gap="md">
                          <Group justify="space-between" align="flex-start">
                            <div>
                              <Text size="sm" fw={600} mb="xs">Status Breakdown</Text>
                              <Text size="xs" c="dimmed">Attendance distribution</Text>
                            </div>
                            <Tooltip label="View status definitions" withArrow>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                color="gray"
                                onClick={() => setStatusBreakdownOpen(!statusBreakdownOpen)}
                              >
                                <IconInfoCircle size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                          
                          {statusBreakdownOpen && (
                            <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                              <Collapse in={statusBreakdownOpen}>
                                <Stack gap={4}>
                                  <Text size="xs" fw={600} mb={4}>Status Definitions:</Text>
                                  <Text size="xs"><strong>On-Time:</strong> Punched in within grace period</Text>
                                  <Text size="xs"><strong>Late-In:</strong> Punched in after grace period</Text>
                                  <Text size="xs"><strong>Present:</strong> Worked on unscheduled day</Text>
                                  <Text size="xs"><strong>Absent:</strong> No punch, shift scheduled</Text>
                                  <Text size="xs"><strong>On Leave:</strong> Approved leave, no punches</Text>
                                  <Text size="xs"><strong>Half Day:</strong> Scheduled half-day exception</Text>
                                </Stack>
                              </Collapse>
                            </Paper>
                          )}
                          
                          <Stack gap="xs">
                            <Group justify="space-between" p="xs" style={{ 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Group gap="xs">
                                <div style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--mantine-color-teal-6)'
                                }} />
                                <Text size="sm">On-Time</Text>
                              </Group>
                              <Group gap="md">
                                <Text size="sm" fw={600}>{adherenceMetrics.onTime}</Text>
                                <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                  {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.onTime / adherenceMetrics.totalDays) * 100) : 0}%
                                </Text>
                            </Group>
                            </Group>
                            
                            <Group justify="space-between" p="xs" style={{ 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Group gap="xs">
                                <div style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--mantine-color-orange-6)'
                                }} />
                                <Text size="sm">Late-In</Text>
                              </Group>
                              <Group gap="md">
                                <Text size="sm" fw={600}>{adherenceMetrics.lateIn}</Text>
                                <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                  {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.lateIn / adherenceMetrics.totalDays) * 100) : 0}%
                                </Text>
                            </Group>
                            </Group>
                            
                            <Group justify="space-between" p="xs" style={{ 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Group gap="xs">
                                <div style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--mantine-color-blue-6)'
                                }} />
                                <Text size="sm">Present</Text>
                              </Group>
                              <Group gap="md">
                                <Text size="sm" fw={600}>{adherenceMetrics.present}</Text>
                                <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                  {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.present / adherenceMetrics.totalDays) * 100) : 0}%
                                </Text>
                            </Group>
                            </Group>
                            
                            <Group justify="space-between" p="xs" style={{ 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Group gap="xs">
                                <div style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--mantine-color-red-6)'
                                }} />
                                <Text size="sm">Absent</Text>
                              </Group>
                              <Group gap="md">
                                <Text size="sm" fw={600}>{adherenceMetrics.absent}</Text>
                                <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                  {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.absent / adherenceMetrics.totalDays) * 100) : 0}%
                                </Text>
                            </Group>
                            </Group>
                            
                            {adherenceMetrics.onLeave > 0 && (
                              <Group justify="space-between" p="xs" style={{ 
                                borderRadius: '6px',
                                backgroundColor: 'var(--mantine-color-gray-0)'
                              }}>
                              <Group gap="xs">
                                  <div style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--mantine-color-violet-6)'
                                  }} />
                                  <Text size="sm">On Leave</Text>
                              </Group>
                                <Group gap="md">
                                  <Text size="sm" fw={600}>{adherenceMetrics.onLeave || 0}</Text>
                                  <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                    {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.onLeave / adherenceMetrics.totalDays) * 100) : 0}%
                                  </Text>
                            </Group>
                              </Group>
                            )}
                            
                            {adherenceMetrics.halfDay > 0 && (
                              <Group justify="space-between" p="xs" style={{ 
                                borderRadius: '6px',
                                backgroundColor: 'var(--mantine-color-gray-0)'
                              }}>
                                <Group gap="xs">
                                  <div style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--mantine-color-yellow-6)'
                                  }} />
                                  <Text size="sm">Half Day</Text>
                                </Group>
                                <Group gap="md">
                                  <Text size="sm" fw={600}>{adherenceMetrics.halfDay || 0}</Text>
                                  <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                                    {adherenceMetrics.totalDays > 0 ? Math.round((adherenceMetrics.halfDay / adherenceMetrics.totalDays) * 100) : 0}%
                                  </Text>
                                </Group>
                              </Group>
                            )}
                          </Stack>
                          
                          <Divider />
                          
                          <Group justify="space-between">
                            <Text size="sm" fw={500}>Total Days</Text>
                            <Text fw={700} size="md">{adherenceMetrics.totalDays}</Text>
                          </Group>
                        </Stack>
                      </Card>
                    </Grid.Col>
                    
                    {/* Hours Summary Card - Simplified */}
                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                      <Card withBorder p="md" radius="md" style={{ height: '100%' }}>
                        <Stack gap="md">
                          <div>
                            <Text size="sm" fw={600} mb="xs">Hours Summary</Text>
                            <Text size="xs" c="dimmed">Work hours breakdown</Text>
                          </div>
                          
                          <Stack gap="sm">
                            <div>
                              <Group justify="space-between" mb={4}>
                                <Text size="sm">Regular Hours</Text>
                                <Text fw={600} size="sm">{formatHoursMinutes(adherenceMetrics.totalRegularHours)}</Text>
                              </Group>
                              <Progress
                                value={adherenceMetrics.totalHours > 0 ? (adherenceMetrics.totalRegularHours / adherenceMetrics.totalHours) * 100 : 0}
                                color="blue"
                                size="sm"
                                radius="sm"
                              />
                            </div>
                            
                            <div>
                              <Group justify="space-between" mb={4}>
                                <Text size="sm">Overtime Hours</Text>
                                <Text fw={600} size="sm">{formatHoursMinutes(adherenceMetrics.totalOvertimeHours)}</Text>
                              </Group>
                              <Progress
                                value={adherenceMetrics.totalHours > 0 ? (adherenceMetrics.totalOvertimeHours / adherenceMetrics.totalHours) * 100 : 0}
                                color="orange"
                                size="sm"
                                radius="sm"
                              />
                            </div>
                            
                            <Divider />
                            
                            <Group justify="space-between" p="xs" style={{ 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Text size="sm" fw={600}>Total Hours</Text>
                              <Text fw={700} size="md">{formatHoursMinutes(adherenceMetrics.totalHours)}</Text>
                            </Group>
                          </Stack>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  </Grid>

                  {/* Status Distribution - Compact Grid */}
                      {adherenceMetrics.totalDays > 0 && (
                          <div>
                      <Text size="sm" fw={600} mb="sm">Status Distribution</Text>
                      <Grid gutter="xs">
                        <Grid.Col span={{ base: 6, sm: 3 }}>
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '6px',
                            backgroundColor: 'var(--mantine-color-gray-0)'
                          }}>
                            <Text size="xs" c="dimmed" mb={4}>On-Time</Text>
                            <Text size="lg" fw={700} mb={4}>
                              {Math.round((adherenceMetrics.onTime / adherenceMetrics.totalDays) * 100)}%
                            </Text>
                            <Progress
                              value={(adherenceMetrics.onTime / adherenceMetrics.totalDays) * 100}
                              color="teal"
                              size="sm"
                              radius="sm"
                            />
                          </div>
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, sm: 3 }}>
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '6px',
                            backgroundColor: 'var(--mantine-color-gray-0)'
                          }}>
                            <Text size="xs" c="dimmed" mb={4}>Late-In</Text>
                            <Text size="lg" fw={700} mb={4}>
                              {Math.round((adherenceMetrics.lateIn / adherenceMetrics.totalDays) * 100)}%
                            </Text>
                            <Progress
                              value={(adherenceMetrics.lateIn / adherenceMetrics.totalDays) * 100}
                              color="orange"
                              size="sm"
                              radius="sm"
                            />
                          </div>
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, sm: 3 }}>
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '6px',
                            backgroundColor: 'var(--mantine-color-gray-0)'
                          }}>
                            <Text size="xs" c="dimmed" mb={4}>Present</Text>
                            <Text size="lg" fw={700} mb={4}>
                              {Math.round((adherenceMetrics.present / adherenceMetrics.totalDays) * 100)}%
                            </Text>
                            <Progress
                              value={(adherenceMetrics.present / adherenceMetrics.totalDays) * 100}
                              color="blue"
                              size="sm"
                              radius="sm"
                            />
                          </div>
                        </Grid.Col>
                        <Grid.Col span={{ base: 6, sm: 3 }}>
                          <div style={{ 
                            padding: '8px', 
                            borderRadius: '6px',
                            backgroundColor: 'var(--mantine-color-gray-0)'
                          }}>
                            <Text size="xs" c="dimmed" mb={4}>Absent</Text>
                            <Text size="lg" fw={700} mb={4}>
                              {Math.round((adherenceMetrics.absent / adherenceMetrics.totalDays) * 100)}%
                            </Text>
                            <Progress
                              value={(adherenceMetrics.absent / adherenceMetrics.totalDays) * 100}
                              color="red"
                              size="sm"
                              radius="sm"
                            />
                          </div>
                        </Grid.Col>
                          {adherenceMetrics.onLeave > 0 && (
                          <Grid.Col span={{ base: 6, sm: 3 }}>
                            <div style={{ 
                              padding: '8px', 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Text size="xs" c="dimmed" mb={4}>On Leave</Text>
                              <Text size="lg" fw={700} mb={4}>
                                {Math.round((adherenceMetrics.onLeave / adherenceMetrics.totalDays) * 100)}%
                              </Text>
                              <Progress
                                value={(adherenceMetrics.onLeave / adherenceMetrics.totalDays) * 100}
                                color="violet"
                                size="sm"
                                radius="sm"
                              />
                            </div>
                          </Grid.Col>
                          )}
                          {adherenceMetrics.halfDay > 0 && (
                          <Grid.Col span={{ base: 6, sm: 3 }}>
                            <div style={{ 
                              padding: '8px', 
                              borderRadius: '6px',
                              backgroundColor: 'var(--mantine-color-gray-0)'
                            }}>
                              <Text size="xs" c="dimmed" mb={4}>Half Day</Text>
                              <Text size="lg" fw={700} mb={4}>
                                {Math.round((adherenceMetrics.halfDay / adherenceMetrics.totalDays) * 100)}%
                              </Text>
                              <Progress
                                value={(adherenceMetrics.halfDay / adherenceMetrics.totalDays) * 100}
                                color="yellow"
                                size="sm"
                                radius="sm"
                              />
                            </div>
                          </Grid.Col>
                          )}
                      </Grid>
                    </div>
                      )}
                </Stack>
              </Paper>
            )}


            <Paper withBorder p="sm" pos="relative" mt="md">
              <LoadingOverlay visible={reportLoading} />
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
                {filteredRows.length === 0 && reportRows.length > 0 && (
                  <Table.Caption>
                    <Text c="dimmed" size="sm">
                      No records match the selected filter. Showing {reportRows.length} total record{reportRows.length !== 1 ? 's' : ''}.
                    </Text>
                  </Table.Caption>
                )}
                <Table.Tbody>
                  {rows}
                  {(!reportRows || reportRows.length === 0) && (
                    <Table.Tr>
                      <Table.Td colSpan={7}><Text c="dimmed">No records</Text></Table.Td>
                    </Table.Tr>
                  )}
                  {reportRows.length > 0 && filteredRows.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={7}><Text c="dimmed">No records match the selected filter</Text></Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        ) : (
          <Text c="dimmed">No employee found</Text>
        )}
      </Paper>

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
            notifications.show({
              title: 'Employee updated',
              message: 'Changes saved successfully',
              color: 'green',
              icon: <IconCheck size={18} />,
            })
            setAssignOpen(false)
            await fetchEmployee()
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
    </Container>
  )
}



