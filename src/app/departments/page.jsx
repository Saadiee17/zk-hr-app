'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Container, Title, Paper, Text, TextInput, NumberInput, Button, Group,
  Table, Modal, ActionIcon, Stack, Select, Grid, ThemeIcon, Badge, Tooltip,
  Box, Divider, Tabs, Checkbox, ScrollArea, Avatar, MultiSelect, Alert,
  Progress, SimpleGrid, RingProgress, Center, Loader
} from '@mantine/core'
import {
  IconPencil, IconTrash, IconBuilding, IconList, IconCalendar, IconPlus,
  IconMoon, IconSun, IconUsers, IconAlertCircle, IconCheck, IconRefresh,
  IconArrowBack, IconPlayerPlay, IconSearch, IconClockHour4, IconBuildingSkyscraper
} from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'

// ─── Helper: parse tz_string to a human-readable schedule ───
function parseTzStringToSchedule(tzString) {
  if (!tzString || tzString.length < 56) return []
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days.map((day, i) => {
    const seg = tzString.slice(i * 8, i * 8 + 8)
    const start = seg.slice(0, 4)
    const end = seg.slice(4, 8)
    const isOff = start === '0000' && end === '2359'
    if (isOff) return { day, isWorking: false }
    const fmt = (hhmm) => {
      const h = parseInt(hhmm.slice(0, 2)), m = hhmm.slice(2, 4)
      const period = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${m}${period}`
    }
    return { day, isWorking: true, startTime: fmt(start), endTime: fmt(end) }
  })
}

// ─── Shift Preview Card ───
function ShiftPreviewCard({ tz }) {
  if (!tz) return null
  const schedule = parseTzStringToSchedule(tz.tz_string)
  const workingDays = schedule.filter(d => d.isWorking)
  const sample = workingDays[0]
  return (
    <Box p="md" style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
      <Group gap="xs" mb="xs">
        <ThemeIcon size="sm" radius="xl" variant="light" color="violet">
          <IconClockHour4 size={12} />
        </ThemeIcon>
        <Text size="xs" fw={700} c="violet.7">{tz.name}</Text>
      </Group>
      {sample && (
        <Text size="xs" c="dimmed" fw={500}>
          {sample.startTime} → {sample.endTime} • {workingDays.map(d => d.day).join(', ')}
          {tz.buffer_time_minutes > 30 && (
            <Badge size="xs" variant="dot" color="orange" ml={6}>
              Flexible ±{Math.round(tz.buffer_time_minutes / 60)}h window
            </Badge>
          )}
        </Text>
      )}
    </Box>
  )
}

export default function DepartmentsPage() {
  // ─── Departments tab state ───
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleDept, setScheduleDept] = useState(null)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleVals, setScheduleVals] = useState({ tz_id_1: null, tz_id_2: null, tz_id_3: null })
  const [timeZones, setTimeZones] = useState([])

  // ─── Shift Overrides tab state ───
  const [employees, setEmployees] = useState([])
  const [activeOverrides, setActiveOverrides] = useState([])
  const [overrideLoading, setOverrideLoading] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)
  const [overrideLabel, setOverrideLabel] = useState('Ramzan 2026')
  const [activeFrom, setActiveFrom] = useState('2025-02-19')
  const [activeUntil, setActiveUntil] = useState('2026-03-20')
  const [applying, setApplying] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [deptFilter, setDeptFilter] = useState(null)
  const [search, setSearch] = useState('')

  // Fetch all data
  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hr/departments')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch departments')
      setDepartments(json.data || [])
    } catch (error) {
      showError(error.message, 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTimeZones = useCallback(async () => {
    try {
      const res = await fetch('/api/hr/time-zones')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTimeZones(json.data || [])
    } catch { setTimeZones([]) }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      setEmployees(json.data || [])
    } catch { setEmployees([]) }
  }, [])

  const fetchActiveOverrides = useCallback(async () => {
    try {
      setOverrideLoading(true)
      const res = await fetch('/api/hr/schedule-overrides')
      const json = await res.json()
      setActiveOverrides(json.data || [])
    } catch { setActiveOverrides([]) }
    finally { setOverrideLoading(false) }
  }, [])

  useEffect(() => {
    fetchDepartments()
    fetchTimeZones()
    fetchEmployees()
    fetchActiveOverrides()
  }, [fetchDepartments, fetchTimeZones, fetchEmployees, fetchActiveOverrides])

  // ─── Override tz options — only "special" shifts (id >= 50) ───
  const overrideShiftOptions = timeZones
    .filter(tz => tz.id >= 50)
    .map(tz => ({ value: String(tz.id), label: tz.name }))

  const tzOptions = timeZones.map(t => ({ value: String(t.id), label: `${t.id} - ${t.name}` }))

  // ─── Employee list for the bulk-assign panel ───
  const overriddenEmployeeIds = new Set(activeOverrides.map(o => o.employee_id))
  const filteredEmployees = employees.filter(emp => {
    const matchesDept = deptFilter ? emp.department_id === deptFilter : true
    const matchesSearch = search
      ? `${emp.first_name} ${emp.last_name} ${emp.employee_id}`.toLowerCase().includes(search.toLowerCase())
      : true
    return matchesDept && matchesSearch
  })

  const deptFilterOptions = departments.map(d => ({ value: d.id, label: d.name }))

  const selectedShiftTz = timeZones.find(tz => String(tz.id) === selectedShift)

  // ─── Apply override ───
  const handleApplyOverride = async () => {
    if (!selectedEmployees.length) return showError('Select at least one employee', 'No employees selected')
    if (!selectedShift) return showError('Select a shift template', 'No shift selected')
    try {
      setApplying(true)
      const res = await fetch('/api/hr/schedule-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: selectedEmployees,
          override_tz_id: Number(selectedShift),
          active_from: activeFrom,
          active_until: activeUntil,
          label: overrideLabel,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to apply override')
      showSuccess(json.message, 'Override Applied ✓')
      setSelectedEmployees([])
      await Promise.all([fetchActiveOverrides(), fetchEmployees()])
    } catch (err) {
      showError(err.message, 'Apply failed')
    } finally {
      setApplying(false)
    }
  }

  // ─── Revert selected or all ───
  const handleRevert = async (employeeIds) => {
    try {
      setReverting(true)
      const res = await fetch('/api/hr/schedule-overrides', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_ids: employeeIds || [] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to revert')
      showSuccess(json.message, 'Reverted ✓')
      await Promise.all([fetchActiveOverrides(), fetchEmployees()])
    } catch (err) {
      showError(err.message, 'Revert failed')
    } finally {
      setReverting(false)
    }
  }

  // ─── Departments table rows ───
  const deptRows = departments.map((d) => {
    const rawSched = d.schedules || d.schedule
    const sched = Array.isArray(rawSched) ? rawSched[0] : (rawSched || null)
    const tzs = [
      { id: sched?.tz_id_1, name: sched?.tz1?.name },
      { id: sched?.tz_id_2, name: sched?.tz2?.name },
      { id: sched?.tz_id_3, name: sched?.tz3?.name },
    ].filter(v => v.id !== null && v.id !== undefined)

    return (
      <Table.Tr key={d.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
        <Table.Td>
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" radius="md" size="md">
              <IconBuilding size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm" style={{ color: 'var(--mantine-color-blue-9)' }}>{d.name}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge variant="outline" color="gray" radius="sm" size="sm" fw={800}>
            #{d.department_code}
          </Badge>
        </Table.Td>
        <Table.Td>
          {tzs.length > 0 ? (
            <Group gap={4} wrap="nowrap">
              {tzs.map((tz, idx) => (
                <Tooltip key={idx} label={`Slot ID: ${tz.id}`} position="top" withArrow>
                  <Badge variant="light" color="blue" size="sm" radius="sm" fw={800}>
                    {tz.name || `TZ${tz.id}`}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          ) : (
            <Text size="xs" c="dimmed" fw={600} fs="italic">No Shifts</Text>
          )}
        </Table.Td>
        <Table.Td>
          <Group gap={8} justify="flex-end">
            <Tooltip label="Edit Details" position="top" withArrow>
              <ActionIcon variant="subtle" color="blue" radius="lg" size="lg" onClick={() => { setEditId(d.id); setEditName(d.name || ''); setEditCode(String(d.department_code ?? '')); setEditOpen(true) }}>
                <IconPencil size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Schedule Configuration" position="top" withArrow>
              <ActionIcon variant="subtle" color="teal" radius="lg" size="lg" onClick={async () => {
                try {
                  setScheduleDept(d)
                  const res = await fetch(`/api/hr/schedules/${d.id}`)
                  const json = await res.json()
                  setScheduleVals(res.ok && json?.data
                    ? { tz_id_1: json.data.tz_id_1 || null, tz_id_2: json.data.tz_id_2 || null, tz_id_3: json.data.tz_id_3 || null }
                    : { tz_id_1: null, tz_id_2: null, tz_id_3: null })
                  setScheduleOpen(true)
                } catch {
                  setScheduleVals({ tz_id_1: null, tz_id_2: null, tz_id_3: null })
                  setScheduleOpen(true)
                }
              }}>
                <IconCalendar size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete Department" position="top" withArrow>
              <ActionIcon variant="subtle" color="red" radius="lg" size="lg" onClick={async () => {
                try {
                  const res = await fetch(`/api/hr/departments/${d.id}`, { method: 'DELETE' })
                  const json = await res.json().catch(() => ({}))
                  if (!res.ok) throw new Error(json.error || 'Failed to delete department')
                  showSuccess(`${d.name} was removed`, 'Department deleted')
                  await fetchDepartments()
                } catch (error) { showError(error.message, 'Delete failed') }
              }}>
                <IconTrash size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    )
  })

  return (
    <Container size="xl" py="40px">
      <Stack gap="xl">
        {/* ─── Header ─── */}
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={1} fw={900} style={{ letterSpacing: '-1.5px', fontSize: '38px', color: 'var(--mantine-color-blue-9)' }}>
              HR Management
            </Title>
            <Text c="dimmed" size="md" fw={500} mt={4}>
              Manage departments, shifts, and temporary schedule overrides.
            </Text>
          </Box>
        </Group>

        {/* ─── Stat Cards ─── */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Paper p="xl" radius="24px" withBorder style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>Departments</Text>
                <Title order={2} fw={900}>{departments.length}</Title>
              </Box>
              <ThemeIcon size={52} radius="xl" variant="light" color="blue">
                <IconBuildingSkyscraper size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
          <Paper p="xl" radius="24px" withBorder style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>Employees on Override</Text>
                <Title order={2} fw={900} c="orange">{activeOverrides.length}</Title>
              </Box>
              <ThemeIcon size={52} radius="xl" variant="light" color="orange">
                <IconMoon size={24} />
              </ThemeIcon>
            </Group>
          </Paper>
          <Paper p="xl" radius="24px" withBorder style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)' }}>
            <Group justify="space-between">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>System Status</Text>
                <Title order={2} fw={900} c="teal">Operational</Title>
              </Box>
              <ThemeIcon size={52} radius="xl" variant="light" color="teal">
                <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-teal-filled)', boxShadow: '0 0 10px var(--mantine-color-teal-filled)' }} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="departments" radius="xl" variant="pills">
          <Tabs.List mb="xl" style={{ background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '999px', display: 'inline-flex' }}>
            <Tabs.Tab value="departments" leftSection={<IconBuilding size={16} />} fw={700}>
              Departments
            </Tabs.Tab>
            <Tabs.Tab value="overrides" leftSection={<IconMoon size={16} />} fw={700}
              rightSection={activeOverrides.length > 0 ? <Badge size="xs" color="orange" variant="filled" circle>{activeOverrides.length}</Badge> : null}>
              Shift Overrides
            </Tabs.Tab>
          </Tabs.List>

          {/* ─── DEPARTMENTS TAB ─── */}
          <Tabs.Panel value="departments">
            <Paper radius="32px" p="32px" withBorder style={{ border: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)' }}>
              <Stack gap="xl">
                {/* Create Form */}
                <Box>
                  <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb="md">Add Department</Text>
                  <form onSubmit={(e) => {
                    e.preventDefault()
                    const go = async () => {
                      try {
                        setCreating(true)
                        const codeInt = createCode === '' ? null : Number(createCode)
                        if (!createName?.trim() || codeInt === null || Number.isNaN(codeInt)) throw new Error('Name and numeric code required')
                        const res = await fetch('/api/hr/departments', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: createName.trim(), department_code: codeInt }),
                        })
                        const json = await res.json()
                        if (!res.ok) throw new Error(json.error || 'Failed')
                        showSuccess(`${createName.trim()} added`, 'Department created')
                        setCreateName(''); setCreateCode('')
                        await fetchDepartments()
                      } catch (err) { showError(err.message, 'Create failed') }
                      finally { setCreating(false) }
                    }
                    go()
                  }}>
                    <Grid gutter="md" align="flex-end">
                      <Grid.Col span={{ base: 12, md: 5 }}>
                        <TextInput id="dept-name-input" placeholder="e.g. Executive Management" value={createName}
                          onChange={(e) => setCreateName(e.currentTarget.value)} required radius="md" size="md" />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 4 }}>
                        <NumberInput placeholder="Dept Code (e.g. 200)" value={createCode}
                          onChange={(val) => setCreateCode(val === null ? '' : String(val))} min={0} required radius="md" size="md" />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 3 }}>
                        <Group grow>
                          <Button type="submit" loading={creating} size="md" radius="md" variant="light" color="blue">Register Unit</Button>
                          <Button variant="subtle" color="gray" radius="md" size="md" onClick={fetchDepartments} loading={loading}>Refresh</Button>
                        </Group>
                      </Grid.Col>
                    </Grid>
                  </form>
                </Box>
                <Divider variant="dashed" />
                <Box style={{ overflow: 'hidden', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Table verticalSpacing="lg" horizontalSpacing="xl" highlightOnHover style={{ backgroundColor: '#fff' }}>
                    <Table.Thead>
                      <Table.Tr style={{ backgroundColor: 'rgba(0,0,0,0.01)' }}>
                        <Table.Th><Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Department</Text></Table.Th>
                        <Table.Th><Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Code</Text></Table.Th>
                        <Table.Th><Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Active Shifts</Text></Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}><Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Actions</Text></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {deptRows}
                      {(!departments.length) && (
                        <Table.Tr><Table.Td colSpan={4} ta="center" py="xl">
                          <Text c="dimmed" fs="italic">{loading ? 'Loading...' : 'No departments yet'}</Text>
                        </Table.Td></Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Box>
              </Stack>
            </Paper>
          </Tabs.Panel>

          {/* ─── SHIFT OVERRIDES TAB ─── */}
          <Tabs.Panel value="overrides">
            <Grid gutter="lg">
              {/* Left: Assign Panel */}
              <Grid.Col span={{ base: 12, lg: 7 }}>
                <Paper radius="32px" p="28px" withBorder style={{ border: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', height: '100%' }}>
                  <Stack gap="lg">
                    <Box>
                      <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb={4}>Bulk Shift Assignment</Text>
                      <Text size="sm" c="dimmed">Select employees, choose a shift template, and apply in one click.</Text>
                    </Box>

                    {/* Shift Template Selection */}
                    <Box>
                      <Text size="sm" fw={700} mb="xs">1. Choose Shift Template</Text>
                      <SimpleGrid cols={2} spacing="sm">
                        {timeZones.filter(tz => tz.id >= 50).map(tz => (
                          <Box
                            key={tz.id}
                            onClick={() => setSelectedShift(String(tz.id))}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 16,
                              border: `2px solid ${selectedShift === String(tz.id) ? 'var(--mantine-color-violet-5)' : 'rgba(0,0,0,0.08)'}`,
                              background: selectedShift === String(tz.id) ? 'rgba(99,102,241,0.06)' : 'rgba(0,0,0,0.01)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Group gap="xs" mb={4}>
                              <ThemeIcon size="sm" radius="xl" variant="light" color={tz.id === 51 ? 'yellow' : 'indigo'}>
                                {tz.id === 51 ? <IconSun size={12} /> : <IconMoon size={12} />}
                              </ThemeIcon>
                              <Text size="sm" fw={700}>{tz.name}</Text>
                              {selectedShift === String(tz.id) && <IconCheck size={14} color="var(--mantine-color-violet-5)" style={{ marginLeft: 'auto' }} />}
                            </Group>
                            <Text size="xs" c="dimmed">
                              {tz.id === 51 ? 'Flexible 7am–10am start · 7 hour shift' : '9:00 PM → 4:00 AM · Fixed night shift'}
                            </Text>
                            {tz.buffer_time_minutes !== 30 && (
                              <Badge size="xs" color="orange" variant="light" mt={6}>
                                {tz.buffer_time_minutes}min flexible window
                              </Badge>
                            )}
                          </Box>
                        ))}
                        {timeZones.filter(tz => tz.id >= 50).length === 0 && (
                          <Alert color="orange" radius="md" icon={<IconAlertCircle size={16} />} title="Migration needed">
                            Run <code>ramzan_migration.sql</code> in Supabase SQL Editor first.
                          </Alert>
                        )}
                      </SimpleGrid>
                    </Box>

                    {/* Date Range */}
                    <Box>
                      <Text size="sm" fw={700} mb="xs">2. Override Period</Text>
                      <Grid gutter="md">
                        <Grid.Col span={6}>
                          <TextInput label="Active From" type="date" value={activeFrom} onChange={e => setActiveFrom(e.target.value)} radius="md" size="sm" />
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <TextInput label="Active Until" type="date" value={activeUntil} onChange={e => setActiveUntil(e.target.value)} radius="md" size="sm" />
                        </Grid.Col>
                        <Grid.Col span={12}>
                          <TextInput label="Label (for records)" value={overrideLabel} onChange={e => setOverrideLabel(e.target.value)} radius="md" size="sm" placeholder="e.g. Ramzan 2026" />
                        </Grid.Col>
                      </Grid>
                    </Box>

                    {/* Employee Selection */}
                    <Box>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={700}>3. Select Employees</Text>
                        <Group gap="xs">
                          <Button size="xs" variant="subtle" color="blue" onClick={() => setSelectedEmployees(filteredEmployees.map(e => e.id))}>
                            Select Visible
                          </Button>
                          <Button size="xs" variant="subtle" color="red" onClick={() => setSelectedEmployees([])}>
                            Clear
                          </Button>
                        </Group>
                      </Group>

                      {/* Filters */}
                      <Grid gutter="xs" mb="xs">
                        <Grid.Col span={7}>
                          <TextInput size="xs" placeholder="Search by name or ID…" value={search}
                            onChange={e => setSearch(e.target.value)} leftSection={<IconSearch size={12} />} radius="md" />
                        </Grid.Col>
                        <Grid.Col span={5}>
                          <Select size="xs" placeholder="All Departments" data={deptFilterOptions}
                            value={deptFilter} onChange={setDeptFilter} clearable radius="md" />
                        </Grid.Col>
                      </Grid>

                      <ScrollArea h={280} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, overflow: 'hidden' }}>
                        <Stack gap={0}>
                          {filteredEmployees.map(emp => {
                            const isOverridden = overriddenEmployeeIds.has(emp.id)
                            const isSelected = selectedEmployees.includes(emp.id)
                            return (
                              <Box
                                key={emp.id}
                                onClick={() => setSelectedEmployees(prev =>
                                  isSelected ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                )}
                                style={{
                                  padding: '10px 16px',
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'transparent',
                                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                                  transition: 'background 0.15s',
                                }}
                              >
                                <Group gap="sm">
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => { }}
                                    size="sm"
                                    radius="sm"
                                    color="violet"
                                  />
                                  <Avatar size="sm" radius="xl" color="blue">
                                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                                  </Avatar>
                                  <Box style={{ flex: 1, minWidth: 0 }}>
                                    <Text size="sm" fw={600} style={{ lineHeight: 1.2 }}>
                                      {emp.first_name} {emp.last_name}
                                    </Text>
                                    <Text size="xs" c="dimmed">{emp.department?.name} · {emp.employee_id}</Text>
                                  </Box>
                                  {isOverridden && (
                                    <Badge size="xs" color="orange" variant="dot">On Override</Badge>
                                  )}
                                </Group>
                              </Box>
                            )
                          })}
                          {filteredEmployees.length === 0 && (
                            <Text size="sm" c="dimmed" ta="center" py="xl">No employees match your filters</Text>
                          )}
                        </Stack>
                      </ScrollArea>

                      <Text size="xs" c="dimmed" mt="xs">
                        {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                      </Text>
                    </Box>

                    {/* Apply Button */}
                    <Button
                      size="md"
                      radius="xl"
                      fullWidth
                      variant="gradient"
                      gradient={{ from: 'violet', to: 'indigo' }}
                      leftSection={<IconPlayerPlay size={18} />}
                      loading={applying}
                      disabled={applying || !selectedEmployees.length || !selectedShift}
                      onClick={handleApplyOverride}
                    >
                      Apply Shift Override to {selectedEmployees.length || '…'} Employee{selectedEmployees.length !== 1 ? 's' : ''}
                    </Button>

                    {selectedShift && (
                      <Alert color="blue" variant="light" radius="xl" icon={<IconAlertCircle size={16} />}>
                        <Text size="xs">
                          Attendance will be <strong>automatically recalculated</strong> from {activeFrom} to today using the new shift.
                          You&apos;ll see updated statuses within ~60 seconds as the queue processes.
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>

              {/* Right: Active Overrides */}
              <Grid.Col span={{ base: 12, lg: 5 }}>
                <Paper radius="32px" p="28px" withBorder style={{ border: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', height: '100%' }}>
                  <Stack gap="lg" h="100%">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb={2}>Active Overrides</Text>
                        <Text size="xs" c="dimmed">{activeOverrides.length} employee{activeOverrides.length !== 1 ? 's' : ''} on temporary shifts</Text>
                      </Box>
                      <Group gap="xs">
                        <Tooltip label="Refresh" withArrow>
                          <ActionIcon variant="subtle" color="gray" radius="lg" onClick={fetchActiveOverrides} loading={overrideLoading}>
                            <IconRefresh size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {activeOverrides.length > 0 && (
                          <Tooltip label="Revert ALL to original schedules" withArrow>
                            <Button size="xs" color="red" variant="light" radius="lg" leftSection={<IconArrowBack size={14} />}
                              loading={reverting} onClick={() => handleRevert([])}>
                              Revert All
                            </Button>
                          </Tooltip>
                        )}
                      </Group>
                    </Group>

                    {overrideLoading ? (
                      <Center h={200}><Loader size="sm" /></Center>
                    ) : activeOverrides.length === 0 ? (
                      <Center h={200}>
                        <Stack align="center" gap="xs">
                          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                            <IconCalendar size={24} />
                          </ThemeIcon>
                          <Text c="dimmed" size="sm" ta="center">No active overrides.<br />All employees are on their regular schedules.</Text>
                        </Stack>
                      </Center>
                    ) : (
                      <ScrollArea flex={1}>
                        <Stack gap="xs">
                          {activeOverrides.map(override => (
                            <Box key={override.id} p="md" style={{
                              borderRadius: 16,
                              border: '1px solid rgba(0,0,0,0.06)',
                              background: 'rgba(255,255,255,0.6)',
                            }}>
                              <Group justify="space-between" gap="xs">
                                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                  <Avatar size="sm" radius="xl" color="orange">
                                    {override.employee?.first_name?.[0]}{override.employee?.last_name?.[0]}
                                  </Avatar>
                                  <Box style={{ minWidth: 0 }}>
                                    <Text size="sm" fw={700} style={{ lineHeight: 1.2 }}>
                                      {override.employee?.first_name} {override.employee?.last_name}
                                    </Text>
                                    <Text size="xs" c="dimmed">{override.employee?.department?.name}</Text>
                                    <Group gap={4} mt={2}>
                                      <Badge size="xs" color="orange" variant="light">
                                        {override.override_tz?.name || `TZ ${override.override_tz_id}`}
                                      </Badge>
                                      <Badge size="xs" color="gray" variant="subtle">
                                        until {override.active_until}
                                      </Badge>
                                    </Group>
                                  </Box>
                                </Group>
                                <Tooltip label="Revert this employee" withArrow>
                                  <ActionIcon size="sm" variant="subtle" color="red" radius="lg"
                                    onClick={() => handleRevert([override.employee_id])}>
                                    <IconArrowBack size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Box>
                          ))}
                        </Stack>
                      </ScrollArea>
                    )}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* ─── Edit Dept Modal ─── */}
      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Edit Department" radius="xl">
        <Stack>
          <TextInput label="Department Name" value={editName} onChange={e => setEditName(e.currentTarget.value)} required radius="md" />
          <NumberInput label="Department Code" value={editCode} onChange={val => setEditCode(val === null ? '' : String(val))} min={0} required radius="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button loading={savingEdit} onClick={async () => {
              try {
                setSavingEdit(true)
                const codeInt = editCode === '' ? null : Number(editCode)
                if (!editId || !editName?.trim() || codeInt === null || Number.isNaN(codeInt)) throw new Error('Required fields missing')
                const res = await fetch(`/api/hr/departments/${editId}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: editName.trim(), department_code: codeInt }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed')
                showSuccess(`${editName.trim()} saved`, 'Updated')
                setEditOpen(false)
                await fetchDepartments()
              } catch (err) { showError(err.message, 'Update failed') }
              finally { setSavingEdit(false) }
            }}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ─── Schedule Modal ─── */}
      <Modal opened={scheduleOpen} onClose={() => setScheduleOpen(false)} title={`Assign Schedule${scheduleDept ? `: ${scheduleDept.name}` : ''}`} radius="xl">
        <Stack>
          <Select label="Shift Slot 1" placeholder="Select shift" data={tzOptions}
            value={scheduleVals.tz_id_1 ? String(scheduleVals.tz_id_1) : null}
            onChange={v => setScheduleVals(s => ({ ...s, tz_id_1: v ? Number(v) : null }))} searchable clearable radius="md" />
          <Select label="Shift Slot 2" placeholder="Select shift" data={tzOptions}
            value={scheduleVals.tz_id_2 ? String(scheduleVals.tz_id_2) : null}
            onChange={v => setScheduleVals(s => ({ ...s, tz_id_2: v ? Number(v) : null }))} searchable clearable radius="md" />
          <Select label="Shift Slot 3" placeholder="Select shift" data={tzOptions}
            value={scheduleVals.tz_id_3 ? String(scheduleVals.tz_id_3) : null}
            onChange={v => setScheduleVals(s => ({ ...s, tz_id_3: v ? Number(v) : null }))} searchable clearable radius="md" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button loading={scheduleSaving} onClick={async () => {
              try {
                setScheduleSaving(true)
                if (!scheduleDept?.id) throw new Error('Missing department')
                const res = await fetch(`/api/hr/schedules/${scheduleDept.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(scheduleVals),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed')
                showSuccess('Schedule updated', 'Saved')
                setScheduleOpen(false)
                await fetchDepartments()
              } catch (err) { showError(err.message, 'Failed') }
              finally { setScheduleSaving(false) }
            }}>Save Schedule</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
