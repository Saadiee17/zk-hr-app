'use client'

import { Card, Text, Stack, Group, Divider, ThemeIcon, Progress } from '@mantine/core'
import { IconCalendarStats, IconClockHour4 } from '@tabler/icons-react'

/**
 * LeaveBalanceCard - Reusable card component for displaying leave balance information
 * @param {Object} balance - Leave balance object with leave_type, total_allotted, used, pending, remaining
 */
export function LeaveBalanceCard({ balance }) {
  if (!balance) return null

  const total = balance.total_allotted || 0
  const used = balance.used || 0
  const remaining = balance.remaining || 0
  const pending = balance.pending || 0

  // Calculate percentage for progress bar
  const usedPercentage = total > 0 ? (used / total) * 100 : 0

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="lg"
      withBorder
      style={{
        height: '100%',
        transition: 'all 0.3s ease',
        borderLeft: '4px solid var(--mantine-color-blue-6)',
        background: 'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-white) 100%)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 99, 235, 0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
              Leave Type
            </Text>
            <Text size="lg" fw={700} c="blue">
              {balance.leave_type?.name || 'Unknown'}
            </Text>
          </div>
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconCalendarStats size={20} />
          </ThemeIcon>
        </Group>

        <Divider />

        <Group justify="space-between" align="flex-end">
          <div>
            <Text size="xs" c="dimmed" fw={500} mb={2}>Remaining</Text>
            <Text size="xl" fw={800} c="blue" lh={1}>
              {remaining} <Text span size="sm" c="dimmed" fw={500}>days</Text>
            </Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text size="xs" c="dimmed" fw={500} mb={2}>Used</Text>
            <Text size="md" fw={600} c="dimmed" lh={1}>
              {used} / {total}
            </Text>
          </div>
        </Group>

        <Stack gap={4}>
          <Progress
            value={usedPercentage}
            size="sm"
            radius="xl"
            color={usedPercentage > 80 ? 'red' : 'blue'}
          />
          {pending > 0 && (
            <Group gap={4} align="center">
              <IconClockHour4 size={12} color="var(--mantine-color-yellow-6)" />
              <Text size="xs" c="yellow.7" fw={500}>
                {pending} days pending approval
              </Text>
            </Group>
          )}
        </Stack>
      </Stack>
    </Card>
  )
}




