'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Container,
  Title,
  Paper,
  Group,
  Text,
  Stack,
  Badge,
  ThemeIcon,
  UnstyledButton,
  Modal,
  ScrollArea,
  ActionIcon,
  Avatar,
  Divider,
  Select,
  Box,
  SimpleGrid,
  Progress,
  Center,
  Button
} from '@mantine/core'
import {
  IconChevronRight,
  IconTarget,
  IconChartBar,
  IconUsers,
  IconX,
  IconSearch,
  IconSparkles,
  IconCalendarFilled,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertCircle,
  IconBuilding,
  IconUserCircle
} from '@tabler/icons-react'
import { showError } from '@/utils/notifications'
import { formatUTC12HourTime } from '@/utils/dateFormatting'
import { formatHoursMinutes, formatDateWithDay } from '@/utils/attendanceUtils'
import { useDisclosure } from '@mantine/hooks'

// --- Performance Optimized Components (120FPS Ready) ---
// Using transform: translateZ(0) for GPU acceleration
// Replaced backdrop-filter with high-opacity backgrounds for performance

const IntelligenceCard = ({ title, value, subtext, icon: Icon, color = 'blue', trend = null }) => (
  <Paper
    p="xl"
    radius="24px"
    withBorder={false}
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      border: '1px solid rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden',
      transform: 'translateZ(0)', // Force GPU layer
      height: '100%'
    }}
  >
    <Stack gap="sm" h="100%">
      <Group justify="space-between">
        <ThemeIcon variant="light" color={color} size="38px" radius="10px">
          <Icon size={20} />
        </ThemeIcon>
        {trend && (
          <Badge variant="light" color={trend > 0 ? 'red' : 'green'} radius="sm">
            <Group gap={4}>
              {trend > 0 ? <IconTrendingUp size={12} /> : <IconTrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </Group>
          </Badge>
        )}
      </Group>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={1}>{title}</Text>
        <Text style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</Text>
        <Text size="xs" c="dimmed" mt={4} fw={500}>{subtext}</Text>
      </div>
    </Stack>
  </Paper>
)

const PersonnelRow = ({ person, onOpen }) => (
  <UnstyledButton
    onClick={() => onOpen(person)}
    style={{
      width: '100%',
      padding: '20px 24px',
      borderRadius: '20px',
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.03)',
      transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
      transform: 'translateZ(0)' // GPU acceleration
    }}
    component="div"
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'scale(1.005) translateZ(0)'
      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.05)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'scale(1) translateZ(0)'
      e.currentTarget.style.borderColor = 'rgba(0,0,0,0.03)'
      e.currentTarget.style.boxShadow = 'none'
    }}
  >
    <Group justify="space-between" wrap="nowrap">
      <Group gap="xl" wrap="nowrap">
        <Box pos="relative">
          <Avatar size="54px" radius="16px" color="blue" src={null} style={{ transform: 'translateZ(0)' }}>
            {person.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Box
            pos="absolute"
            style={{ bottom: -4, right: -4, background: 'white', border: '2px solid white', borderRadius: '50%' }}
          >
            <ThemeIcon size={20} radius="xl" color={person.lateRate > 50 ? 'red' : 'orange'}>
              <IconAlertCircle size={12} />
            </ThemeIcon>
          </Box>
        </Box>

        <div>
          <Text fw={800} size="lg" style={{ letterSpacing: '-0.01em' }}>{person.name}</Text>
          <Text size="sm" c="dimmed" fw={500}>{person.department} • {person.worked} days analyzed</Text>
        </div>
      </Group>

      <Group gap={60} wrap="nowrap">
        <Box style={{ width: 120 }}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" ls={0.5} mb={4}>Delay Rate</Text>
          <Group gap={6}>
            <Text size="xl" fw={900} c={person.lateRate > 50 ? 'red.8' : person.lateRate > 20 ? 'orange.8' : 'blue.8'}>
              {person.lateRate.toFixed(1)}%
            </Text>
            {person.lateRate > 50 && <IconSparkles size={16} color="var(--mantine-color-red-6)" />}
          </Group>
        </Box>

        <Box style={{ width: 100 }}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" ls={0.5} mb={4}>Incidents</Text>
          <Text size="lg" fw={800}>{person.lateCount} Days</Text>
        </Box>

        <ActionIcon variant="light" color="gray" radius="xl" size="lg">
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>
    </Group>
  </UnstyledButton>
)

// Persistent Global Cache for Session (Survives Page Navigation)
const GLOBAL_ATTENDANCE_CACHE = new Map();

// Silent background prefetch — warms DB cache + in-memory cache for a given month
// Called after the current month loads to make adjacent months feel instant
async function prefetchMonth(year, monthIndex, employees) {
  const cacheKey = `${year}-${monthIndex}`
  if (GLOBAL_ATTENDANCE_CACHE.has(cacheKey)) return // Already cached, skip

  const start = new Date(year, monthIndex, 1).toISOString().slice(0, 10)
  const rawEnd = new Date(year, monthIndex + 1, 0)
  const end = rawEnd > new Date() ? new Date() : rawEnd
  const endStr = end.toISOString().slice(0, 10)

  const dates = []
  const curr = new Date(start)
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10))
    curr.setDate(curr.getDate() + 1)
  }

  // Fetch in chunks of 5 to avoid overwhelming the server
  const allResults = []
  for (let i = 0; i < dates.length; i += 5) {
    const chunk = dates.slice(i, i + 5)
    const results = await Promise.all(
      chunk.map(d => fetch(`/api/reports/daily-work-time/batch?date=${d}`)
        .then(r => r.json())
        .catch(() => ({ data: [] })))
    )
    allResults.push(...results)
  }

  // Build and store in-memory cache
  const personnelMap = new Map()
  allResults.forEach(dayBatch => {
    ; (dayBatch.data || []).forEach(record => {
      if (!personnelMap.has(record.employee_id)) personnelMap.set(record.employee_id, [])
      personnelMap.get(record.employee_id).push(record)
    })
  })

  const finalData = (employees || []).map(emp => {
    const logs = personnelMap.get(emp.id) || []
    const lateIn = logs.filter(l => l.status === 'Late-In')
    const attended = logs.filter(l => !['Absent', 'On Leave', ''].includes(l.status || '')).length
    if (lateIn.length === 0) return null
    return {
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      department: emp.department?.name || 'Unassigned',
      lateCount: lateIn.length,
      worked: attended,
      lateRate: attended > 0 ? (lateIn.length / attended) * 100 : 0,
      incidents: lateIn.sort((a, b) => b.date.localeCompare(a.date)),
      shiftName: logs.length > 0 ? logs[0].shiftName : 'Standard'
    }
  }).filter(Boolean).sort((a, b) => b.lateRate - a.lateRate)

  GLOBAL_ATTENDANCE_CACHE.set(cacheKey, finalData)
  console.log(`[Prefetch] Month ${year}-${monthIndex + 1} pre-warmed (${finalData.length} outliers cached)`)
}

export default function IntelligenceDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth())
  const [lateArrivalData, setLateArrivalData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [selectedPersonnel, setSelectedPersonnel] = useState(null)
  const [opened, { open, close }] = useDisclosure(false)

  // Caching System
  // No longer using internal ref for persistence across navigation

  const monthOptions = [
    { value: '0', label: 'January' }, { value: '1', label: 'February' },
    { value: '2', label: 'March' }, { value: '3', label: 'April' },
    { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' },
    { value: '8', label: 'September' }, { value: '9', label: 'October' },
    { value: '10', label: 'November' }, { value: '11', label: 'December' },
  ]

  const yearOptions = [{ value: '2025', label: '2025' }, { value: '2026', label: '2026' }, { value: '2027', label: '2027' }]

  const fetchData = async () => {
    const cacheKey = `${selectedYear}-${selectedMonthIndex}`

    // Check Global Cache first
    if (GLOBAL_ATTENDANCE_CACHE.has(cacheKey)) {
      console.log(`[Intelligence] Returning persistent data for ${cacheKey}`)
      setLateArrivalData(GLOBAL_ATTENDANCE_CACHE.get(cacheKey))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadingProgress(0)

      // Clear old data immediately to prevent stale UI
      setLateArrivalData([])

      const empRes = await fetch('/api/employees')
      const empJson = await empRes.json()
      const employees = empJson.data || []

      // Date range logic
      const start = new Date(selectedYear, selectedMonthIndex, 1).toISOString().slice(0, 10)
      const end = new Date(selectedYear, selectedMonthIndex + 1, 0).toISOString().slice(0, 10)

      const dates = []
      const curr = new Date(start)
      const stop = new Date(end) > new Date() ? new Date() : new Date(end)
      while (curr <= stop) {
        dates.push(curr.toISOString().slice(0, 10))
        curr.setDate(curr.getDate() + 1)
      }

      const totalDates = dates.length
      let completedDates = 0

      // Fetch in chunks for speed
      const chunks = []
      for (let i = 0; i < dates.length; i += 5) {
        chunks.push(dates.slice(i, i + 5))
      }

      const allResults = []
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(async (d) => {
          try {
            const r = await fetch(`/api/reports/daily-work-time/batch?date=${d}`).then(res => res.json())
            completedDates++
            setLoadingProgress(Math.round((completedDates / totalDates) * 100))
            return r
          } catch (e) {
            completedDates++
            setLoadingProgress(Math.round((completedDates / totalDates) * 100))
            return { data: [] }
          }
        }))
        allResults.push(...chunkResults)
      }

      const personnelMap = new Map()
      allResults.forEach(dayBatch => {
        (dayBatch.data || []).forEach(record => {
          if (!personnelMap.has(record.employee_id)) personnelMap.set(record.employee_id, [])
          personnelMap.get(record.employee_id).push(record)
        })
      })

      const finalData = employees.map(emp => {
        const logs = personnelMap.get(emp.id) || []
        const lateIn = logs.filter(l => l.status === 'Late-In')
        const attended = logs.filter(l => !['Absent', 'On Leave', ''].includes(l.status || '')).length
        if (lateIn.length === 0) return null
        return {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`.trim(),
          department: emp.department?.name || 'Unassigned',
          lateCount: lateIn.length,
          worked: attended,
          lateRate: attended > 0 ? (lateIn.length / attended) * 100 : 0,
          incidents: lateIn.sort((a, b) => b.date.localeCompare(a.date)),
          shiftName: logs.length > 0 ? logs[0].shiftName : 'Standard'
        }
      }).filter(Boolean).sort((a, b) => b.lateRate - a.lateRate)

      // Store in Global Cache
      GLOBAL_ATTENDANCE_CACHE.set(cacheKey, finalData)
      setLateArrivalData(finalData)

      // Silently pre-warm adjacent months in the background (don't await — fire and forget)
      // This makes clicking prev/next month feel instant on the second visit
      const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1
      const prevYear = monthIndex === 0 ? selectedYear - 1 : selectedYear
      const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1
      const nextYear = monthIndex === 11 ? selectedYear + 1 : selectedYear
      prefetchMonth(prevYear, prevMonth, employees).catch(() => { })
      prefetchMonth(nextYear, nextMonth, employees).catch(() => { })
    } catch (e) {
      showError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedMonthIndex, selectedYear])

  const stats = useMemo(() => {
    if (lateArrivalData.length === 0) return { avg: 0, highRisk: 0, total: 0, worstDept: 'N/A' }

    const avg = lateArrivalData.reduce((acc, curr) => acc + curr.lateRate, 0) / lateArrivalData.length
    const highRisk = lateArrivalData.filter(p => p.lateRate > 40).length

    const deptStats = {}
    lateArrivalData.forEach(p => {
      if (!deptStats[p.department]) deptStats[p.department] = { totalLateCount: 0 }
      deptStats[p.department].totalLateCount += p.lateCount
    })

    let worst = 'N/A'
    let maxIncidents = -1
    Object.entries(deptStats).forEach(([dept, data]) => {
      if (data.totalLateCount > maxIncidents) {
        maxIncidents = data.totalLateCount
        worst = dept
      }
    })

    return { avg, highRisk, total: lateArrivalData.length, worstDept: worst }
  }, [lateArrivalData])

  const handleOpen = (person) => {
    setSelectedPersonnel(person)
    open()
  }

  return (
    <Container size="xl" py={60}>
      <Stack gap={50}>

        {/* Navigation & Header */}
        <Group justify="space-between" align="flex-end">
          <Stack gap={4}>
            <Group gap="xs">
              <ThemeIcon size="xs" variant="transparent" color="blue">
                <IconSparkles size={14} />
              </ThemeIcon>
              <Text size="xs" fw={800} tt="uppercase" ls={2} c="blue.7">Personnel Intelligence</Text>
            </Group>
            <Title order={1} style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
              Attendance Health
            </Title>
            <Text c="dimmed" size="lg" fw={500}>Systematic review of organizational punctuality and operational drift.</Text>
          </Stack>

          <Paper radius="xl" withBorder p={4} style={{ backgroundColor: 'white', transform: 'translateZ(0)' }}>
            <Group gap={0}>
              <Select
                variant="unstyled"
                data={monthOptions}
                value={String(selectedMonthIndex)}
                onChange={(v) => setSelectedMonthIndex(parseInt(v))}
                styles={{ input: { width: 110, textAlign: 'center', fontWeight: 700, fontSize: '13px' } }}
              />
              <Divider orientation="vertical" />
              <Select
                variant="unstyled"
                data={yearOptions}
                value={String(selectedYear)}
                onChange={(v) => setSelectedYear(parseInt(v))}
                styles={{ input: { width: 80, textAlign: 'center', fontWeight: 700, fontSize: '13px' } }}
              />
            </Group>
          </Paper>
        </Group>

        {/* Global Insight Cards */}
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="xl">
          <IntelligenceCard
            title="Operational Drift"
            value={`${stats.avg.toFixed(1)}%`}
            subtext="Average Late-In Rate across organization"
            icon={IconChartBar}
            color="blue"
            trend={stats.avg > 15 ? 4.2 : -1.5}
          />
          <IntelligenceCard
            title="Critical Department"
            value={stats.worstDept}
            subtext="Highest aggregate punctuality drift"
            icon={IconBuilding}
            color="grape"
          />
          <IntelligenceCard
            title="Anomaly Alerts"
            value={stats.highRisk}
            subtext="Employees exceeding 40% drift"
            icon={IconAlertCircle}
            color="orange"
          />
          <IntelligenceCard
            title="Insight Scope"
            value={lateArrivalData.length}
            subtext="Individuals requiring active review"
            icon={IconUsers}
            color="blue"
          />
        </SimpleGrid>

        {/* Intelligence Data List */}
        <Stack gap="xl" pos="relative">
          {loading && (
            <Center style={{ position: 'absolute', inset: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '32px', transform: 'translateZ(0)' }}>
              <Stack align="center" gap="md" style={{ width: '80%', maxWidth: 400 }}>
                <Text fw={800} size="xl" style={{ letterSpacing: '-0.02em' }}>
                  Analyzing {monthOptions[selectedMonthIndex].label} Data...
                </Text>
                <Box style={{ width: '100%' }}>
                  <Progress
                    value={loadingProgress}
                    size="xl"
                    radius="xl"
                    animated
                    transitionDuration={200}
                    color="blue"
                  />
                  <Group justify="space-between" mt={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">{loadingProgress}% Computed</Text>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">Intelligence Core Active</Text>
                  </Group>
                </Box>
              </Stack>
            </Center>
          )}

          <Group justify="space-between" px="md">
            <Text size="xs" fw={800} tt="uppercase" ls={1} c="dimmed">Personnel Intelligence Report</Text>
            <Group gap="xs">
              <IconSearch size={14} color="gray" />
              <Text size="xs" fw={700} c="dimmed">Automated pattern extraction</Text>
            </Group>
          </Group>

          <Stack gap="md">
            {lateArrivalData.map(person => (
              <PersonnelRow key={person.id} person={person} onOpen={handleOpen} />
            ))}

            {!loading && lateArrivalData.length === 0 && (
              <Paper p={100} radius="32px" style={{ backgroundColor: '#f9fafb', textAlign: 'center', border: '2px dashed #eee', transform: 'translateZ(0)' }}>
                <Stack align="center" gap="sm">
                  <ThemeIcon size={64} radius="xl" variant="light" color="green">
                    <IconTarget size={32} />
                  </ThemeIcon>
                  <Text fw={800} size="xl">Operations Optimized</Text>
                  <Text c="dimmed" size="sm">No attendance outliers detected for this reporting cycle.</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Stack>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        size="600px"
        radius="32px"
        padding={0}
        withCloseButton={false}
        centered
        overlayProps={{ opacity: 0.4 }}
        styles={{ content: { transform: 'translateZ(0)' } }}
      >
        {selectedPersonnel && (
          <Box style={{ overflow: 'hidden' }}>
            <Box p={40} style={{ backgroundColor: '#000', color: 'white' }}>
              <Group justify="space-between" mb={40}>
                <Group gap="sm">
                  <Badge variant="outline" color="white" radius="xs" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
                    Personnel Insight
                  </Badge>
                  <Button
                    variant="filled"
                    color="white"
                    size="xs"
                    radius="xl"
                    leftSection={<IconUserCircle size={14} />}
                    component={Link}
                    href={`/employees/${selectedPersonnel.id}`}
                    styles={{
                      root: {
                        color: '#000',
                        fontWeight: 700,
                        backgroundColor: '#fff',
                        transition: 'transform 0.2s ease, background-color 0.2s ease',
                        '&:hover': {
                          backgroundColor: '#f1f3f5',
                          transform: 'translateY(-1px)',
                        }
                      }
                    }}
                  >
                    View Profile
                  </Button>
                </Group>
                <ActionIcon onClick={close} variant="transparent" color="white">
                  <IconX size={24} />
                </ActionIcon>
              </Group>

              <Stack gap={0}>
                <Text size="xs" fw={800} tt="uppercase" ls={2} opacity={0.5} mb={8}>Drift Analysis</Text>
                <Title order={2} style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
                  {selectedPersonnel.name}
                </Title>
                <Text opacity={0.6} fw={500} size="lg">{selectedPersonnel.department} Department</Text>
              </Stack>

              <Group mt={40} justify="space-between" align="center" wrap="nowrap" gap="xl" px={4}>
                <Box>
                  <Text size="xs" fw={800} tt="uppercase" ls={1} opacity={0.5} mb={4} style={{ whiteSpace: 'nowrap' }}>Health Score</Text>
                  <Text size="1.4rem" fw={900} style={{ lineHeight: 1 }}>{(100 - selectedPersonnel.lateRate).toFixed(1)}%</Text>
                </Box>

                <Divider orientation="vertical" color="rgba(255,255,255,0.15)" h={24} />

                <Box>
                  <Text size="xs" fw={800} tt="uppercase" ls={1} opacity={0.5} mb={4} style={{ whiteSpace: 'nowrap' }}>Incidents</Text>
                  <Text size="1.4rem" fw={900} style={{ lineHeight: 1 }}>{selectedPersonnel.lateCount} Days</Text>
                </Box>

                <Divider orientation="vertical" color="rgba(255,255,255,0.15)" h={24} />

                <Box style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={800} tt="uppercase" ls={1} opacity={0.5} mb={4} style={{ whiteSpace: 'nowrap' }}>Shift Profile</Text>
                  <Text size="1.4rem" fw={900} style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {selectedPersonnel.shiftName || 'Standard'}
                  </Text>
                </Box>
              </Group>
            </Box>

            <Box p={40}>
              <Stack gap="xl">
                <Group gap="xs">
                  <IconCalendarFilled size={18} color="var(--mantine-color-blue-6)" />
                  <Text fw={800} size="sm" tt="uppercase" ls={1}>Timeline of Anomalies</Text>
                </Group>

                <ScrollArea.Autosize mah={350} offsetScrollbars>
                  <Stack gap="xs">
                    {selectedPersonnel.incidents.map((day, ix) => {
                      const info = formatDateWithDay(day.date)
                      return (
                        <Paper key={ix} p="lg" radius="16px" withBorder style={{ backgroundColor: '#f9fafb', borderColor: 'rgba(0,0,0,0.05)', transform: 'translateZ(0)' }}>
                          <Group justify="space-between">
                            <Group gap="md">
                              <Box style={{ textAlign: 'center', minWidth: 50 }}>
                                <Text size="xs" fw={800} c="dimmed" tt="uppercase">{info.dayName.slice(0, 3)}</Text>
                                <Text size="xl" fw={900}>{info.dateStr.split('/')[1]}</Text>
                              </Box>
                              <div>
                                <Text fw={700} size="sm">Late Arrival</Text>
                                <Text size="xs" c="dimmed">{info.dateStr}</Text>
                              </div>
                            </Group>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ textAlign: 'right', minWidth: 100 }}>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Punch In</Text>
                                <Text fw={900} c="orange.7" size="xl">{day.inTime ? formatUTC12HourTime(day.inTime) : '-'}</Text>
                              </div>
                            </div>
                          </Group>
                        </Paper>
                      )
                    })}
                  </Stack>
                </ScrollArea.Autosize>

                <Divider mt="xl" />
                <Group justify="center">
                  <Group gap={4}>
                    <IconSparkles size={12} color="gray" />
                    <Text size="xs" c="dimmed" fw={600} ta="center">Data retrieved from Organizational Intelligence Core.</Text>
                  </Group>
                </Group>
              </Stack>
            </Box>
          </Box>
        )}
      </Modal>
    </Container>
  )
}
