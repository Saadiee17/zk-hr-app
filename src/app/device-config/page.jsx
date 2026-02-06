'use client'

import { useEffect, useState } from 'react'
import { Container, Title, Paper, Text, TextInput, NumberInput, Button, Group, Table, Modal, ActionIcon, Stack, Checkbox, Badge, Tabs } from '@mantine/core'
import { IconTrash, IconEdit, IconUsers } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { TimeInput } from '@mantine/dates'

export default function DeviceConfigPage() {
  const [timeZones, setTimeZones] = useState([])
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [daySelected, setDaySelected] = useState(days.map(() => false))
  const [scheduleName, setScheduleName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmNightOpen, setConfirmNightOpen] = useState(false)
  const [selectedTzId, setSelectedTzId] = useState(null)
  const [assignments, setAssignments] = useState({ departments: [], employees: [] })
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editName, setEditName] = useState('')
  const [editShiftStart, setEditShiftStart] = useState('')
  const [editShiftEnd, setEditShiftEnd] = useState('')
  const [editDaySelected, setEditDaySelected] = useState(days.map(() => false))
  const [editSaving, setEditSaving] = useState(false)
  const [bufferTimeMinutes, setBufferTimeMinutes] = useState(null) // null means use company default
  const [editBufferTimeMinutes, setEditBufferTimeMinutes] = useState(null)
  const [companyBufferTime, setCompanyBufferTime] = useState(30)
  const [savingCompanyBuffer, setSavingCompanyBuffer] = useState(false)
  const [workingDayEnabled, setWorkingDayEnabled] = useState(false)
  const [workingDayStartTime, setWorkingDayStartTime] = useState('10:00')
  const [savingWorkingDay, setSavingWorkingDay] = useState(false)

  const fetchTimeZones = async () => {
    try {
      const res = await fetch('/api/hr/time-zones')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch schedules')
      setTimeZones(json.data || [])
    } catch (error) {
      setTimeZones([])
    }
  }

  const fetchCompanySettings = async () => {
    try {
      const res = await fetch('/api/hr/company-settings')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch company settings')
      const settings = json.data || {}
      const bufferTime = settings.buffer_time_minutes ? Number(settings.buffer_time_minutes) : 30
      setCompanyBufferTime(bufferTime)

      // Working day settings
      setWorkingDayEnabled(settings.working_day_enabled === 'true' || settings.working_day_enabled === true)
      setWorkingDayStartTime(settings.working_day_start_time || '10:00')
    } catch (error) {
      console.warn('Failed to fetch company settings:', error)
      setCompanyBufferTime(30) // Default fallback
      setWorkingDayEnabled(false)
      setWorkingDayStartTime('10:00')
    }
  }

  useEffect(() => {
    fetchTimeZones()
    fetchCompanySettings()
  }, [])

  // Convert "HH:mm" time string to "HHMM" format for tz_string
  // IMPORTANT: Times entered by user are treated as Pakistan Local Time (UTC+5)
  // The calculation module expects tz_string times to be in Pakistan time
  // and will convert them to UTC internally for matching against UTC punch timestamps
  // Parse HHMM format to readable time (HH:MM AM/PM)
  const formatHHMM = (hhmm) => {
    if (!hhmm || hhmm.length !== 4) return '--:--'
    const hour = parseInt(hhmm.slice(0, 2))
    const min = hhmm.slice(2, 4)
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${hour12}:${min} ${ampm}`
  }

  // Parse tz_string to extract schedule details
  const parseSchedule = (tzString) => {
    if (!tzString || tzString.length !== 56) return null

    const scheduleDays = []
    let commonStart = null
    let commonEnd = null
    let hasCommonSchedule = true

    for (let weekday = 0; weekday < 7; weekday++) {
      const start = weekday * 8
      const seg = tzString.slice(start, start + 8)
      const startHHMM = seg.slice(0, 4)
      const endHHMM = seg.slice(4, 8)

      if (startHHMM === '0000' && endHHMM === '2359') {
        scheduleDays.push(null) // Day off
      } else {
        scheduleDays.push({ startHHMM, endHHMM })
        if (commonStart === null) {
          commonStart = startHHMM
          commonEnd = endHHMM
        } else if (commonStart !== startHHMM || commonEnd !== endHHMM) {
          hasCommonSchedule = false
        }
      }
    }

    return {
      scheduleDays,
      commonStart,
      commonEnd,
      hasCommonSchedule
    }
  }

  // Format schedule display text
  const formatScheduleDisplay = (tz) => {
    const parsed = parseSchedule(tz.tz_string)
    if (!parsed) return 'Invalid schedule'

    if (parsed.hasCommonSchedule && parsed.commonStart && parsed.commonEnd) {
      const startTime = formatHHMM(parsed.commonStart)
      const endTime = formatHHMM(parsed.commonEnd)
      const workingDays = parsed.scheduleDays
        .map((day, idx) => day ? days[idx].slice(0, 3) : null)
        .filter(Boolean)
        .join(', ')
      return `${startTime} - ${endTime} (${workingDays})`
    } else {
      // Different shifts for different days
      const dayShifts = parsed.scheduleDays
        .map((day, idx) => {
          if (!day) return null
          return `${days[idx].slice(0, 3)}: ${formatHHMM(day.startHHMM)} - ${formatHHMM(day.endHHMM)}`
        })
        .filter(Boolean)
        .join(', ')
      return dayShifts || 'No working days'
    }
  }

  // Convert HHMM to HH:mm format for TimeInput
  const HHMMtoTime = (hhmm) => {
    if (!hhmm || hhmm.length !== 4) return ''
    return `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`
  }

  // Convert HH:mm to HHMM format
  const timeToHHMM = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return '0000'
    const [hh, mm] = timeStr.split(':')
    const h = String(parseInt(hh || '0', 10)).padStart(2, '0')
    const m = String(parseInt(mm || '0', 10)).padStart(2, '0')
    return `${h}${m}`
  }

  const timeToNumber = (t) => {
    if (!t) return 0
    const [hh, mm] = t.split(':')
    return (parseInt(hh || '0', 10) * 100) + (parseInt(mm || '0', 10))
  }

  const generateTzString = () => {
    const segment = `${timeToHHMM(shiftStart)}${timeToHHMM(shiftEnd)}`
    return daySelected.map((sel) => (sel ? segment : '00002359')).join('')
  }

  const generateEditTzString = () => {
    const segment = `${timeToHHMM(editShiftStart)}${timeToHHMM(editShiftEnd)}`
    return editDaySelected.map((sel) => (sel ? segment : '00002359')).join('')
  }

  const handleSaveSchedule = async (skipNightCheck = false) => {
    if (!scheduleName.trim()) {
      showError('Please enter a schedule name')
      return
    }

    const hasTimes = Boolean(shiftStart) && Boolean(shiftEnd)
    const hasDay = daySelected.some(Boolean)
    if (!hasTimes || !hasDay) {
      showError('Please define the shift time and select at least one working day.')
      return
    }

    if (!skipNightCheck) {
      const startNum = timeToNumber(shiftStart)
      const endNum = timeToNumber(shiftEnd)
      const crossesMidnight = startNum > endNum

      if (crossesMidnight) {
        setConfirmNightOpen(true)
        return
      }
    }

    // Find next available TZ ID (1-50)
    const existingIds = new Set(timeZones.map(tz => tz.id))
    let nextId = null
    for (let i = 1; i <= 50; i++) {
      if (!existingIds.has(i)) {
        nextId = i
        break
      }
    }

    if (!nextId) {
      showError('All 50 schedule slots are in use. Please delete an existing schedule first.')
      return
    }

    const tzString = generateTzString()

    try {
      setSaving(true)
      const res = await fetch('/api/hr/tz-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: nextId,
          name: scheduleName.trim(),
          tz_string: tzString,
          buffer_time_minutes: bufferTimeMinutes != null ? bufferTimeMinutes : null,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save schedule')
      }

      showSuccess(`Schedule "${scheduleName.trim()}" saved successfully`, 'Schedule Saved')
      await fetchTimeZones()
      // Reset form
      setScheduleName('')
      setShiftStart('')
      setShiftEnd('')
      setDaySelected(days.map(() => false))
      setBufferTimeMinutes(null) // Reset to null (use company default)
    } catch (error) {
      showError(error.message || 'Could not save schedule', 'Save Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleEditSchedule = async (tz) => {
    setEditingSchedule(tz)
    setEditName(tz.name)
    setEditBufferTimeMinutes(tz.buffer_time_minutes != null ? tz.buffer_time_minutes : null)

    const parsed = parseSchedule(tz.tz_string)
    if (parsed && parsed.hasCommonSchedule && parsed.commonStart && parsed.commonEnd) {
      setEditShiftStart(HHMMtoTime(parsed.commonStart))
      setEditShiftEnd(HHMMtoTime(parsed.commonEnd))
      setEditDaySelected(parsed.scheduleDays.map(day => day !== null))
    } else {
      // Extract first working day as default
      const firstWorkingDay = parsed?.scheduleDays.find(day => day !== null)
      if (firstWorkingDay) {
        setEditShiftStart(HHMMtoTime(firstWorkingDay.startHHMM))
        setEditShiftEnd(HHMMtoTime(firstWorkingDay.endHHMM))
        setEditDaySelected(parsed.scheduleDays.map(day => day !== null))
      } else {
        setEditShiftStart('')
        setEditShiftEnd('')
        setEditDaySelected(days.map(() => false))
      }
    }

    // Also fetch assignments when opening edit modal
    setSelectedTzId(tz.id)
    setLoadingAssignments(true)
    try {
      const res = await fetch(`/api/hr/time-zones/${tz.id}/assignments`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch assignments')
      setAssignments(json.data || { departments: [], employees: [] })
    } catch (error) {
      console.warn('Failed to load assignments:', error)
      setAssignments({ departments: [], employees: [] })
    } finally {
      setLoadingAssignments(false)
    }

    setEditModalOpen(true)
  }

  const handleSaveEdit = async (skipNightCheck = false) => {
    if (!editName.trim()) {
      showError('Please enter a schedule name')
      return
    }

    const hasTimes = Boolean(editShiftStart) && Boolean(editShiftEnd)
    const hasDay = editDaySelected.some(Boolean)
    if (!hasTimes || !hasDay) {
      showError('Please define the shift time and select at least one working day.')
      return
    }

    if (!skipNightCheck) {
      const startNum = timeToNumber(editShiftStart)
      const endNum = timeToNumber(editShiftEnd)
      const crossesMidnight = startNum > endNum

      if (crossesMidnight) {
        setConfirmNightOpen(true)
        return
      }
    }

    const tzString = generateEditTzString()

    try {
      setEditSaving(true)
      const res = await fetch('/api/hr/tz-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSchedule.id,
          name: editName.trim(),
          tz_string: tzString,
          buffer_time_minutes: editBufferTimeMinutes,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update schedule')
      }

      showSuccess(`Schedule "${editName.trim()}" updated successfully`, 'Schedule Updated')
      await fetchTimeZones()
      setEditModalOpen(false)
      setEditingSchedule(null)
    } catch (error) {
      showError(error.message || 'Could not update schedule', 'Update Failed')
    } finally {
      setEditSaving(false)
    }
  }

  const handleSaveCompanyBufferTime = async () => {
    try {
      setSavingCompanyBuffer(true)
      const res = await fetch('/api/hr/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buffer_time_minutes: companyBufferTime,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save company buffer time')
      }

      showSuccess(`Company-wide buffer time set to ${companyBufferTime} minutes`, 'Company Buffer Time Updated')
    } catch (error) {
      showError(error.message || 'Could not save company buffer time', 'Save Failed')
    } finally {
      setSavingCompanyBuffer(false)
    }
  }

  const handleSaveWorkingDaySettings = async () => {
    try {
      setSavingWorkingDay(true)
      const res = await fetch('/api/hr/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          working_day_enabled: workingDayEnabled,
          working_day_start_time: workingDayStartTime,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save working day settings')
      }

      showSuccess(
        workingDayEnabled
          ? `Working day enabled: ${workingDayStartTime} to 9:59 AM next day`
          : 'Working day concept disabled - using calendar dates',
        'Working Day Settings Updated'
      )
    } catch (error) {
      showError(error.message || 'Could not save working day settings', 'Save Failed')
    } finally {
      setSavingWorkingDay(false)
    }
  }

  const tzRows = timeZones.map((tz) => (
    <Table.Tr key={tz.id}>
      <Table.Td>{tz.id}</Table.Td>
      <Table.Td>
        <Text fw={500}>{tz.name}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">{formatScheduleDisplay(tz)}</Text>
      </Table.Td>
      <Table.Td>
        <Badge variant={tz.buffer_time_minutes != null ? 'filled' : 'light'}>
          {tz.buffer_time_minutes != null ? `${tz.buffer_time_minutes} min (override)` : `${companyBufferTime} min (company default)`}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            aria-label="Edit Schedule"
            onClick={() => handleEditSchedule(tz)}
          >
            <IconEdit size={18} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            aria-label="Delete"
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete schedule "${tz.name}"?`)) return
              try {
                const res = await fetch(`/api/hr/time-zones/${tz.id}`, { method: 'DELETE' })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json.error || 'Failed to delete schedule')
                showSuccess(`Schedule "${tz.name}" removed`, 'Deleted')
                await fetchTimeZones()
              } catch (error) {
                showError(error.message || 'Could not delete schedule', 'Delete Failed')
              }
            }}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Schedule Management</Title>

      <Paper withBorder shadow="sm" p="md" mb="md">
        <Stack gap="md">
          <Title order={4}>Company-Wide Buffer Time</Title>
          <Text size="sm" c="dimmed">
            Set the default buffer time for late-in calculations. This applies to all schedules unless overridden at the schedule level.
          </Text>
          <Group wrap="wrap" gap="md" align="end">
            <NumberInput
              label="Buffer Time (minutes)"
              description="Grace period for late-in calculation"
              value={companyBufferTime}
              onChange={(value) => setCompanyBufferTime(Number(value) || 30)}
              min={0}
              max={120}
              style={{ width: 250 }}
            />
            <Button onClick={handleSaveCompanyBufferTime} loading={savingCompanyBuffer}>
              Save Company Default
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder shadow="sm" p="md" mb="md">
        <Stack gap="md">
          <Title order={4}>Working Day Configuration</Title>
          <Text size="sm" c="dimmed">
            Enable working day concept to simplify overnight shift calculations. When enabled, a working day spans from the start time to 9:59 AM the next calendar day. This helps determine if someone is &quot;absent&quot; vs &quot;shift not started&quot; more accurately.
          </Text>
          <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
            <strong>Note:</strong> You can disable this feature at any time to revert to the previous calendar date-based logic.
          </Text>

          <Checkbox
            label="Enable Working Day Concept"
            description="When enabled, uses working day boundaries instead of calendar dates"
            checked={workingDayEnabled}
            onChange={(e) => setWorkingDayEnabled(e.currentTarget.checked)}
            mb="md"
          />

          {workingDayEnabled && (
            <Group wrap="wrap" gap="md" align="end">
              <TextInput
                label="Working Day Start Time"
                description="Time when working day begins (HH:MM format, e.g., 10:00)"
                placeholder="10:00"
                value={workingDayStartTime}
                onChange={(e) => setWorkingDayStartTime(e.target.value)}
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                style={{ width: 250 }}
                required
              />
              <div style={{ width: 250 }}>
                <Text size="sm" fw={500} mb={4}>Working Day End Time</Text>
                <Text size="sm" c="dimmed" mb="xs">Automatically calculated</Text>
                <Paper withBorder p="sm" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                  <Text size="sm" fw={500}>9:59 AM (next calendar day)</Text>
                </Paper>
              </div>
              <Button
                onClick={handleSaveWorkingDaySettings}
                loading={savingWorkingDay}
                disabled={!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(workingDayStartTime)}
              >
                Save Working Day Settings
              </Button>
            </Group>
          )}

          {workingDayEnabled && (
            <Text size="xs" c="blue" mt="xs">
              Working day will span from <strong>{workingDayStartTime}</strong> to <strong>9:59 AM</strong> the next calendar day (24-hour period).
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder shadow="sm" p="md" mb="md">
        <Stack gap="md">
          <Title order={4}>Create New Schedule</Title>
          <TextInput
            label="Schedule Name"
            placeholder="e.g., Standard 9-5, Night Shift, Part-Time Morning"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.currentTarget.value)}
            required
            style={{ maxWidth: 400 }}
          />
          <Group wrap="wrap" gap="md" align="end">
            <TimeInput
              label="Shift Start"
              withSeconds={false}
              value={shiftStart}
              onChange={(e) => {
                const value = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                setShiftStart(value)
              }}
              style={{ width: 160 }}
            />
            <TimeInput
              label="Shift End"
              withSeconds={false}
              value={shiftEnd}
              onChange={(e) => {
                const value = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                setShiftEnd(value)
              }}
              style={{ width: 160 }}
            />
            <NumberInput
              label="Buffer Time Override (minutes)"
              description={`Leave empty to use company default (${companyBufferTime} min)`}
              value={bufferTimeMinutes != null ? bufferTimeMinutes : ''}
              onChange={(value) => setBufferTimeMinutes(value === '' || value == null ? null : Number(value) || null)}
              min={0}
              max={120}
              placeholder={`Company default: ${companyBufferTime} min`}
              style={{ width: 250 }}
            />
          </Group>
          <Stack gap="xs">
            <Text size="sm" fw={500}>Working Days</Text>
            <Group wrap="wrap" gap="md">
              {days.map((d, idx) => (
                <Checkbox
                  key={d}
                  label={d}
                  checked={daySelected[idx]}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked
                    setDaySelected((prev) => {
                      const next = [...prev]
                      next[idx] = checked
                      return next
                    })
                  }}
                />
              ))}
            </Group>
          </Stack>
          <Group>
            <Button onClick={handleSaveSchedule} loading={saving}>
              Save Schedule
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Modal
        opened={confirmNightOpen}
        onClose={() => setConfirmNightOpen(false)}
        title="Night Shift Confirmation"
      >
        <Stack>
          <Text>
            The shift times you entered ({editingSchedule ? editShiftStart : shiftStart || '??'} - {editingSchedule ? editShiftEnd : shiftEnd || '??'}) span two calendar days.
            Are you trying to set a Night Shift that crosses midnight?
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setConfirmNightOpen(false)
                showError('Please adjust the Start/End times to proceed with a single-day shift.', 'Night shift cancelled')
              }}
            >
              No
            </Button>
            <Button
              onClick={() => {
                setConfirmNightOpen(false)
                if (editingSchedule) {
                  handleSaveEdit(true) // Skip night check since user confirmed
                } else {
                  handleSaveSchedule(true) // Skip night check since user confirmed
                }
              }}
            >
              Yes, {editingSchedule ? 'Update' : 'Create'} Night Shift
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingSchedule(null)
        }}
        title={`Schedule - ${editingSchedule?.name || ''}`}
        size="lg"
      >
        <Tabs defaultValue="edit">
          <Tabs.List>
            <Tabs.Tab value="edit" leftSection={<IconEdit size={16} />}>
              Edit Schedule
            </Tabs.Tab>
            <Tabs.Tab value="assignments" leftSection={<IconUsers size={16} />}>
              Assignments ({assignments.departments.length + assignments.employees.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="edit" pt="md">
            <Stack gap="md">
              <TextInput
                label="Schedule Name"
                placeholder="e.g., Standard 9-5, Night Shift, Part-Time Morning"
                value={editName}
                onChange={(e) => setEditName(e.currentTarget.value)}
                required
              />
              <Group wrap="wrap" gap="md" align="end">
                <TimeInput
                  label="Shift Start"
                  withSeconds={false}
                  value={editShiftStart}
                  onChange={(e) => {
                    const value = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                    setEditShiftStart(value)
                  }}
                  style={{ width: 160 }}
                />
                <TimeInput
                  label="Shift End"
                  withSeconds={false}
                  value={editShiftEnd}
                  onChange={(e) => {
                    const value = e?.currentTarget?.value || e?.target?.value || (typeof e === 'string' ? e : '')
                    setEditShiftEnd(value)
                  }}
                  style={{ width: 160 }}
                />
                <NumberInput
                  label="Buffer Time Override (minutes)"
                  description={`Leave empty to use company default (${companyBufferTime} min)`}
                  value={editBufferTimeMinutes != null ? editBufferTimeMinutes : ''}
                  onChange={(value) => setEditBufferTimeMinutes(value === '' || value == null ? null : Number(value) || null)}
                  min={0}
                  max={120}
                  placeholder={`Company default: ${companyBufferTime} min`}
                  style={{ width: 250 }}
                />
              </Group>
              <Stack gap="xs">
                <Text size="sm" fw={500}>Working Days</Text>
                <Group wrap="wrap" gap="md">
                  {days.map((d, idx) => (
                    <Checkbox
                      key={d}
                      label={d}
                      checked={editDaySelected[idx]}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked
                        setEditDaySelected((prev) => {
                          const next = [...prev]
                          next[idx] = checked
                          return next
                        })
                      }}
                    />
                  ))}
                </Group>
              </Stack>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => {
                    setEditModalOpen(false)
                    setEditingSchedule(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} loading={editSaving}>
                  Update Schedule
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="assignments" pt="md">
            <Stack gap="md">
              {loadingAssignments ? (
                <Text c="dimmed">Loading...</Text>
              ) : (
                <>
                  <div>
                    <Text fw={600} mb="xs">Departments ({assignments.departments.length})</Text>
                    {assignments.departments.length > 0 ? (
                      <Stack gap="xs">
                        {assignments.departments.map((dept) => (
                          <Group key={dept.id} justify="space-between">
                            <Text>{dept.name}</Text>
                            <Badge variant="light">{dept.slot}</Badge>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text c="dimmed" size="sm">No departments assigned</Text>
                    )}
                  </div>
                  <div>
                    <Text fw={600} mb="xs">Employees ({assignments.employees.length})</Text>
                    {assignments.employees.length > 0 ? (
                      <Stack gap="xs">
                        {assignments.employees.map((emp) => (
                          <Group key={emp.id} justify="space-between">
                            <div>
                              <Text>{emp.name}</Text>
                              <Text size="xs" c="dimmed">{emp.employee_id} • {emp.department}</Text>
                            </div>
                            <Badge variant="light">{emp.slot}</Badge>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text c="dimmed" size="sm">No employees assigned</Text>
                    )}
                  </div>
                </>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <Paper withBorder shadow="sm" p="md">
        <Stack gap="md">
          <Title order={4}>Existing Schedules</Title>
          <Paper withBorder>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th fw={600}>Schedule ID</Table.Th>
                  <Table.Th fw={600}>Name</Table.Th>
                  <Table.Th fw={600}>Schedule Details</Table.Th>
                  <Table.Th fw={600}>Buffer Time</Table.Th>
                  <Table.Th fw={600} style={{ width: 200 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tzRows}
                {(!timeZones || timeZones.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed">No schedules found. Create your first schedule above.</Text>
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
