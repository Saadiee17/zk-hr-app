'use client'

import { useState } from 'react'
import {
  Container,
  Title,
  Paper,
  Stack,
  Button,
  Table,
  Badge,
  Group,
  LoadingOverlay,
  Text,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconFileDownload, IconSearch } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function EmployeeReportsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  const fetchReports = async () => {
    if (!startDate || !endDate) {
      notifications.show({
        title: 'Error',
        message: 'Please select both start and end dates',
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
      setLoading(true)

      const startDateStr = startDate.toISOString().slice(0, 10)
      const endDateStr = endDate.toISOString().slice(0, 10)

      const res = await fetch(
        `/api/reports/daily-work-time?employee_id=${user.employeeId}&start_date=${startDateStr}&end_date=${endDateStr}`
      )
      const data = await res.json()

      if (res.ok) {
        setReports(data.data || [])
        if (!data.data || data.data.length === 0) {
          notifications.show({
            title: 'No Data',
            message: 'No attendance data found for the selected period',
            color: 'blue',
          })
        }
      } else {
        throw new Error(data.error || 'Failed to fetch reports')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (reports.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No data to export',
        color: 'red',
        icon: <IconX size={18} />,
      })
      return
    }

    const headers = ['Date', 'In Time', 'Out Time', 'Duration (hrs)', 'Regular (hrs)', 'Overtime (hrs)', 'Status']
    const rows = reports.map((r) => [
      r.date,
      r.inTime ? formatUTC12HourTime(r.inTime) : '-',
      r.outTime ? formatUTC12HourTime(r.outTime) : '-',
      r.durationHours || 0,
      r.regularHours || 0,
      r.overtimeHours || 0,
      r.status || 'N/A',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${startDate.toISOString().slice(0, 10)}-to-${endDate.toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    notifications.show({
      title: 'Success',
      message: 'Report exported successfully',
      color: 'green',
      icon: <IconCheck size={18} />,
    })
  }

  const getStatusColor = (status) => {
    if (!status) return 'gray'
    if (status === 'On-Time') return 'green'
    if (status.includes('Late')) return 'orange'
    if (status === 'Absent') return 'red'
    if (status === 'On Leave') return 'blue'
    return 'gray'
  }

  // Calculate totals
  const totalHours = reports.reduce((sum, r) => sum + (r.durationHours || 0), 0)
  const totalRegular = reports.reduce((sum, r) => sum + (r.regularHours || 0), 0)
  const totalOvertime = reports.reduce((sum, r) => sum + (r.overtimeHours || 0), 0)

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <AdminAccessBanner />
        <Title order={1}>My Attendance Reports</Title>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group align="flex-end">
              <DatePickerInput
                label="Start Date"
                placeholder="Select start date"
                value={startDate}
                onChange={setStartDate}
                style={{ flex: 1 }}
              />

              <DatePickerInput
                label="End Date"
                placeholder="Select end date"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate}
                style={{ flex: 1 }}
              />

              <Button
                leftSection={<IconSearch size={18} />}
                onClick={fetchReports}
                loading={loading}
              >
                Generate Report
              </Button>

              {reports.length > 0 && (
                <Button
                  variant="light"
                  leftSection={<IconFileDownload size={18} />}
                  onClick={exportToCSV}
                >
                  Export CSV
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {reports.length > 0 && (
          <>
            <Paper withBorder p="md" radius="md">
              <Group>
                <div>
                  <Text size="sm" c="dimmed">Total Hours</Text>
                  <Text size="xl" fw={700}>{Math.round(totalHours * 10) / 10} hrs</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Regular Hours</Text>
                  <Text size="xl" fw={700}>{Math.round(totalRegular * 10) / 10} hrs</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Overtime Hours</Text>
                  <Text size="xl" fw={700} c="blue">{Math.round(totalOvertime * 10) / 10} hrs</Text>
                </div>
              </Group>
            </Paper>

            <Paper withBorder radius="md">
              <LoadingOverlay visible={loading} />
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>In Time</Table.Th>
                    <Table.Th>Out Time</Table.Th>
                    <Table.Th>Duration</Table.Th>
                    <Table.Th>Regular</Table.Th>
                    <Table.Th>Overtime</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {reports.map((report, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>{report.date}</Table.Td>
                      <Table.Td>
                        {report.inTime ? formatUTC12HourTime(report.inTime) : '-'}
                      </Table.Td>
                      <Table.Td>
                        {report.outTime ? formatUTC12HourTime(report.outTime) : '-'}
                      </Table.Td>
                      <Table.Td>{report.durationHours || 0} hrs</Table.Td>
                      <Table.Td>{report.regularHours || 0} hrs</Table.Td>
                      <Table.Td>{report.overtimeHours || 0} hrs</Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(report.status)} variant="light">
                          {report.status || 'N/A'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </>
        )}

        {reports.length === 0 && !loading && (
          <Paper withBorder p="xl">
            <Text c="dimmed" ta="center">
              Select a date range and click "Generate Report" to view your attendance data
            </Text>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}



