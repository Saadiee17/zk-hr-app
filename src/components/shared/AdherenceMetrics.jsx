'use client'

import { useState } from 'react'
import { Paper, Stack, Title, Text, Grid, Card, RingProgress, Progress, Group, Divider, ActionIcon, Tooltip, Collapse, Box, Center, useMantineTheme } from '@mantine/core'
import { IconInfoCircle, IconClock } from '@tabler/icons-react'
import { formatHoursMinutes } from '@/utils/attendanceUtils'

/**
 * AdherenceMetrics - Reusable metrics visualization component
 * Matches employee view UI style with modern card design
 * @param {object} metrics - Metrics object from calculateAdherenceMetrics
 * @param {boolean} showTitle - Whether to show the title (default: true)
 */
export function AdherenceMetrics({ metrics, showTitle = true }) {
  const [statusBreakdownOpen, setStatusBreakdownOpen] = useState(false)
  const theme = useMantineTheme()

  if (!metrics || metrics.totalDays === 0) {
    return null
  }

  return (
    <Box mt="xl">
      <Stack gap="xl">
        {showTitle && (
          <div>
            <Title order={3} fw={700} mb={4} style={{ letterSpacing: '-0.5px' }}>Attendance Adherence</Title>
            <Text size="sm" c="dimmed">Detailed performance overview for the selected period</Text>
          </div>
        )}

        <Grid gutter="xl">
          {/* On-Time Rate Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card
              shadow="sm"
              padding="xl"
              radius="24px"
              style={{
                height: '100%',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: theme.colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                border: theme.colorScheme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md" align="center" justify="center" style={{ flex: 1 }}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" ta="center" style={{ letterSpacing: '1px' }}>
                  On-Time Rate
                </Text>
                <RingProgress
                  size={150}
                  thickness={12}
                  roundCaps
                  sections={[
                    {
                      value: metrics.adherence,
                      color: metrics.adherence >= 80 ? 'teal.5' : metrics.adherence >= 60 ? 'yellow.5' : 'red.5'
                    },
                  ]}
                  label={
                    <Center>
                      <Text ta="center" fw={800} size="28px" style={{ lineHeight: 1, letterSpacing: '-1px' }}>
                        {metrics.adherence}%
                      </Text>
                    </Center>
                  }
                />
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <Text size="sm" fw={700} color="teal.7">
                    {metrics.onTime} / {metrics.totalDays} Days
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Status Breakdown Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
            <Card
              shadow="sm"
              padding="xl"
              radius="24px"
              style={{
                height: '100%',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: theme.colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
                border: theme.colorScheme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="sm" fw={700} mb="xs">Status Breakdown</Text>
                    <Text size="xs" c="dimmed">Attendance distribution</Text>
                  </div>
                  <Tooltip label="View status definitions" withArrow>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      color="gray"
                      onClick={() => setStatusBreakdownOpen(!statusBreakdownOpen)}
                    >
                      <IconInfoCircle size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {statusBreakdownOpen && (
                  <Paper p="sm" radius="md" style={{ backgroundColor: theme.colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                    <Collapse in={statusBreakdownOpen}>
                      <Stack gap={4}>
                        <Text size="xs" fw={700} mb={4}>Status Definitions:</Text>
                        <Text size="xs"><strong>On-Time:</strong> Punched in within grace period</Text>
                        <Text size="xs"><strong>Late-In:</strong> Punched in after grace period</Text>
                        <Text size="xs"><strong>Present:</strong> Worked on unscheduled day</Text>
                        <Text size="xs"><strong>Absent:</strong> No punch, shift scheduled</Text>
                        <Text size="xs"><strong>On Leave:</strong> Approved leave, no punches</Text>
                        <Text size="xs"><strong>Half Day:</strong> Scheduled half-day exception</Text>
                      </Stack>
                    </Collapse>
                  </Paper>
                )}

                <Stack gap="xs">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'On-Time', value: metrics.onTime, color: 'teal', total: metrics.totalDays },
                      { label: 'Late-In', value: metrics.lateIn, color: 'orange', total: metrics.totalDays },
                      { label: 'Present', value: metrics.present, color: 'blue', total: metrics.totalDays },
                      { label: 'Absent', value: metrics.absent, color: 'red', total: metrics.totalDays },
                      metrics.onLeave > 0 && { label: 'On Leave', value: metrics.onLeave, color: 'violet', total: metrics.totalDays },
                      metrics.halfDay > 0 && { label: 'Half Day', value: metrics.halfDay, color: 'yellow', total: metrics.totalDays },
                    ].filter(Boolean).map((item) => (
                      <Group key={item.label} justify="space-between" p="8px 12px" style={{
                        borderRadius: '12px',
                        backgroundColor: theme.colorScheme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                      }}>
                        <Group gap="xs">
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: `var(--mantine-color-${item.color}-6)`
                          }} />
                          <Text size="sm" fw={500}>{item.label}</Text>
                        </Group>
                        <Text size="sm" fw={700}>{item.value}</Text>
                      </Group>
                    ))}
                  </div>
                </Stack>

                <Divider style={{ opacity: 0.5 }} />

                <Group justify="space-between">
                  <Text size="sm" fw={600} c="dimmed">Total Working Days</Text>
                  <Text fw={800} size="lg">{metrics.totalDays}</Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Hours Summary Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card
              shadow="sm"
              padding="xl"
              radius="24px"
              style={{
                height: '100%',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: theme.colorScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
                border: theme.colorScheme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="xl">
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4} style={{ letterSpacing: '1px' }}>
                      Hours Summary
                    </Text>
                    <Text size="32px" fw={800} color="blue.6" style={{ letterSpacing: '-1px' }}>
                      {formatHoursMinutes(metrics.totalHours)}
                    </Text>
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '16px',
                    background: theme.colorScheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconClock size={28} color="var(--mantine-color-blue-6)" />
                  </div>
                </Group>

                <Stack gap="md">
                  <div>
                    <Group justify="space-between" mb={8}>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        Regular Hours
                      </Text>
                      <Text fw={700} size="sm">
                        {formatHoursMinutes(metrics.totalRegularHours)}
                      </Text>
                    </Group>
                    <Progress
                      value={metrics.requiredHours > 0 ? (metrics.totalRegularHours / metrics.requiredHours) * 100 : 0}
                      color="blue.5"
                      size="xl"
                      radius="xl"
                      animated
                    />
                  </div>

                  <div>
                    <Group justify="space-between" mb={8}>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        Overtime
                      </Text>
                      <Text fw={700} size="sm" color="orange.6">
                        {formatHoursMinutes(metrics.totalOvertimeHours)}
                      </Text>
                    </Group>
                    <Progress
                      value={metrics.requiredHours > 0 ? (metrics.totalOvertimeHours / metrics.requiredHours) * 100 : 0}
                      color="orange.5"
                      size="xl"
                      radius="xl"
                      animated
                    />
                  </div>
                </Stack>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  )
}
