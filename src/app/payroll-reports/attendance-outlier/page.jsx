'use client'

import { useEffect, useState, Fragment } from 'react'
import { Container, Title, Paper, Group, Text, Table, LoadingOverlay, Stack, Badge, ActionIcon, Card, Grid, Divider, Select, Tabs } from '@mantine/core'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { showError } from '@/utils/notifications'
import { formatUTC12Hour, formatUTC12HourTime } from '@/utils/dateFormatting'
import { formatHoursMinutes, formatDateWithDay } from '@/utils/attendanceUtils'
import { useRouter } from 'next/navigation'

export default function AttendanceOutlierPage() {
  const router = useRouter()
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth())
  
  const selectedMonth = new Date(selectedYear, selectedMonthIndex, 1)
  
  const handleTabChange = (value) => {
    if (value === 'payroll-summary') {
      router.push('/payroll-reports')
    }
  }
  
  const monthOptions = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ]
  
  const currentYear = now.getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i
    return { value: String(year), label: String(year) }
  })
  const [lateArrivalData, setLateArrivalData] = useState([])
  const [lateArrivalLoading, setLateArrivalLoading] = useState(false)
  const [expandedEmployees, setExpandedEmployees] = useState(new Set())
  const [employeeLateDetails, setEmployeeLateDetails] = useState(new Map())
  const [expandedDays, setExpandedDays] = useState(new Set())

  // Convert month to date range
  const getMonthDateRange = (monthDate) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0) // Last day of month
    
    // If current month, end should be today
    const now = new Date()
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    const endDate = isCurrentMonth ? now : end
    
    return {
      start: start.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10)
    }
  }

  const fetchLateArrivalReport = async () => {
    try {
      setLateArrivalLoading(true)
      const { start, end } = getMonthDateRange(selectedMonth)

      // Fetch all active employees
      const employeesRes = await fetch('/api/employees')
      const employeesJson = await employeesRes.json()
      if (!employeesRes.ok) throw new Error(employeesJson.error || 'Failed to fetch employees')
      const employees = employeesJson.data || []

      // Generate all dates in the range
      const dates = []
      const startDate = new Date(start)
      const endDate = new Date(end)
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10))
      }

      console.log(`[Outlier] Fetching data for ${dates.length} dates using batch endpoint (cached)`)

      // Fetch data for all dates using batch endpoint (much faster with cache!)
      const datePromises = dates.map(async (dateStr) => {
        try {
          const batchRes = await fetch(`/api/reports/daily-work-time/batch?date=${dateStr}`)
          const batchJson = await batchRes.json()
          if (!batchRes.ok) {
            console.warn(`[Outlier] Failed to fetch batch for ${dateStr}:`, batchJson.error)
            return { date: dateStr, data: [] }
          }
          return { date: dateStr, data: batchJson.data || [] }
        } catch (error) {
          console.error(`[Outlier] Error fetching batch for ${dateStr}:`, error)
          return { date: dateStr, data: [] }
        }
      })

      const dateResults = await Promise.all(datePromises)
      console.log(`[Outlier] Fetched data for ${dateResults.length} dates`)

      // Build a map of employee_id -> array of daily reports
      const employeeReportsMap = new Map()
      
      dateResults.forEach(({ date, data }) => {
        data.forEach((dayData) => {
          const empId = dayData.employee_id
          if (!employeeReportsMap.has(empId)) {
            employeeReportsMap.set(empId, [])
          }
          employeeReportsMap.get(empId).push({
            ...dayData,
            date: date
          })
        })
      })

      // Process each employee's reports
      const results = []
      
      employees.forEach((employee) => {
        const dailyReports = employeeReportsMap.get(employee.id) || []
        
        // Filter for Late-In days
        const lateDays = dailyReports.filter(day => day.status === 'Late-In')
        
        if (lateDays.length === 0) {
          return // Skip employees with no late arrivals
        }

        // Calculate total days worked (exclude Absent, On Leave)
        const daysWorked = dailyReports.filter(day => {
          const status = day.status || ''
          return status !== 'Absent' && status !== 'On Leave' && status !== ''
        }).length

        const lateCount = lateDays.length
        const latePercentage = daysWorked > 0 ? (lateCount / daysWorked) * 100 : 0

        results.push({
          employee_id: employee.id,
          employee_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_id || 'Unknown',
          department: employee.department?.name || 'No Department',
          total_days_worked: daysWorked,
          late_count: lateCount,
          late_percentage: Math.round(latePercentage * 100) / 100
        })
      })

      // Sort by late percentage (descending), then by late count (descending)
      results.sort((a, b) => {
        if (b.late_percentage !== a.late_percentage) {
          return b.late_percentage - a.late_percentage
        }
        return b.late_count - a.late_count
      })

      setLateArrivalData(results)
    } catch (error) {
      console.error('[Attendance Outlier] Error:', error)
      showError(error.message || 'Failed to generate attendance outlier report')
    } finally {
      setLateArrivalLoading(false)
    }
  }

  const fetchEmployeeLateDetails = async (employeeId) => {
    if (employeeLateDetails.has(employeeId)) {
      return // Already fetched
    }

    try {
      const { start, end } = getMonthDateRange(selectedMonth)
      const qs = new URLSearchParams({
        employee_id: employeeId,
        start_date: start,
        end_date: end
      })
      const reportRes = await fetch(`/api/reports/daily-work-time?${qs.toString()}`)
      const reportJson = await reportRes.json()
      
      if (!reportRes.ok) {
        throw new Error(reportJson.error || 'Failed to fetch employee details')
      }

      const dailyReports = reportJson.data || []
      const lateDays = dailyReports.filter(day => day.status === 'Late-In')
      
      setEmployeeLateDetails(prev => {
        const newMap = new Map(prev)
        newMap.set(employeeId, lateDays)
        return newMap
      })
    } catch (error) {
      console.error(`Error fetching late details for employee ${employeeId}:`, error)
      showError(`Failed to fetch details for employee: ${error.message}`)
    }
  }

  const toggleEmployeeExpansion = async (employeeId) => {
    const newExpanded = new Set(expandedEmployees)
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId)
    } else {
      newExpanded.add(employeeId)
      // Fetch details if not already loaded
      await fetchEmployeeLateDetails(employeeId)
    }
    setExpandedEmployees(newExpanded)
  }

  const toggleDayExpansion = (dayKey) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey)
    } else {
      newExpanded.add(dayKey)
    }
    setExpandedDays(newExpanded)
  }

  const getLatePercentageColor = (percentage) => {
    if (percentage <= 10) return 'green'
    if (percentage <= 25) return 'yellow'
    if (percentage <= 50) return 'orange'
    return 'red'
  }

  // Calculate summary statistics
  const summaryStats = {
    totalEmployees: lateArrivalData.length,
    totalLateDays: lateArrivalData.reduce((sum, emp) => sum + emp.late_count, 0),
    averageLatePercentage: lateArrivalData.length > 0
      ? Math.round((lateArrivalData.reduce((sum, emp) => sum + emp.late_percentage, 0) / lateArrivalData.length) * 100) / 100
      : 0
  }

  useEffect(() => {
    // Auto-fetch on mount and when month/year changes
    fetchLateArrivalReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonthIndex])

  const rows = lateArrivalData.map((employee) => {
    const isExpanded = expandedEmployees.has(employee.employee_id)
    const lateDays = employeeLateDetails.get(employee.employee_id) || []

    return (
      <Fragment key={employee.employee_id}>
        <Table.Tr
          style={{ cursor: 'pointer' }}
          onClick={() => toggleEmployeeExpansion(employee.employee_id)}
        >
          <Table.Td>
            <Group gap="xs">
              <ActionIcon variant="subtle" size="sm">
                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </ActionIcon>
              <Text fw={500}>{employee.employee_name}</Text>
            </Group>
          </Table.Td>
          <Table.Td>{employee.department}</Table.Td>
          <Table.Td>{employee.total_days_worked}</Table.Td>
          <Table.Td>{employee.late_count}</Table.Td>
          <Table.Td>
            <Badge color={getLatePercentageColor(employee.late_percentage)} variant="light">
              {employee.late_percentage.toFixed(1)}%
            </Badge>
          </Table.Td>
        </Table.Tr>
        {isExpanded && (
          <Table.Tr>
            <Table.Td colSpan={5} style={{ backgroundColor: 'var(--mantine-color-gray-0)', padding: 0 }}>
              <Paper p="md" withBorder>
                <Text fw={600} mb="md">Late-In Days for {employee.employee_name}</Text>
                {lateDays.length === 0 ? (
                  <Text c="dimmed">Loading details...</Text>
                ) : (
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
                    <Table.Tbody>
                      {lateDays.map((day, dayIdx) => {
                        const dayKey = `${employee.employee_id}-${day.date}`
                        const isDayExpanded = expandedDays.has(dayKey)
                        const dateInfo = formatDateWithDay(day.date)
                        const isWeekend = dateInfo.dayName === 'Saturday' || dateInfo.dayName === 'Sunday'

                        return (
                          <Fragment key={dayKey}>
                            <Table.Tr
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleDayExpansion(dayKey)
                              }}
                            >
                              <Table.Td>
                                <Group gap="xs">
                                  <ActionIcon variant="subtle" size="sm">
                                    {isDayExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
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
                                  {day.inTime ? formatUTC12HourTime(day.inTime) : '-'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text fw={500}>
                                  {day.outTime ? formatUTC12HourTime(day.outTime) : '-'}
                                </Text>
                              </Table.Td>
                              <Table.Td>{formatHoursMinutes(day.regularHours ?? 0)}</Table.Td>
                              <Table.Td>{formatHoursMinutes(day.overtimeHours ?? 0)}</Table.Td>
                              <Table.Td>{formatHoursMinutes((day.regularHours ?? 0) + (day.overtimeHours ?? 0))}</Table.Td>
                              <Table.Td>
                                <Badge color="orange" variant="light">
                                  {day.status || 'Late-In'}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                            {isDayExpanded && (
                              <Table.Tr>
                                <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-1)' }}>
                                  <Paper p="md" withBorder>
                                    <Stack gap="xs">
                                      <Group justify="space-between">
                                        <Text size="sm" fw={600}>Full Details</Text>
                                        <Badge color="orange" variant="light">
                                          {day.status || 'Late-In'}
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
                                          <Text fw={500}>{day.status || 'Late-In'}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                          <Text size="xs" c="dimmed">In Time</Text>
                                          <Text fw={500}>{day.inTime ? formatUTC12Hour(day.inTime) : '-'}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                          <Text size="xs" c="dimmed">Out Time</Text>
                                          <Text fw={500}>{day.outTime ? formatUTC12Hour(day.outTime) : '-'}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                          <Text size="xs" c="dimmed">Regular Hours</Text>
                                          <Text fw={500}>{formatHoursMinutes(day.regularHours ?? 0)}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={6}>
                                          <Text size="xs" c="dimmed">Overtime Hours</Text>
                                          <Text fw={500}>{formatHoursMinutes(day.overtimeHours ?? 0)}</Text>
                                        </Grid.Col>
                                        <Grid.Col span={12}>
                                          <Text size="xs" c="dimmed">Total Duration</Text>
                                          <Text fw={500}>{formatHoursMinutes(day.durationHours ?? 0)}</Text>
                                        </Grid.Col>
                                      </Grid>
                                    </Stack>
                                  </Paper>
                                </Table.Td>
                              </Table.Tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                )}
              </Paper>
            </Table.Td>
          </Table.Tr>
        )}
      </Fragment>
    )
  })

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Payroll Reports</Title>

      <Tabs value="attendance-outlier" onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="payroll-summary">Payroll Summary</Tabs.Tab>
          <Tabs.Tab value="attendance-outlier">Attendance Outlier</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="attendance-outlier" pt="md">
          <Title order={2} mb="md">Attendance Outlier Report</Title>
          <Paper withBorder shadow="sm" p="md">
            <Stack gap="md">
              <Group align="end" wrap="wrap" gap="md">
                <Select
                  label="Select Month"
                  placeholder="Pick a month"
                  data={monthOptions}
                  value={String(selectedMonthIndex)}
                  onChange={(value) => {
                    if (value !== null) {
                      setSelectedMonthIndex(parseInt(value, 10))
                    }
                  }}
                />
                <Select
                  label="Select Year"
                  placeholder="Pick a year"
                  data={yearOptions}
                  value={String(selectedYear)}
                  onChange={(value) => {
                    if (value !== null) {
                      setSelectedYear(parseInt(value, 10))
                    }
                  }}
                />
                <Text size="sm" c="dimmed" style={{ alignSelf: 'center' }}>
                  Defaults to current month
                </Text>
              </Group>

              {/* Summary Statistics */}
              {lateArrivalData.length > 0 && (
                <Card withBorder p="md" radius="md">
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <div>
                        <Text size="xs" c="dimmed" fw={500} mb={4}>Employees with Late Arrivals</Text>
                        <Text size="xl" fw={700}>{summaryStats.totalEmployees}</Text>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <div>
                        <Text size="xs" c="dimmed" fw={500} mb={4}>Total Late-In Days</Text>
                        <Text size="xl" fw={700}>{summaryStats.totalLateDays}</Text>
                      </div>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <div>
                        <Text size="xs" c="dimmed" fw={500} mb={4}>Average Late Percentage</Text>
                        <Text size="xl" fw={700}>{summaryStats.averageLatePercentage.toFixed(1)}%</Text>
                      </div>
                    </Grid.Col>
                  </Grid>
                </Card>
              )}

              <Paper withBorder pos="relative">
                <LoadingOverlay visible={lateArrivalLoading} />
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th fw={600}>Employee</Table.Th>
                      <Table.Th fw={600}>Department</Table.Th>
                      <Table.Th fw={600}>Total Days Worked</Table.Th>
                      <Table.Th fw={600}>Late-In Count</Table.Th>
                      <Table.Th fw={600}>Late-In Percentage</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows}
                    {lateArrivalData.length === 0 && !lateArrivalLoading && (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text c="dimmed" ta="center" py="md">
                            No employees with late arrivals found for the selected month
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

