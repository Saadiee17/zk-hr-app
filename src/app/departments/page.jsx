'use client'

import { useEffect, useState } from 'react'
import { Container, Title, Paper, Text, TextInput, NumberInput, Button, Group, Table, Modal, ActionIcon, Stack, Select, Grid, ThemeIcon, Badge, Tooltip, Box, Divider } from '@mantine/core'
import { IconPencil, IconTrash, IconBuilding, IconList, IconCalendar, IconPlus, IconSearch } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'

export default function DepartmentsPage() {
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

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hr/departments', { method: 'GET' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch departments')
      setDepartments(json.data || [])
    } catch (error) {
      showError(error.message || 'Could not load departments', 'Load failed')
    } finally {
      setLoading(false)
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
    fetchDepartments()
    fetchTimeZones()
  }, [])

  const tzOptions = timeZones.map((t) => ({ value: String(t.id), label: `${t.id} - ${t.name}` }))

  const resetCreateForm = () => {
    setCreateName('')
    setCreateCode('')
  }

  const handleCreate = async (e) => {
    e?.preventDefault?.()
    try {
      setCreating(true)
      const codeInt = createCode === '' ? null : Number(createCode)
      if (!createName?.trim() || codeInt === null || Number.isNaN(codeInt)) {
        throw new Error('Name and numeric Department Code are required')
      }

      const res = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), department_code: codeInt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create department')
      showSuccess(`${createName.trim()} was added`, 'Department created')
      resetCreateForm()
      await fetchDepartments()
    } catch (error) {
      showError(error.message || 'Could not create department', 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (dept) => {
    setEditId(dept.id)
    setEditName(dept.name || '')
    setEditCode(String(dept.department_code ?? ''))
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true)
      const codeInt = editCode === '' ? null : Number(editCode)
      if (!editId || !editName?.trim() || codeInt === null || Number.isNaN(codeInt)) {
        throw new Error('Name and numeric Department Code are required')
      }

      const res = await fetch(`/api/hr/departments/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), department_code: codeInt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update department')
      showSuccess(`${editName.trim()} was saved`, 'Department updated')
      setEditOpen(false)
      await fetchDepartments()
    } catch (error) {
      showError(error.message || 'Could not update department', 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (dept) => {
    try {
      const res = await fetch(`/api/hr/departments/${dept.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to delete department')
      showSuccess(`${dept.name} was removed`, 'Department deleted')
      await fetchDepartments()
    } catch (error) {
      showError(error.message || 'Could not delete department', 'Delete failed')
    }
  }

  const rows = departments.map((d) => {
    const rawSched = d.schedules || d.schedule
    const sched = Array.isArray(rawSched) ? rawSched[0] : (rawSched || null)

    // Extract names from joined TZ data
    const tzs = [
      { id: sched?.tz_id_1, name: sched?.tz1?.name },
      { id: sched?.tz_id_2, name: sched?.tz2?.name },
      { id: sched?.tz_id_3, name: sched?.tz3?.name },
    ].filter(v => v.id !== null && v.id !== undefined)

    return (
      <Table.Tr key={d.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
        <Table.Td>
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" radius="md" size="md">
              <IconBuilding size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm" style={{ color: 'var(--mantine-color-blue-9)' }}>{d.name}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge variant="outline" color="gray" radius="sm" size="sm" fw={800} ls={0.5}>
            #{d.department_code}
          </Badge>
        </Table.Td>
        <Table.Td>
          {tzs.length > 0 ? (
            <Group gap={4} wrap="nowrap">
              {tzs.map((tz, idx) => (
                <Tooltip key={idx} label={`Slot ID: ${tz.id}`} position="top" withArrow>
                  <Badge variant="light" color="blue" size="sm" radius="sm" fw={800} py="xs" px="md">
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
            <Tooltip label="Edit Details" position="top" withArrow transitionProps={{ transition: 'pop' }}>
              <ActionIcon variant="subtle" color="blue" radius="lg" size="lg" onClick={() => openEdit(d)}>
                <IconPencil size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Schedule Configuration" position="top" withArrow transitionProps={{ transition: 'pop' }}>
              <ActionIcon
                variant="subtle"
                color="teal"
                radius="lg"
                size="lg"
                onClick={async () => {
                  try {
                    setScheduleDept(d)
                    const res = await fetch(`/api/hr/schedules/${d.id}`)
                    const json = await res.json()
                    if (res.ok && json?.data) {
                      setScheduleVals({
                        tz_id_1: json.data.tz_id_1 || null,
                        tz_id_2: json.data.tz_id_2 || null,
                        tz_id_3: json.data.tz_id_3 || null,
                      })
                    } else {
                      setScheduleVals({ tz_id_1: null, tz_id_2: null, tz_id_3: null })
                    }
                    setScheduleOpen(true)
                  } catch {
                    setScheduleVals({ tz_id_1: null, tz_id_2: null, tz_id_3: null })
                    setScheduleOpen(true)
                  }
                }}
              >
                <IconCalendar size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Delete Department" position="top" withArrow transitionProps={{ transition: 'pop' }}>
              <ActionIcon variant="subtle" color="red" radius="lg" size="lg" onClick={() => handleDelete(d)}>
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
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={1} fw={900} style={{ letterSpacing: '-1.5px', fontSize: '38px', color: 'var(--mantine-color-blue-9)' }}>
              Departments
            </Title>
            <Text c="dimmed" size="md" fw={500} mt={4} style={{ maxWidth: 500 }}>
              Structure your organization and define shift patterns for your workforce.
            </Text>
          </Box>
          <Button
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
            radius="xl"
            size="md"
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              const nameEl = document.getElementById('dept-name-input');
              if (nameEl) nameEl.focus();
            }}
          >
            Add Department
          </Button>
        </Group>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="xl" radius="24px" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>Total Active Units</Text>
                  <Title order={2} fw={900}>{departments.length}</Title>
                </div>
                <ThemeIcon size={52} radius="xl" variant="light" color="blue">
                  <IconList size={28} />
                </ThemeIcon>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="xl" radius="24px" withBorder style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={800} ls={1}>System Health</Text>
                  <Title order={2} fw={900} c="teal">Operational</Title>
                </div>
                <ThemeIcon size={52} radius="xl" variant="light" color="teal">
                  <Box style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'var(--mantine-color-teal-filled)', boxShadow: '0 0 10px var(--mantine-color-teal-filled)' }} />
                </ThemeIcon>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>

        <Paper
          radius="32px"
          p="32px"
          withBorder
          style={{
            border: '1px solid rgba(0,0,0,0.06)',
            backgroundColor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)'
          }}
        >
          <Stack gap="xl">
            <Box>
              <Text fw={800} size="xs" tt="uppercase" c="dimmed" ls={1.5} mb="md">Initialize New Department</Text>
              <form onSubmit={handleCreate}>
                <Grid gutter="md" align="flex-end">
                  <Grid.Col span={{ base: 12, md: 5 }}>
                    <TextInput
                      id="dept-name-input"
                      placeholder="e.g. Executive Management"
                      value={createName}
                      onChange={(e) => setCreateName(e.currentTarget.value)}
                      required
                      radius="md"
                      size="md"
                      styles={{ input: { backgroundColor: 'rgba(0,0,0,0.02)' } }}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <NumberInput
                      placeholder="Dept Code (e.g. 200)"
                      value={createCode}
                      onChange={(val) => setCreateCode(val === null ? '' : String(val))}
                      min={0}
                      required
                      radius="md"
                      size="md"
                      styles={{ input: { backgroundColor: 'rgba(0,0,0,0.02)' } }}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Group grow>
                      <Button
                        type="submit"
                        loading={creating}
                        disabled={creating}
                        size="md"
                        radius="md"
                        fullWidth
                        variant="light"
                        color="blue"
                      >
                        Register Unit
                      </Button>
                      <Button
                        variant="subtle"
                        color="gray"
                        radius="md"
                        size="md"
                        onClick={fetchDepartments}
                        loading={loading}
                      >
                        Refresh Registry
                      </Button>
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
                    <Table.Th>
                      <Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Department Identity</Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Unit Code</Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Active Shifts (TZ)</Text>
                    </Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={800} tt="uppercase" c="dimmed" ls={1.2}>Control Operations</Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows}
                  {(!departments || departments.length === 0) && (
                    <Table.Tr>
                      <Table.Td colSpan={3} ta="center" py="xl">
                        <Text c="dimmed" fs="italic">{loading ? 'Synchronizing units...' : 'Registry is empty'}</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          </Stack>
        </Paper>

        <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Edit Department">
          <Stack>
            <TextInput
              label="Department Name"
              value={editName}
              onChange={(e) => setEditName(e.currentTarget.value)}
              required
            />
            <NumberInput
              label="Department Code"
              value={editCode}
              onChange={(val) => setEditCode(val === null ? '' : String(val))}
              min={0}
              required
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={savingEdit} disabled={savingEdit}>Save</Button>
            </Group>
          </Stack>
        </Modal>

        <Modal opened={scheduleOpen} onClose={() => setScheduleOpen(false)} title={`Assign Schedule${scheduleDept ? `: ${scheduleDept.name}` : ''}`}>
          <Stack>
            <Select
              label="TZ #1"
              placeholder="Select TZ"
              data={tzOptions}
              value={scheduleVals.tz_id_1 ? String(scheduleVals.tz_id_1) : null}
              onChange={(v) => setScheduleVals((s) => ({ ...s, tz_id_1: v ? Number(v) : null }))}
              searchable
              clearable
            />
            <Select
              label="TZ #2"
              placeholder="Select TZ"
              data={tzOptions}
              value={scheduleVals.tz_id_2 ? String(scheduleVals.tz_id_2) : null}
              onChange={(v) => setScheduleVals((s) => ({ ...s, tz_id_2: v ? Number(v) : null }))}
              searchable
              clearable
            />
            <Select
              label="TZ #3"
              placeholder="Select TZ"
              data={tzOptions}
              value={scheduleVals.tz_id_3 ? String(scheduleVals.tz_id_3) : null}
              onChange={(v) => setScheduleVals((s) => ({ ...s, tz_id_3: v ? Number(v) : null }))}
              searchable
              clearable
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              <Button loading={scheduleSaving} disabled={scheduleSaving} onClick={async () => {
                try {
                  setScheduleSaving(true)
                  if (!scheduleDept?.id) throw new Error('Missing department id')
                  const res = await fetch(`/api/hr/schedules/${scheduleDept.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scheduleVals),
                  })
                  const json = await res.json()
                  if (!res.ok) throw new Error(json.error || 'Failed to assign schedule')
                  showSuccess('Department schedule updated', 'Schedule assigned')
                  setScheduleOpen(false)
                  await fetchDepartments()
                } catch (error) {
                  showError(error.message || 'Could not assign schedule', 'Schedule failed')
                } finally {
                  setScheduleSaving(false)
                }
              }}>Save</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}






