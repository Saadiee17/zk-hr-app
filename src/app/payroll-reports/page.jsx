'use client'

import { useEffect, useState } from 'react'
import { Container, Title, Paper, Text, Button, Group, Table, Stack, Select, Alert, ActionIcon, Collapse, Badge } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconInfoCircle, IconChevronDown } from '@tabler/icons-react'
import { DatePickerInput } from '@mantine/dates'
import { formatUTC12Hour } from '@/utils/dateFormatting'

export default function PayrollReportsPage() {
  const [payrollRange, setPayrollRange] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    return [start, end]
  })
  const [payrollEmployeeId, setPayrollEmployeeId] = useState(null)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollRows, setPayrollRows] = useState([])
  const [payrollDailyRows, setPayrollDailyRows] = useState([])
  const [payrollStatusBreakdownOpen, setPayrollStatusBreakdownOpen] = useState(false)
  const [employees, setEmployees] = useState([])

  const toYMD = (d) => new Date(d).toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(json => {
        if (json.data) setEmployees(json.data || [])
      })
      .catch(() => setEmployees([]))
  }, [])

  const generatePayroll = async () => {
    try {
      setPayrollLoading(true)
      setPayrollDailyRows([])
      const [start, end] = payrollRange || []
      if (!start || !end) throw new Error('Select a date range')
      const qs = new URLSearchParams({ start_date: toYMD(start), end_date: toYMD(end) })
      if (payrollEmployeeId) qs.set('employee_id', payrollEmployeeId)
      const res = await fetch(`/api/reports/payroll?${qs.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate report')
      setPayrollRows(json.data || [])

      if (payrollEmployeeId) {
        const dailyQs = new URLSearchParams({ employee_id: payrollEmployeeId, start_date: toYMD(start), end_date: toYMD(end) })
        const dailyRes = await fetch(`/api/reports/daily-work-time?${dailyQs.toString()}`)
        const dailyJson = await dailyRes.json()
        if (dailyRes.ok && Array.isArray(dailyJson.data)) {
          setPayrollDailyRows(dailyJson.data)
        } else {
          setPayrollDailyRows([])
        }
      } else {
        setPayrollDailyRows([])
      }
    } catch (e) {
      notifications.show({ title: 'Report error', message: e.message || 'Failed to generate report', color: 'red' })
    } finally {
      setPayrollLoading(false)
    }
  }

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Payroll Reports</Title>

      <Paper withBorder shadow="sm" p="md">
        <Stack gap="md">
          <Group align="end" wrap="wrap" gap="md">
            <DatePickerInput
              type="range"
              label="Reporting Period"
              placeholder="Pick range"
              value={payrollRange}
              onChange={setPayrollRange}
              clearable
            />
            <Select
              label="Employee"
              placeholder="All employees"
              data={(employees || []).map((e) => ({ value: e.id, label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id }))}
              value={payrollEmployeeId}
              onChange={setPayrollEmployeeId}
              searchable
              clearable
            />
            <Button onClick={generatePayroll} loading={payrollLoading}>Generate Report</Button>
          </Group>

          <Paper withBorder>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th fw={600}>Employee</Table.Th>
                  <Table.Th fw={600}>Total Days Worked</Table.Th>
                  <Table.Th fw={600}>Total Regular Hours</Table.Th>
                  <Table.Th fw={600}>Total Overtime Hours</Table.Th>
                  <Table.Th fw={600}>Total Hours Worked</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payrollRows.map((r, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{r.employee_name}</Table.Td>
                    <Table.Td>{r.total_days_worked}</Table.Td>
                    <Table.Td>{r.total_regular_hours ?? '-'}</Table.Td>
                    <Table.Td>{r.total_overtime_hours ?? '-'}</Table.Td>
                    <Table.Td>{r.total_hours_worked}</Table.Td>
                  </Table.Tr>
                ))}
                {(!payrollRows || payrollRows.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={5}><Text c="dimmed">No data</Text></Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>

          <Paper withBorder p="md">
            <Alert
              icon={<IconInfoCircle size={18} />}
              title="Status Breakdown Guide"
              color="blue"
              onClick={() => setPayrollStatusBreakdownOpen(!payrollStatusBreakdownOpen)}
              style={{ cursor: 'pointer' }}
            >
              <Group justify="space-between">
                <Text size="sm" fw={500}>Click to view status definitions</Text>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPayrollStatusBreakdownOpen(!payrollStatusBreakdownOpen)
                  }}
                >
                  <IconChevronDown
                    size={16}
                    style={{
                      transform: payrollStatusBreakdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </ActionIcon>
              </Group>
            </Alert>
            <Collapse in={payrollStatusBreakdownOpen} mt="md">
              <Stack gap="xs">
                <Group gap="md">
                  <Badge color="green" variant="light" size="lg">On-Time</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee punched in on time (within grace period) for a scheduled shift
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="orange" variant="light" size="lg">Late-In</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee punched in late (beyond grace period) for a scheduled shift
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="blue" variant="light" size="lg">Present</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee punched in/out but no shift was scheduled for that day (worked on unscheduled day)
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="yellow" variant="light" size="lg">Half Day</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee worked on a scheduled half-day exception (regular hours calculated at 50% of shift)
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="violet" variant="light" size="lg">On Leave</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee had approved leave and no punches recorded for that day
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="red" variant="light" size="lg">Absent</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee did not punch in and a shift was scheduled (no approved leave)
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge color="grape" variant="light" size="lg">Out of Schedule</Badge>
                  <Text size="sm" style={{ flex: 1 }}>
                    Employee punched in/out but at times outside the scheduled shift window (e.g., punched at 11 AM when shift is 8 PM - 5 AM)
                  </Text>
                </Group>
              </Stack>
            </Collapse>
          </Paper>

          <Paper withBorder>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th fw={600}>Date</Table.Th>
                  <Table.Th fw={600}>In Time</Table.Th>
                  <Table.Th fw={600}>Out Time</Table.Th>
                  <Table.Th fw={600}>Regular Hours</Table.Th>
                  <Table.Th fw={600}>Overtime Hours</Table.Th>
                  <Table.Th fw={600}>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payrollDailyRows.map((d, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{d.date}</Table.Td>
                    <Table.Td>{d.inTime ? formatUTC12Hour(d.inTime) : '-'}</Table.Td>
                    <Table.Td>{d.outTime ? formatUTC12Hour(d.outTime) : '-'}</Table.Td>
                    <Table.Td>{d.regularHours ?? 0}</Table.Td>
                    <Table.Td>{d.overtimeHours ?? 0}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          d.status === 'On-Time' ? 'green' :
                          d.status === 'Late-In' ? 'orange' :
                          d.status === 'Present' ? 'blue' :
                          d.status === 'On Leave' ? 'violet' :
                          d.status === 'Half Day' ? 'yellow' :
                          d.status === 'Out of Schedule' ? 'grape' :
                          d.status === 'Absent' ? 'red' : 'gray'
                        }
                        variant="light"
                      >
                        {d.status || 'Unknown'}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {(!payrollEmployeeId || payrollDailyRows.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed">{!payrollEmployeeId ? 'Select an employee and generate to view daily details' : 'No daily details'}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>
      </Paper>
    </Container>
  )
}






