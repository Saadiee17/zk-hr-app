'use client'

import { Card, Text, Stack, Group } from '@mantine/core'

/**
 * LeaveBalanceCard - Reusable card component for displaying leave balance information
 * @param {Object} balance - Leave balance object with leave_type, total_allotted, used, pending, remaining
 */
export function LeaveBalanceCard({ balance }) {
  if (!balance) return null

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg" fw={600} mb="md">
        {balance.leave_type?.name || 'Unknown Leave Type'}
      </Text>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total Allotted
          </Text>
          <Text size="sm" fw={500}>
            {balance.total_allotted || 0} days
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Used
          </Text>
          <Text size="sm" fw={500} c="red">
            {balance.used || 0} days
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Pending
          </Text>
          <Text size="sm" fw={500} c="yellow">
            {balance.pending || 0} days
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Remaining
          </Text>
          <Text size="lg" fw={700} c="green">
            {balance.remaining || 0} days
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}



