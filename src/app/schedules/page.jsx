'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
    Container, Title, Text, Group, Box, Stack, Tabs, Badge, Button,
    Paper, SimpleGrid, ActionIcon, Tooltip, ThemeIcon, Modal, TextInput,
    NumberInput, Select, ScrollArea, Avatar, Checkbox, Divider, Alert,
    Center, Loader, Grid, Textarea, Switch
} from '@mantine/core'
import {
    IconCalendar, IconSettings, IconUsers, IconPlus, IconPencil, IconTrash,
    IconClock, IconMoon, IconSun, IconCheck, IconAlertCircle, IconRefresh,
    IconArrowBack, IconPlayerPlay, IconSearch, IconBuilding, IconEye,
    IconLayoutGrid, IconList, IconShieldCheck, IconWand
} from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { TimeInput } from '@mantine/dates'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function timeToHHMM(t) {
    if (!t || typeof t !== 'string') return '0000'
    const [hh, mm] = t.split(':')
    return `${String(parseInt(hh || '0', 10)).padStart(2, '0')}${String(parseInt(mm || '0', 10)).padStart(2, '0')}`
}

function HHMMtoTime(hhmm) {
    if (!hhmm || hhmm.length !== 4) return ''
    return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`
}

function formatHHMM(hhmm) {
    if (!hhmm || hhmm.length !== 4) return '--:--'
    const h = parseInt(hhmm.slice(0, 2))
    const m = hhmm.slice(2, 4)
    const p = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${m} ${p}`
}

function parseTzString(tzString) {
    if (!tzString || tzString.length < 56) return DAYS.map(d => ({ day: d, isWorking: false }))
    return DAYS.map((day, i) => {
        const seg = tzString.slice(i * 8, i * 8 + 8)
        const start = seg.slice(0, 4)
        const end = seg.slice(4, 8)
        const isOff = start === '0000' && end === '2359'
        return { day, isWorking: !isOff, startTime: isOff ? null : formatHHMM(start), endTime: isOff ? null : formatHHMM(end), rawStart: start, rawEnd: end }
    })
}

function generateTzString(startTime, endTime, daySelected) {
    const seg = `${timeToHHMM(startTime)}${timeToHHMM(endTime)}`
    return daySelected.map(sel => sel ? seg : '00002359').join('')
}

function getShiftLabel(tz) {
    const schedule = parseTzString(tz.tz_string)
    const working = schedule.filter(d => d.isWorking)
    if (!working.length) return 'No working days'
    const sample = working[0]
    const dayStr = working.map(d => d.day).join(', ')
    return `${sample.startTime} – ${sample.endTime} · ${dayStr}`
}

function isNightShift(startTime, endTime) {
    if (!startTime || !endTime) return false
    const sn = parseInt(timeToHHMM(startTime))
    const en = parseInt(timeToHHMM(endTime))
    return sn > en
}

// ─── Visual Schedule Card ─────────────────────────────────────────────────────

function ScheduleCard({ tz, companyBuffer, onEdit, onDelete, assignmentCounts }) {
    const schedule = parseTzString(tz.tz_string)
    const working = schedule.filter(d => d.isWorking)
    const sample = working[0]
    const isNight = sample && parseInt(sample.rawStart) > parseInt(sample.rawEnd)
    const color = isNight ? 'indigo' : 'violet'
    const empCount = assignmentCounts?.[tz.id]?.employees || 0
    const deptCount = assignmentCounts?.[tz.id]?.departments || 0

    return (
        <Paper
            radius="20px"
            p="20px"
            withBorder
            style={{
                border: '1px solid rgba(0,0,0,0.07)',
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                transition: 'box-shadow 0.2s ease',
            }}
        >
            <Stack gap="sm">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                        <ThemeIcon size={36} radius="xl" variant="light" color={color}>
                            {isNight ? <IconMoon size={16} /> : <IconSun size={16} />}
                        </ThemeIcon>
                        <Box>
                            <Text fw={800} size="sm" style={{ lineHeight: 1.2 }}>{tz.name}</Text>
                            <Text size="xs" c="dimmed">
                                {tz.buffer_time_minutes != null
                                    ? `${tz.buffer_time_minutes}min buffer`
                                    : `${companyBuffer}min buffer (default)`}
                            </Text>
                        </Box>
                    </Group>
                    <Group gap={4}>
                        <Tooltip label="Edit Schedule" withArrow>
                            <ActionIcon variant="subtle" color={color} size="sm" radius="lg" onClick={() => onEdit(tz)}>
                                <IconPencil size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete" withArrow>
                            <ActionIcon variant="subtle" color="red" size="sm" radius="lg" onClick={() => onDelete(tz)}>
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                {/* Day Grid */}
                <Group gap={4} wrap="nowrap">
                    {schedule.map(d => (
                        <Box
                            key={d.day}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: d.isWorking ? `var(--mantine-color-${color}-1)` : 'rgba(0,0,0,0.04)',
                                border: d.isWorking ? `1.5px solid var(--mantine-color-${color}-3)` : '1.5px solid transparent',
                                flexShrink: 0,
                            }}
                        >
                            <Text size="10px" fw={700} c={d.isWorking ? `${color}.7` : 'dimmed'}>
                                {d.day[0]}
                            </Text>
                        </Box>
                    ))}
                </Group>

                {/* Time */}
                {sample && (
                    <Group gap="xs">
                        <IconClock size={13} style={{ color: 'var(--mantine-color-dimmed)' }} />
                        <Text component="div" size="xs" c="dimmed" fw={600}>
                            {sample.startTime} → {sample.endTime}
                            {isNight && (
                                <Badge size="xs" color="indigo" variant="dot" ml={6}>Overnight</Badge>
                            )}
                        </Text>
                    </Group>
                )}

                <Divider variant="dashed" opacity={0.4} />

                {/* Assignments */}
                <Group gap="xs">
                    {deptCount > 0 && (
                        <Badge size="xs" color="blue" variant="light" leftSection={<IconBuilding size={10} />}>
                            {deptCount} dept{deptCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                    {empCount > 0 && (
                        <Badge size="xs" color="teal" variant="light" leftSection={<IconUsers size={10} />}>
                            {empCount} emp{empCount !== 1 ? 's' : ''}
                        </Badge>
                    )}
                    {empCount === 0 && deptCount === 0 && (
                        <Text size="xs" c="dimmed" fs="italic">Unassigned</Text>
                    )}
                </Group>
            </Stack>
        </Paper>
    )
}

// ─── Schedule Builder (Create / Edit) ─────────────────────────────────────────

function ScheduleBuilder({ opened, onClose, onSave, saving, existingIds, editTarget, companyBuffer }) {
    const [name, setName] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [daysOn, setDaysOn] = useState(DAYS.map(() => false))
    const [bufferOverride, setBufferOverride] = useState(null)
    const [nightConfirm, setNightConfirm] = useState(false)

    useEffect(() => {
        if (opened) {
            if (editTarget) {
                setName(editTarget.name || '')
                setBufferOverride(editTarget.buffer_time_minutes ?? null)
                const schedule = parseTzString(editTarget.tz_string)
                const firstWorking = schedule.find(d => d.isWorking)
                if (firstWorking) {
                    setStartTime(HHMMtoTime(firstWorking.rawStart))
                    setEndTime(HHMMtoTime(firstWorking.rawEnd))
                } else {
                    setStartTime(''); setEndTime('')
                }
                setDaysOn(schedule.map(d => d.isWorking))
            } else {
                setName(''); setStartTime(''); setEndTime('')
                setDaysOn(DAYS.map(() => false)); setBufferOverride(null)
            }
            setNightConfirm(false)
        }
    }, [opened, editTarget])

    const toggleDay = (i) => setDaysOn(prev => { const n = [...prev]; n[i] = !n[i]; return n })

    const handleSave = (force = false) => {
        if (!name.trim()) return showError('Schedule name is required', 'Validation')
        if (!startTime || !endTime) return showError('Set shift start and end times', 'Validation')
        if (!daysOn.some(Boolean)) return showError('Select at least one working day', 'Validation')
        if (!force && isNightShift(startTime, endTime)) { setNightConfirm(true); return }
        const tzString = generateTzString(startTime, endTime, daysOn)
        const nextId = editTarget ? editTarget.id : (() => {
            const used = new Set(existingIds)
            for (let i = 1; i <= 50; i++) if (!used.has(i)) return i
            return null
        })()
        if (!nextId) return showError('All 50 schedule slots are full. Delete one first.', 'No slots available')
        onSave({ id: nextId, name: name.trim(), tz_string: tzString, buffer_time_minutes: bufferOverride })
    }

    const workingCount = daysOn.filter(Boolean).length

    return (
        <>
            <Modal
                opened={opened && !nightConfirm}
                onClose={onClose}
                title={
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="xl" variant="light" color="violet">
                            <IconWand size={14} />
                        </ThemeIcon>
                        <Text fw={800} size="sm">{editTarget ? 'Edit Schedule' : 'New Schedule'}</Text>
                    </Group>
                }
                radius="xl"
                size="md"
            >
                <Stack gap="md" pt="xs">
                    <TextInput
                        label="Schedule Name"
                        placeholder="e.g., Standard 9-5, Night Shift, Ramzan Morning"
                        value={name}
                        onChange={e => setName(e.currentTarget.value)}
                        required
                        radius="md"
                    />

                    {/* Day Picker */}
                    <Box>
                        <Text component="div" size="sm" fw={700} mb="xs">Working Days
                            {workingCount > 0 && <Badge size="xs" ml={8} color="violet" variant="light">{workingCount} days</Badge>}
                        </Text>
                        <Group gap={8}>
                            {DAYS.map((d, i) => (
                                <Box
                                    key={d}
                                    onClick={() => toggleDay(i)}
                                    style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                        background: daysOn[i] ? 'var(--mantine-color-violet-filled)' : 'rgba(0,0,0,0.04)',
                                        color: daysOn[i] ? '#fff' : 'var(--mantine-color-dimmed)',
                                        fontWeight: 800, fontSize: 12,
                                        transition: 'all 0.15s ease',
                                        border: daysOn[i] ? '2px solid transparent' : '2px solid rgba(0,0,0,0.08)',
                                        userSelect: 'none',
                                    }}
                                >
                                    {d.slice(0, 2)}
                                </Box>
                            ))}
                        </Group>
                    </Box>

                    {/* Times */}
                    <Grid gutter="md">
                        <Grid.Col span={6}>
                            <TimeInput
                                label="Shift Start"
                                value={startTime}
                                onChange={e => {
                                    const v = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                                    setStartTime(v)
                                }}
                                radius="md"
                            />
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <TimeInput
                                label="Shift End"
                                value={endTime}
                                onChange={e => {
                                    const v = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                                    setEndTime(v)
                                }}
                                radius="md"
                            />
                        </Grid.Col>
                    </Grid>

                    {/* Buffer Override */}
                    <NumberInput
                        label="Grace Period Override (minutes)"
                        description={`Leave empty to use company default (${companyBuffer} min)`}
                        placeholder={`Company default: ${companyBuffer} min`}
                        value={bufferOverride ?? ''}
                        onChange={v => setBufferOverride(v === '' || v == null ? null : Number(v))}
                        min={0} max={120}
                        radius="md"
                    />

                    {/* Preview */}
                    {startTime && endTime && daysOn.some(Boolean) && (
                        <Box p="sm" style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
                            <Text size="xs" fw={700} c="violet.7" mb={4}>Preview</Text>
                            <Text size="xs" c="dimmed">
                                {daysOn.map((on, i) => on ? DAYS[i] : null).filter(Boolean).join(', ')} · {startTime || '?'} – {endTime || '?'}
                                {isNightShift(startTime, endTime) && ' (crosses midnight)'}
                            </Text>
                        </Box>
                    )}

                    <Group justify="flex-end" gap="xs">
                        <Button variant="subtle" color="gray" radius="md" onClick={onClose}>Cancel</Button>
                        <Button
                            radius="md"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'indigo' }}
                            loading={saving}
                            onClick={() => handleSave(false)}
                        >
                            {editTarget ? 'Update Schedule' : 'Create Schedule'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Night shift confirmation */}
            <Modal
                opened={nightConfirm}
                onClose={() => setNightConfirm(false)}
                title="Overnight Shift Detected"
                radius="xl"
                size="sm"
            >
                <Stack gap="md">
                    <Alert color="indigo" icon={<IconMoon size={16} />} radius="md">
                        The times <strong>{startTime}</strong> → <strong>{endTime}</strong> cross midnight.
                        This will be saved as an overnight shift (e.g., 9 PM → 4 AM next day).
                    </Alert>
                    <Group justify="flex-end">
                        <Button variant="default" radius="md" onClick={() => setNightConfirm(false)}>Go Back</Button>
                        <Button
                            radius="md" color="indigo"
                            onClick={() => { setNightConfirm(false); handleSave(true) }}
                        >
                            Yes, Create Overnight Shift
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    )
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab({ timeZones, departments, employees, activeOverrides, overrideLoading, onApplyOverride, onRevert, applying, reverting }) {
    const [search, setSearch] = useState('')
    const [deptFilter, setDeptFilter] = useState(null)
    const [selectedEmployees, setSelectedEmployees] = useState([])
    const [selectedShift, setSelectedShift] = useState(null)
    const [activeFrom, setActiveFrom] = useState('')
    const [activeUntil, setActiveUntil] = useState('')
    const [label, setLabel] = useState('')

    const overriddenIds = new Set(activeOverrides.map(o => o.employee_id))
    const filtered = employees.filter(emp => {
        const matchDept = deptFilter ? emp.department_id === deptFilter : true
        const matchSearch = search ? `${emp.first_name} ${emp.last_name} ${emp.employee_id}`.toLowerCase().includes(search.toLowerCase()) : true
        return matchDept && matchSearch
    })

    const shiftOptions = timeZones.map(tz => ({ value: String(tz.id), label: tz.name }))
    const deptOptions = departments.map(d => ({ value: d.id, label: d.name }))
    const selectedTz = timeZones.find(tz => String(tz.id) === selectedShift)

    const handleApply = () => {
        if (!selectedEmployees.length) return showError('Select at least one employee')
        if (!selectedShift) return showError('Select a shift')
        if (!activeFrom || !activeUntil) return showError('Set the date range')
        onApplyOverride({ employee_ids: selectedEmployees, override_tz_id: Number(selectedShift), active_from: activeFrom, active_until: activeUntil, label: label || 'Temporary Override' })
        setSelectedEmployees([])
    }

    return (
        <Grid gutter="lg">
            {/* Left: Bulk Assign */}
            <Grid.Col span={{ base: 12, lg: 7 }}>
                <Paper radius="24px" p="24px" withBorder style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
                    <Stack gap="lg">
                        <Box>
                            <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb={4}>Bulk Override Assignment</Text>
                            <Text size="sm" c="dimmed">Temporarily assign employees to a different schedule. Their original schedule is preserved and restored on revert.</Text>
                        </Box>

                        {/* Step 1: Select Shift */}
                        <Box>
                            <Text size="sm" fw={700} mb="xs">1 · Choose Target Shift</Text>
                            <Select
                                placeholder="Select a schedule..."
                                data={shiftOptions}
                                value={selectedShift}
                                onChange={setSelectedShift}
                                searchable
                                clearable
                                radius="md"
                                size="sm"
                            />
                            {selectedTz && (
                                <Box mt="xs" p="sm" style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <Text size="xs" c="violet.7" fw={700}>{selectedTz.name}</Text>
                                    <Text size="xs" c="dimmed">{getShiftLabel(selectedTz)}</Text>
                                </Box>
                            )}
                        </Box>

                        {/* Step 2: Date range + label */}
                        <Box>
                            <Text size="sm" fw={700} mb="xs">2 · Override Period</Text>
                            <Grid gutter="sm">
                                <Grid.Col span={5}>
                                    <TextInput label="From" type="date" value={activeFrom} onChange={e => setActiveFrom(e.target.value)} radius="md" size="sm" />
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <TextInput label="Until" type="date" value={activeUntil} onChange={e => setActiveUntil(e.target.value)} radius="md" size="sm" />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    <TextInput label="Label (for records)" placeholder="e.g. Ramzan 2026, Training Period" value={label} onChange={e => setLabel(e.target.value)} radius="md" size="sm" />
                                </Grid.Col>
                            </Grid>
                        </Box>

                        {/* Step 3: Employee picker */}
                        <Box>
                            <Group justify="space-between" mb="xs">
                                <Text size="sm" fw={700}>3 · Select Employees</Text>
                                <Group gap="xs">
                                    <Button size="xs" variant="subtle" color="blue" onClick={() => setSelectedEmployees(filtered.map(e => e.id))}>Select All</Button>
                                    <Button size="xs" variant="subtle" color="red" onClick={() => setSelectedEmployees([])}>Clear</Button>
                                </Group>
                            </Group>
                            <Grid gutter="xs" mb="xs">
                                <Grid.Col span={7}>
                                    <TextInput size="xs" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} leftSection={<IconSearch size={12} />} radius="md" />
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Select size="xs" placeholder="All Depts" data={deptOptions} value={deptFilter} onChange={setDeptFilter} clearable radius="md" />
                                </Grid.Col>
                            </Grid>
                            <ScrollArea h={220} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14 }}>
                                <Stack gap={0}>
                                    {filtered.map(emp => {
                                        const isSel = selectedEmployees.includes(emp.id)
                                        const isOv = overriddenIds.has(emp.id)
                                        return (
                                            <Box
                                                key={emp.id}
                                                onClick={() => setSelectedEmployees(prev => isSel ? prev.filter(id => id !== emp.id) : [...prev, emp.id])}
                                                style={{
                                                    padding: '9px 14px', cursor: 'pointer',
                                                    background: isSel ? 'rgba(99,102,241,0.06)' : 'transparent',
                                                    borderBottom: '1px solid rgba(0,0,0,0.03)',
                                                }}
                                            >
                                                <Group gap="sm">
                                                    <Checkbox checked={isSel} onChange={() => { }} size="xs" radius="sm" color="violet" />
                                                    <Avatar size="xs" radius="xl" color="violet">{emp.first_name?.[0]}{emp.last_name?.[0]}</Avatar>
                                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                                        <Text size="xs" fw={600}>{emp.first_name} {emp.last_name}</Text>
                                                        <Text size="10px" c="dimmed">{emp.department?.name} · {emp.employee_id}</Text>
                                                    </Box>
                                                    {isOv && <Badge size="xs" color="orange" variant="dot">Override</Badge>}
                                                </Group>
                                            </Box>
                                        )
                                    })}
                                    {filtered.length === 0 && <Text size="xs" c="dimmed" ta="center" py="lg">No employees</Text>}
                                </Stack>
                            </ScrollArea>
                            <Text size="xs" c="dimmed" mt="xs">{selectedEmployees.length} selected</Text>
                        </Box>

                        <Button
                            radius="xl" fullWidth size="md"
                            variant="gradient" gradient={{ from: 'violet', to: 'indigo' }}
                            leftSection={<IconPlayerPlay size={16} />}
                            loading={applying}
                            disabled={!selectedEmployees.length || !selectedShift || !activeFrom || !activeUntil}
                            onClick={handleApply}
                        >
                            Apply Override to {selectedEmployees.length || '...'} Employee{selectedEmployees.length !== 1 ? 's' : ''}
                        </Button>
                    </Stack>
                </Paper>
            </Grid.Col>

            {/* Right: Active Overrides */}
            <Grid.Col span={{ base: 12, lg: 5 }}>
                <Paper radius="24px" p="24px" withBorder style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', height: '100%' }}>
                    <Stack gap="md" h="100%">
                        <Group justify="space-between">
                            <Box>
                                <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb={2}>Active Overrides</Text>
                                <Text size="xs" c="dimmed">{activeOverrides.length} employee{activeOverrides.length !== 1 ? 's' : ''} on temporary shifts</Text>
                            </Box>
                            <Group gap="xs">
                                {activeOverrides.length > 0 && (
                                    <Button size="xs" color="red" variant="light" radius="lg" leftSection={<IconArrowBack size={13} />} loading={reverting} onClick={() => onRevert([])}>
                                        Revert All
                                    </Button>
                                )}
                            </Group>
                        </Group>

                        {overrideLoading ? (
                            <Center h={160}><Loader size="sm" /></Center>
                        ) : activeOverrides.length === 0 ? (
                            <Center h={160}>
                                <Stack align="center" gap="xs">
                                    <ThemeIcon size={44} radius="xl" variant="light" color="gray"><IconShieldCheck size={22} /></ThemeIcon>
                                    <Text c="dimmed" size="xs" ta="center">All employees on regular schedules</Text>
                                </Stack>
                            </Center>
                        ) : (
                            <ScrollArea flex={1}>
                                <Stack gap="xs">
                                    {activeOverrides.map(ov => (
                                        <Box key={ov.id} p="sm" style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.7)' }}>
                                            <Group justify="space-between" gap="xs">
                                                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                                    <Avatar size="sm" radius="xl" color="orange">{ov.employee?.first_name?.[0]}{ov.employee?.last_name?.[0]}</Avatar>
                                                    <Box style={{ minWidth: 0 }}>
                                                        <Text size="sm" fw={700} style={{ lineHeight: 1.2 }}>{ov.employee?.first_name} {ov.employee?.last_name}</Text>
                                                        <Text size="xs" c="dimmed">{ov.employee?.department?.name}</Text>
                                                        <Group gap={4} mt={2}>
                                                            <Badge size="xs" color="orange" variant="light">{ov.override_tz?.name || `TZ ${ov.override_tz_id}`}</Badge>
                                                            <Badge size="xs" color="gray" variant="subtle">until {ov.active_until}</Badge>
                                                        </Group>
                                                    </Box>
                                                </Group>
                                                <Tooltip label="Revert employee" withArrow>
                                                    <ActionIcon size="sm" variant="subtle" color="red" radius="lg" onClick={() => onRevert([ov.employee_id])}>
                                                        <IconArrowBack size={13} />
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
    )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ timeZones, departments, employees, activeOverrides }) {
    const overriddenIds = new Set(activeOverrides.map(o => o.employee_id))

    // Build assignment counts per tz
    const counts = {}
    timeZones.forEach(tz => { counts[tz.id] = { departments: 0, employees: 0, empNames: [] } })

    departments.forEach(d => {
        const raw = d.schedules || d.schedule
        const sched = Array.isArray(raw) ? raw[0] : raw
        if (!sched) return
            ;[sched.tz_id_1, sched.tz_id_2, sched.tz_id_3].filter(Boolean).forEach(tzId => {
                if (counts[tzId]) counts[tzId].departments++
            })
    })

    employees.forEach(emp => {
        if (emp.individual_tz_1 && counts[emp.individual_tz_1]) {
            counts[emp.individual_tz_1].employees++
            counts[emp.individual_tz_1].empNames.push(`${emp.first_name} ${emp.last_name}`)
        }
    })

    return (
        <Stack gap="xl">
            {/* Schedule → Departments mapping */}
            <Box>
                <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb="md">Department Schedule Assignments</Text>
                <Stack gap="sm">
                    {departments.map(dept => {
                        const raw = dept.schedules || dept.schedule
                        const sched = Array.isArray(raw) ? raw[0] : raw
                        const tzIds = sched ? [sched.tz_id_1, sched.tz_id_2, sched.tz_id_3].filter(Boolean) : []
                        const assignedTzs = tzIds.map(id => timeZones.find(t => t.id === id)).filter(Boolean)
                        const deptEmployees = employees.filter(e => e.department_id === dept.id)

                        return (
                            <Box key={dept.id} p="md" style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.7)' }}>
                                <Group justify="space-between" align="flex-start">
                                    <Group gap="sm">
                                        <ThemeIcon size={32} radius="lg" variant="light" color="blue"><IconBuilding size={16} /></ThemeIcon>
                                        <Box>
                                            <Text fw={700} size="sm">{dept.name}</Text>
                                            <Text size="xs" c="dimmed">{deptEmployees.length} employee{deptEmployees.length !== 1 ? 's' : ''}</Text>
                                        </Box>
                                    </Group>
                                    <Group gap={6}>
                                        {assignedTzs.length > 0 ? (
                                            assignedTzs.map(tz => (
                                                <Tooltip key={tz.id} label={getShiftLabel(tz)} withArrow>
                                                    <Badge variant="light" color="violet" size="sm" radius="md">{tz.name}</Badge>
                                                </Tooltip>
                                            ))
                                        ) : (
                                            <Badge variant="light" color="gray" size="sm">No shift assigned</Badge>
                                        )}
                                    </Group>
                                </Group>
                            </Box>
                        )
                    })}
                    {departments.length === 0 && <Text c="dimmed" size="sm" ta="center" py="lg">No departments found</Text>}
                </Stack>
            </Box>

            <Divider variant="dashed" opacity={0.4} />

            {/* Employee Schedule Map */}
            <Box>
                <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb="md">Employee Schedule Overview</Text>
                <Box style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                {['Employee', 'Department', 'Effective Schedule', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--mantine-color-dimmed)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const isOv = overriddenIds.has(emp.id)
                                const ov = activeOverrides.find(o => o.employee_id === emp.id)
                                const empTz = emp.individual_tz_1 ? timeZones.find(t => t.id === emp.individual_tz_1) : null
                                const deptSched = (() => {
                                    const d = departments.find(d => d.id === emp.department_id)
                                    const raw = d?.schedules || d?.schedule
                                    const s = Array.isArray(raw) ? raw[0] : raw
                                    const tzId = s?.tz_id_1
                                    return tzId ? timeZones.find(t => t.id === tzId) : null
                                })()
                                const effectiveTz = empTz || deptSched

                                return (
                                    <tr key={emp.id} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                        <td style={{ padding: '10px 16px' }}>
                                            <Group gap="sm">
                                                <Avatar size="sm" radius="xl" color={isOv ? 'orange' : 'violet'}>{emp.first_name?.[0]}{emp.last_name?.[0]}</Avatar>
                                                <Box>
                                                    <Text size="sm" fw={700}>{emp.first_name} {emp.last_name}</Text>
                                                    <Text size="xs" c="dimmed">{emp.employee_id}</Text>
                                                </Box>
                                            </Group>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <Text size="sm" c="dimmed">{emp.department?.name || '—'}</Text>
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            {effectiveTz ? (
                                                <Box>
                                                    <Text size="sm" fw={600}>{effectiveTz.name}</Text>
                                                    <Text size="xs" c="dimmed">{getShiftLabel(effectiveTz)}</Text>
                                                </Box>
                                            ) : (
                                                <Text size="sm" c="dimmed" fs="italic">No schedule</Text>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            {isOv ? (
                                                <Badge size="xs" color="orange" variant="dot">Override active · until {ov?.active_until}</Badge>
                                            ) : empTz ? (
                                                <Badge size="xs" color="violet" variant="dot">Individual</Badge>
                                            ) : (
                                                <Badge size="xs" color="blue" variant="dot">Dept default</Badge>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {employees.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--mantine-color-dimmed)', fontStyle: 'italic' }}>No employees</td></tr>
                            )}
                        </tbody>
                    </table>
                </Box>
            </Box>
        </Stack>
    )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ companyBuffer, setCompanyBuffer, workingDayEnabled, setWorkingDayEnabled, workingDayStart, setWorkingDayStart }) {
    const [savingBuffer, setSavingBuffer] = useState(false)
    const [savingWD, setSavingWD] = useState(false)

    // Burst drain state
    const [draining, setDraining] = useState(false)
    const [drainStats, setDrainStats] = useState(null) // { pending, processing, done, total, percent }
    const [drainLog, setDrainLog] = useState([])
    const drainAbort = useRef(false)

    const saveBuffer = async () => {
        try {
            setSavingBuffer(true)
            const res = await fetch('/api/hr/company-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buffer_time_minutes: companyBuffer }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            showSuccess(`Buffer time set to ${companyBuffer} minutes`, 'Saved')
        } catch (e) { showError(e.message) } finally { setSavingBuffer(false) }
    }

    const saveWD = async () => {
        try {
            setSavingWD(true)
            const res = await fetch('/api/hr/company-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ working_day_enabled: workingDayEnabled, working_day_start_time: workingDayStart }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            showSuccess('Working day settings saved', 'Saved')
        } catch (e) { showError(e.message) } finally { setSavingWD(false) }
    }

    // Fetch queue status
    const fetchQueueStatus = async () => {
        try {
            const res = await fetch('/api/sync/queue-status')
            const json = await res.json()
            setDrainStats(json)
        } catch { }
    }

    // Fire-and-poll burst drain:
    // 1. Single POST fires N parallel Edge Function workers (one per 10 items)
    // 2. Then polls /api/sync/queue-status every 3s until queue is empty
    const handleBurstDrain = async () => {
        drainAbort.current = false
        setDraining(true)
        setDrainLog([])

        try {
            // Step 1: Fire all workers at once
            const res = await fetch('/api/sync/burst-drain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            })
            const json = await res.json()

            if (!res.ok) {
                setDrainLog(prev => [...prev, `❌ Launch failed: ${json.error}`])
                setDraining(false)
                return
            }

            setDrainLog(prev => [
                ...prev,
                `🚀 Launched ${json.fired} parallel workers for ${json.pending} items`,
                `⏱ Est. completion: ~${json.estimatedSeconds || 30}s — polling for progress…`,
            ])

            // Step 2: Poll every 3 seconds until done
            let pollCount = 0
            while (!drainAbort.current) {
                await new Promise(r => setTimeout(r, 3000))
                pollCount++

                const statusRes = await fetch('/api/sync/queue-status')
                const status = await statusRes.json()
                setDrainStats(status)

                const remaining = (status.pending || 0) + (status.processing || 0)
                setDrainLog(prev => [
                    ...prev,
                    `[${pollCount * 3}s] Pending: ${status.pending} · Processing: ${status.processing} · Done: ${status.done}`,
                ])

                if (remaining === 0) {
                    setDrainLog(prev => [...prev, `🎉 Queue empty! ${status.done} records processed, ${status.failed || 0} failed.`])
                    showSuccess(`All ${status.done} records processed`, 'Burst Drain Complete')
                    break
                }

                // Safety: if still running after 5 min, stop polling (Edge Functions may have timed out)
                if (pollCount >= 100) {
                    setDrainLog(prev => [...prev, `⚠ Stopped polling after 5 min. ${remaining} items may still be processing.`])
                    break
                }
            }

            if (drainAbort.current) {
                setDrainLog(prev => [...prev, `⏹ Polling stopped by user.`])
            }
        } catch (err) {
            setDrainLog(prev => [...prev, `❌ ${err.message}`])
        }

        setDraining(false)
    }

    const stopDrain = () => { drainAbort.current = true }

    // Fetch queue status on mount
    useEffect(() => { fetchQueueStatus() }, [])

    return (
        <Stack gap="lg">
            {/* Burst Queue Drain */}
            <Paper radius="20px" p="24px" withBorder style={{ border: '1px solid rgba(255,120,0,0.15)', background: 'rgba(255,250,245,0.9)' }}>
                <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                        <Box>
                            <Group gap="xs" mb={4}>
                                <ThemeIcon size={28} radius="xl" variant="light" color="orange">
                                    <IconRefresh size={14} />
                                </ThemeIcon>
                                <Text fw={800} size="sm">Queue Burst Drain</Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                                Fires parallel workers — one per 10 items — draining the entire queue at once.
                                ~1,000 items process in ~30 seconds. Use after bulk schedule changes or data fixes.
                            </Text>
                        </Box>
                        <ActionIcon variant="subtle" color="gray" radius="lg" onClick={fetchQueueStatus}>
                            <IconRefresh size={16} />
                        </ActionIcon>
                    </Group>

                    {/* Queue Stats */}
                    {drainStats && (
                        <Box p="sm" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12 }}>
                            <Group gap="lg">
                                <Box>
                                    <Text size="10px" tt="uppercase" fw={800} c="dimmed" ls={1}>Pending</Text>
                                    <Text fw={900} size="lg" c={drainStats.pending > 0 ? 'orange' : 'teal'}>{drainStats.pending || 0}</Text>
                                </Box>
                                <Box>
                                    <Text size="10px" tt="uppercase" fw={800} c="dimmed" ls={1}>Processing</Text>
                                    <Text fw={900} size="lg" c="blue">{drainStats.processing || 0}</Text>
                                </Box>
                                <Box>
                                    <Text size="10px" tt="uppercase" fw={800} c="dimmed" ls={1}>Done</Text>
                                    <Text fw={900} size="lg" c="teal">{drainStats.done || 0}</Text>
                                </Box>
                                {(drainStats.failed || 0) > 0 && (
                                    <Box>
                                        <Text size="10px" tt="uppercase" fw={800} c="dimmed" ls={1}>Failed</Text>
                                        <Text fw={900} size="lg" c="red">{drainStats.failed}</Text>
                                    </Box>
                                )}
                                <Box>
                                    <Text size="10px" tt="uppercase" fw={800} c="dimmed" ls={1}>Progress</Text>
                                    <Text fw={900} size="lg">{drainStats.percent || 0}%</Text>
                                </Box>
                            </Group>
                        </Box>
                    )}

                    {/* Action Buttons */}
                    <Group gap="md">
                        {!draining ? (
                            <Button
                                radius="md"
                                color="orange"
                                variant="filled"
                                leftSection={<IconPlayerPlay size={16} />}
                                onClick={handleBurstDrain}
                                disabled={drainStats && drainStats.pending === 0 && !drainStats.processing}
                            >
                                {drainStats?.pending > 0 ? `Drain ${drainStats.pending} Pending Items` : 'Start Burst Drain'}
                            </Button>
                        ) : (
                            <Button
                                radius="md"
                                color="red"
                                variant="light"
                                onClick={stopDrain}
                            >
                                Stop Drain
                            </Button>
                        )}
                        <Button
                            radius="md"
                            variant="subtle"
                            color="gray"
                            onClick={fetchQueueStatus}
                        >
                            Refresh Status
                        </Button>
                    </Group>

                    {/* Live Log */}
                    {drainLog.length > 0 && (
                        <ScrollArea h={150} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: '8px 12px', fontFamily: 'monospace' }}>
                            <Stack gap={2}>
                                {drainLog.map((line, i) => (
                                    <Text key={i} size="xs" c={line.startsWith('❌') ? 'red' : line.startsWith('🎉') ? 'teal' : 'dimmed'}>
                                        {line}
                                    </Text>
                                ))}
                            </Stack>
                        </ScrollArea>
                    )}
                </Stack>
            </Paper>

            <Paper radius="20px" p="24px" withBorder style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)' }}>
                <Stack gap="md">
                    <Box>
                        <Text fw={800} size="sm" mb={4}>Company-Wide Grace Period</Text>
                        <Text size="xs" c="dimmed">Default buffer/grace time applied to all schedules for late-in calculations. Can be overridden per schedule.</Text>
                    </Box>
                    <Group align="flex-end" gap="md">
                        <NumberInput
                            label="Buffer Time (minutes)"
                            value={companyBuffer}
                            onChange={v => setCompanyBuffer(Number(v) || 30)}
                            min={0} max={120}
                            style={{ width: 220 }}
                            radius="md"
                        />
                        <Button radius="md" loading={savingBuffer} onClick={saveBuffer}>Save Default</Button>
                    </Group>
                </Stack>
            </Paper>

            <Paper radius="20px" p="24px" withBorder style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)' }}>
                <Stack gap="md">
                    <Box>
                        <Text fw={800} size="sm" mb={4}>Working Day Boundaries</Text>
                        <Text size="xs" c="dimmed">
                            When enabled, a "working day" is a 24-hour cycle starting at the configured time.
                            For example, if start is 9:00 AM, the working day runs from 9:00 AM to 8:59 AM the next day.
                            This improves overnight shift absence detection accuracy.
                        </Text>
                    </Box>
                    <Switch
                        label="Enable working day concept"
                        checked={workingDayEnabled}
                        onChange={e => setWorkingDayEnabled(e.currentTarget.checked)}
                        size="md"
                        color="violet"
                    />
                    {workingDayEnabled && (
                        <Group align="flex-end" gap="md">
                            <TextInput
                                label="Working Day Start"
                                placeholder="10:00"
                                value={workingDayStart}
                                onChange={e => setWorkingDayStart(e.target.value)}
                                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                                style={{ width: 180 }}
                                radius="md"
                            />
                            <Box style={{ width: 180 }}>
                                <Text size="sm" fw={500} mb={4}>End Time (auto — next day)</Text>
                                <Paper withBorder p="xs" radius="md">
                                    <Text size="sm" fw={600}>
                                        {(() => {
                                            try {
                                                const [h, m] = workingDayStart.split(':').map(Number)
                                                const totalMins = h * 60 + m - 1
                                                const eh = Math.floor((totalMins + 1440) % 1440 / 60)
                                                const em = (totalMins + 1440) % 60
                                                const label = `${eh % 12 || 12}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`
                                                return `${label} (next day)`
                                            } catch { return '(auto)' }
                                        })()}
                                    </Text>
                                </Paper>
                            </Box>
                        </Group>
                    )}
                    <Box>
                        <Button radius="md" loading={savingWD} onClick={saveWD}>Save Working Day Settings</Button>
                    </Box>
                </Stack>
            </Paper>
        </Stack>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
    const [timeZones, setTimeZones] = useState([])
    const [departments, setDepartments] = useState([])
    const [employees, setEmployees] = useState([])
    const [activeOverrides, setActiveOverrides] = useState([])
    const [loading, setLoading] = useState(true)
    const [overrideLoading, setOverrideLoading] = useState(false)

    // Builder state
    const [builderOpen, setBuilderOpen] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [saving, setSaving] = useState(false)

    // Override actions
    const [applying, setApplying] = useState(false)
    const [reverting, setReverting] = useState(false)

    // Company settings
    const [companyBuffer, setCompanyBuffer] = useState(30)
    const [workingDayEnabled, setWorkingDayEnabled] = useState(false)
    const [workingDayStart, setWorkingDayStart] = useState('10:00')

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [tzRes, deptRes, empRes, ovRes, settRes] = await Promise.all([
                fetch('/api/hr/time-zones'),
                fetch('/api/hr/departments'),
                fetch('/api/employees'),
                fetch('/api/hr/schedule-overrides'),
                fetch('/api/hr/company-settings'),
            ])
            const [tz, dept, emp, ov, sett] = await Promise.all([tzRes.json(), deptRes.json(), empRes.json(), ovRes.json(), settRes.json()])
            setTimeZones(tz.data || [])
            setDepartments(dept.data || [])
            setEmployees(emp.data || [])
            setActiveOverrides(ov.data || [])
            if (sett.data) {
                setCompanyBuffer(Number(sett.data.buffer_time_minutes) || 30)
                setWorkingDayEnabled(sett.data.working_day_enabled === 'true' || sett.data.working_day_enabled === true)
                setWorkingDayStart(sett.data.working_day_start_time || '10:00')
            }
        } catch (e) { showError('Failed to load data') }
        setLoading(false)
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const refreshOverrides = async () => {
        try {
            setOverrideLoading(true)
            const res = await fetch('/api/hr/schedule-overrides')
            const json = await res.json()
            setActiveOverrides(json.data || [])
        } catch { } finally { setOverrideLoading(false) }
    }

    const handleSaveSchedule = async (payload) => {
        try {
            setSaving(true)
            const res = await fetch('/api/hr/tz-set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            showSuccess(`"${payload.name}" ${editTarget ? 'updated' : 'created'}`, 'Schedule Saved')
            setBuilderOpen(false); setEditTarget(null)
            const tzRes = await fetch('/api/hr/time-zones')
            setTimeZones((await tzRes.json()).data || [])
        } catch (e) { showError(e.message) } finally { setSaving(false) }
    }

    const handleDeleteSchedule = async (tz) => {
        if (!confirm(`Delete schedule "${tz.name}"? This cannot be undone.`)) return
        try {
            const res = await fetch(`/api/hr/time-zones/${tz.id}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.error || 'Failed to delete')
            showSuccess(`"${tz.name}" removed`, 'Deleted')
            const tzRes = await fetch('/api/hr/time-zones')
            setTimeZones((await tzRes.json()).data || [])
        } catch (e) { showError(e.message) }
    }

    const handleApplyOverride = async (payload) => {
        try {
            setApplying(true)
            const res = await fetch('/api/hr/schedule-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            showSuccess(json.message, 'Override Applied ✓')
            await refreshOverrides()
        } catch (e) { showError(e.message) } finally { setApplying(false) }
    }

    const handleRevert = async (employeeIds) => {
        try {
            setReverting(true)
            const res = await fetch('/api/hr/schedule-overrides', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_ids: employeeIds || [] }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error)
            showSuccess(json.message, 'Reverted ✓')
            await refreshOverrides()
        } catch (e) { showError(e.message) } finally { setReverting(false) }
    }

    // Build assignment counts for schedule cards
    const assignmentCounts = {}
    timeZones.forEach(tz => { assignmentCounts[tz.id] = { departments: 0, employees: 0 } })
    departments.forEach(d => {
        const raw = d.schedules || d.schedule
        const sched = Array.isArray(raw) ? raw[0] : raw
        if (!sched) return
            ;[sched.tz_id_1, sched.tz_id_2, sched.tz_id_3].filter(Boolean).forEach(tzId => {
                if (assignmentCounts[tzId]) assignmentCounts[tzId].departments++
            })
    })
    employees.forEach(emp => {
        if (emp.individual_tz_1 && assignmentCounts[emp.individual_tz_1]) {
            assignmentCounts[emp.individual_tz_1].employees++
        }
    })

    if (loading) return (
        <Container size="xl" py="xl">
            <Center h={400}><Stack align="center" gap="md"><Loader size="lg" color="violet" /><Text c="dimmed">Loading schedule data...</Text></Stack></Center>
        </Container>
    )

    return (
        <Container size="xl" py="40px">
            <Stack gap="xl">

                {/* ─── Header ─── */}
                <Group justify="space-between" align="flex-end">
                    <Box>
                        <Title order={1} fw={900} style={{ letterSpacing: '-1.5px', fontSize: '38px', color: 'var(--mantine-color-violet-9)' }}>
                            Schedules
                        </Title>
                        <Text c="dimmed" size="md" fw={500} mt={4}>
                            Build, assign, and manage work schedules across your organization.
                        </Text>
                    </Box>
                    <Button
                        size="md" radius="xl"
                        variant="gradient" gradient={{ from: 'violet', to: 'indigo' }}
                        leftSection={<IconPlus size={18} />}
                        onClick={() => { setEditTarget(null); setBuilderOpen(true) }}
                    >
                        New Schedule
                    </Button>
                </Group>

                {/* ─── Stats ─── */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    {[
                        { label: 'Total Schedules', value: timeZones.length, color: 'violet', icon: IconCalendar },
                        { label: 'Departments', value: departments.length, color: 'blue', icon: IconBuilding },
                        { label: 'Employees', value: employees.length, color: 'teal', icon: IconUsers },
                        { label: 'On Override', value: activeOverrides.length, color: 'orange', icon: IconMoon },
                    ].map(stat => (
                        <Paper key={stat.label} p="lg" radius="20px" withBorder style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
                            <Group justify="space-between">
                                <Box>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>{stat.label}</Text>
                                    <Title order={2} fw={900} c={stat.value > 0 && stat.label === 'On Override' ? 'orange' : undefined}>
                                        {stat.value}
                                    </Title>
                                </Box>
                                <ThemeIcon size={44} radius="xl" variant="light" color={stat.color}>
                                    <stat.icon size={20} />
                                </ThemeIcon>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                {/* ─── Tabs ─── */}
                <Tabs defaultValue="library" radius="xl" variant="pills">
                    <Tabs.List mb="xl" style={{ background: 'rgba(0,0,0,0.03)', padding: '6px', borderRadius: '999px', display: 'inline-flex', gap: '2px' }}>
                        <Tabs.Tab value="library" leftSection={<IconLayoutGrid size={15} />} fw={700}>Schedule Library</Tabs.Tab>
                        <Tabs.Tab value="overview" leftSection={<IconEye size={15} />} fw={700}>Assignments</Tabs.Tab>
                        <Tabs.Tab
                            value="overrides"
                            leftSection={<IconMoon size={15} />}
                            fw={700}
                            rightSection={activeOverrides.length > 0 ? <Badge size="xs" color="orange" variant="filled" circle>{activeOverrides.length}</Badge> : null}
                        >
                            Overrides
                        </Tabs.Tab>
                        <Tabs.Tab value="settings" leftSection={<IconSettings size={15} />} fw={700}>Settings</Tabs.Tab>
                    </Tabs.List>

                    {/* ── Library ── */}
                    <Tabs.Panel value="library">
                        {timeZones.length === 0 ? (
                            <Center h={300}>
                                <Stack align="center" gap="md">
                                    <ThemeIcon size={64} radius="xl" variant="light" color="violet"><IconCalendar size={30} /></ThemeIcon>
                                    <Text fw={700} size="lg">No Schedules Yet</Text>
                                    <Text c="dimmed" ta="center">Create your first work schedule to get started.</Text>
                                    <Button radius="xl" variant="gradient" gradient={{ from: 'violet', to: 'indigo' }} leftSection={<IconPlus size={16} />} onClick={() => { setEditTarget(null); setBuilderOpen(true) }}>
                                        Create First Schedule
                                    </Button>
                                </Stack>
                            </Center>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                                {timeZones.map(tz => (
                                    <ScheduleCard
                                        key={tz.id}
                                        tz={tz}
                                        companyBuffer={companyBuffer}
                                        assignmentCounts={assignmentCounts}
                                        onEdit={(tz) => { setEditTarget(tz); setBuilderOpen(true) }}
                                        onDelete={handleDeleteSchedule}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* ── Overview / Assignments ── */}
                    <Tabs.Panel value="overview">
                        <Paper radius="28px" p="28px" withBorder style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
                            <OverviewTab
                                timeZones={timeZones}
                                departments={departments}
                                employees={employees}
                                activeOverrides={activeOverrides}
                            />
                        </Paper>
                    </Tabs.Panel>

                    {/* ── Overrides ── */}
                    <Tabs.Panel value="overrides">
                        <AssignmentsTab
                            timeZones={timeZones}
                            departments={departments}
                            employees={employees}
                            activeOverrides={activeOverrides}
                            overrideLoading={overrideLoading}
                            onApplyOverride={handleApplyOverride}
                            onRevert={handleRevert}
                            applying={applying}
                            reverting={reverting}
                        />
                    </Tabs.Panel>

                    {/* ── Settings ── */}
                    <Tabs.Panel value="settings">
                        <SettingsTab
                            companyBuffer={companyBuffer}
                            setCompanyBuffer={setCompanyBuffer}
                            workingDayEnabled={workingDayEnabled}
                            setWorkingDayEnabled={setWorkingDayEnabled}
                            workingDayStart={workingDayStart}
                            setWorkingDayStart={setWorkingDayStart}
                        />
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            {/* ─── Schedule Builder Modal ─── */}
            <ScheduleBuilder
                opened={builderOpen}
                onClose={() => { setBuilderOpen(false); setEditTarget(null) }}
                onSave={handleSaveSchedule}
                saving={saving}
                existingIds={timeZones.map(tz => tz.id)}
                editTarget={editTarget}
                companyBuffer={companyBuffer}
            />
        </Container>
    )
}
