'use client'

import { useEffect, useState } from 'react'
import { Container, Title, Paper, Text, TextInput, NumberInput, Button, Group, Table, Modal, ActionIcon, Stack, Select } from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
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

  const rows = departments.map((d) => (
    <Table.Tr key={d.id}>
      <Table.Td>{d.name}</Table.Td>
      <Table.Td>{d.department_code}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="light" color="blue" onClick={() => openEdit(d)} aria-label="Edit">
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon variant="light" color="red" onClick={() => handleDelete(d)} aria-label="Delete">
            <IconTrash size={18} />
          </ActionIcon>
          <Button size="xs" variant="light" onClick={async () => {
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
          }}>Assign Schedule</Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Department Management</Title>

      <Paper withBorder shadow="sm" p="md">
        <Stack gap="md">
          <form onSubmit={handleCreate}>
            <Group align="end" wrap="wrap" gap="md">
              <TextInput
                label="Department Name"
                placeholder="e.g. Human Resources"
                value={createName}
                onChange={(e) => setCreateName(e.currentTarget.value)}
                required
                style={{ minWidth: 260 }}
              />
              <NumberInput
                label="Department Code"
                placeholder="e.g. 1001"
                value={createCode}
                onChange={(val) => setCreateCode(val === null ? '' : String(val))}
                min={0}
                required
                style={{ minWidth: 180 }}
              />
              <Button type="submit" loading={creating} disabled={creating}>
                Create Department
              </Button>
            </Group>
          </form>

          <Paper withBorder>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th fw={600}>Name</Table.Th>
                  <Table.Th fw={600}>Department Code</Table.Th>
                  <Table.Th fw={600} style={{ width: 120 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows}
                {(!departments || departments.length === 0) && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text c="dimmed">{loading ? 'Loading...' : 'No departments found'}</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Stack>

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
                } catch (error) {
                  showError(error.message || 'Could not assign schedule', 'Schedule failed')
                } finally {
                  setScheduleSaving(false)
                }
              }}>Save</Button>
            </Group>
          </Stack>
        </Modal>
      </Paper>
    </Container>
  )
}








