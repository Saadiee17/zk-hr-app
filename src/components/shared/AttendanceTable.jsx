'use client'

import { useState, useMemo, Fragment } from 'react'
import { Paper, Table, Text, LoadingOverlay, Group, ActionIcon, Badge, Stack, Divider, Grid } from '@mantine/core'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { formatUTC12Hour, formatUTC12HourTime } from '@/utils/dateFormatting'
import { formatHoursMinutes, formatDateWithDay } from '@/utils/attendanceUtils'
import { StatusBadge } from './StatusBadge'

/**
 * AttendanceTable - Universal table component for displaying attendance data
 * @param {Array} data - Array of attendance report rows
 * @param {boolean} loading - Loading state
 * @param {Array} filteredData - Pre-filtered data (optional, if not provided, uses data)
 * @param {boolean} showExpandableRows - Whether to show expandable detail rows (default: true)
 */
export function AttendanceTable({ data = [], loading = false, filteredData = null, showExpandableRows = true }) {
  const [expandedRows, setExpandedRows] = useState(new Set())

  const displayData = filteredData !== null ? filteredData : data

  const toggleRow = (dateStr) => {
    if (!showExpandableRows) return
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(dateStr)) {
      newExpanded.delete(dateStr)
    } else {
      newExpanded.add(dateStr)
    }
    setExpandedRows(newExpanded)
  }

  const rows = displayData.map((r, idx) => {
    const isExpanded = expandedRows.has(r.date)
    const dateInfo = formatDateWithDay(r.date)
    const isWeekend = dateInfo.dayName === 'Saturday' || dateInfo.dayName === 'Sunday'
    const uniqueKey = `${r.date}-${idx}`

    return (
      <Fragment key={uniqueKey}>
        <Table.Tr
          style={{ cursor: showExpandableRows ? 'pointer' : 'default' }}
          onClick={() => toggleRow(r.date)}
        >
          <Table.Td>
            <Group gap="xs">
              {showExpandableRows && (
                <ActionIcon variant="subtle" size="sm">
                  {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </ActionIcon>
              )}
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
            <StatusBadge status={r.status} />
          </Table.Td>
        </Table.Tr>
        {isExpanded && showExpandableRows && (
          <Table.Tr key={`${uniqueKey}-expanded`}>
            <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={600}>Full Details</Text>
                    <StatusBadge status={r.status} />
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
    <Paper
      shadow="xs"
      radius="lg"
      pos="relative"
      mt="md"
      style={{
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)',
        backgroundColor: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
      <Table
        verticalSpacing="md"
        horizontalSpacing="lg"
        highlightOnHover
      >
        <Table.Thead>
          <Table.Tr style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Date</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>In Time</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Out Time</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Regular</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Overtime</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Total</Table.Th>
            <Table.Th style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', color: 'var(--mantine-color-dimmed)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        {filteredData !== null && filteredData.length === 0 && data.length > 0 && (
          <Table.Caption>
            <Text c="dimmed" size="sm">
              No records match the selected filter. Showing {data.length} total record{data.length !== 1 ? 's' : ''}.
            </Text>
          </Table.Caption>
        )}
        <Table.Tbody>
          {rows}
          {(!data || data.length === 0) && (
            <Table.Tr>
              <Table.Td colSpan={7} ta="center" py="xl"><Text c="dimmed" fs="italic">No attendance records found for this period.</Text></Table.Td>
            </Table.Tr>
          )}
          {data.length > 0 && displayData.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7} ta="center" py="xl"><Text c="dimmed" fs="italic">No records match the selected status filter.</Text></Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Paper>
  )
}




