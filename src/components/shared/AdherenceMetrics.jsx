'use client'

import { useState } from 'react'
import { Paper, Stack, Title, Text, Grid, Card, RingProgress, Progress, Group, Divider, ActionIcon, Tooltip, Collapse } from '@mantine/core'
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

  if (!metrics || metrics.totalDays === 0) {
    return null
  }

  return (
    <Paper withBorder p="md" mt="md" radius="md">
      <Stack gap="md">
        {showTitle && (
          <div>
            <Title order={4} mb={4}>Attendance Adherence</Title>
            <Text size="sm" c="dimmed">Performance overview for the selected period</Text>
          </div>
        )}
        
        <Grid gutter="md">
          {/* On-Time Rate Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card 
              shadow="sm" 
              padding="xl" 
              radius="lg" 
              withBorder
              style={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid var(--mantine-color-teal-6)',
                background: 'linear-gradient(135deg, var(--mantine-color-teal-0) 0%, var(--mantine-color-white) 100%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(20, 184, 166, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md" align="center" justify="center" style={{ flex: 1, minHeight: 0 }}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" ta="center" style={{ letterSpacing: '0.5px' }}>
                  On-Time Rate
                </Text>
                <RingProgress
                  size={140}
                  thickness={14}
                  sections={[
                    { 
                      value: metrics.adherence, 
                      color: metrics.adherence >= 80 ? 'teal' : metrics.adherence >= 60 ? 'yellow' : 'red' 
                    },
                  ]}
                  label={
                    <div style={{ textAlign: 'center' }}>
                      <Text ta="center" fw={700} size="xl" style={{ lineHeight: 1.2 }}>
                        {metrics.adherence}%
                      </Text>
                    </div>
                  }
                />
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <Text size="sm" fw={600} mb={2}>
                    {metrics.onTime} / {metrics.totalDays}
                  </Text>
                  <Text size="xs" c="dimmed">
                    days on-time
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
                    <Text size="sm" fw={600} mb="xs">Status Breakdown</Text>
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
                  <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
                    <Collapse in={statusBreakdownOpen}>
                      <Stack gap={4}>
                        <Text size="xs" fw={600} mb={4}>Status Definitions:</Text>
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
                  <Group justify="space-between" p="xs" style={{ 
                    borderRadius: '6px',
                    backgroundColor: 'var(--mantine-color-gray-0)'
                  }}>
                    <Group gap="xs">
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-teal-6)'
                      }} />
                      <Text size="sm">On-Time</Text>
                    </Group>
                    <Group gap="md">
                      <Text size="sm" fw={600}>{metrics.onTime}</Text>
                      <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                        {metrics.totalDays > 0 ? Math.round((metrics.onTime / metrics.totalDays) * 100) : 0}%
                      </Text>
                    </Group>
                  </Group>
                  
                  <Group justify="space-between" p="xs" style={{ 
                    borderRadius: '6px',
                    backgroundColor: 'var(--mantine-color-gray-0)'
                  }}>
                    <Group gap="xs">
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-orange-6)'
                      }} />
                      <Text size="sm">Late-In</Text>
                    </Group>
                    <Group gap="md">
                      <Text size="sm" fw={600}>{metrics.lateIn}</Text>
                      <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                        {metrics.totalDays > 0 ? Math.round((metrics.lateIn / metrics.totalDays) * 100) : 0}%
                      </Text>
                    </Group>
                  </Group>
                  
                  <Group justify="space-between" p="xs" style={{ 
                    borderRadius: '6px',
                    backgroundColor: 'var(--mantine-color-gray-0)'
                  }}>
                    <Group gap="xs">
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-blue-6)'
                      }} />
                      <Text size="sm">Present</Text>
                    </Group>
                    <Group gap="md">
                      <Text size="sm" fw={600}>{metrics.present}</Text>
                      <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                        {metrics.totalDays > 0 ? Math.round((metrics.present / metrics.totalDays) * 100) : 0}%
                      </Text>
                    </Group>
                  </Group>
                  
                  <Group justify="space-between" p="xs" style={{ 
                    borderRadius: '6px',
                    backgroundColor: 'var(--mantine-color-gray-0)'
                  }}>
                    <Group gap="xs">
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-red-6)'
                      }} />
                      <Text size="sm">Absent</Text>
                    </Group>
                    <Group gap="md">
                      <Text size="sm" fw={600}>{metrics.absent}</Text>
                      <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                        {metrics.totalDays > 0 ? Math.round((metrics.absent / metrics.totalDays) * 100) : 0}%
                      </Text>
                    </Group>
                  </Group>
                  
                  {metrics.onLeave > 0 && (
                    <Group justify="space-between" p="xs" style={{ 
                      borderRadius: '6px',
                      backgroundColor: 'var(--mantine-color-gray-0)'
                    }}>
                      <Group gap="xs">
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%',
                          backgroundColor: 'var(--mantine-color-violet-6)'
                        }} />
                        <Text size="sm">On Leave</Text>
                      </Group>
                      <Group gap="md">
                        <Text size="sm" fw={600}>{metrics.onLeave || 0}</Text>
                        <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                          {metrics.totalDays > 0 ? Math.round((metrics.onLeave / metrics.totalDays) * 100) : 0}%
                        </Text>
                      </Group>
                    </Group>
                  )}
                  
                  {metrics.halfDay > 0 && (
                    <Group justify="space-between" p="xs" style={{ 
                      borderRadius: '6px',
                      backgroundColor: 'var(--mantine-color-gray-0)'
                    }}>
                      <Group gap="xs">
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%',
                          backgroundColor: 'var(--mantine-color-yellow-6)'
                        }} />
                        <Text size="sm">Half Day</Text>
                      </Group>
                      <Group gap="md">
                        <Text size="sm" fw={600}>{metrics.halfDay || 0}</Text>
                        <Text size="xs" c="dimmed" style={{ minWidth: '35px' }}>
                          {metrics.totalDays > 0 ? Math.round((metrics.halfDay / metrics.totalDays) * 100) : 0}%
                        </Text>
                      </Group>
                    </Group>
                  )}
                </Stack>
                
                <Divider />
                
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Total Working Days</Text>
                  <Text fw={700} size="md">{metrics.totalDays}</Text>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
          
          {/* Hours Summary Card */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card 
              shadow="sm" 
              padding="xl" 
              radius="lg" 
              withBorder
              style={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: '4px solid var(--mantine-color-green-6)',
                background: 'linear-gradient(135deg, var(--mantine-color-green-0) 0%, var(--mantine-color-white) 100%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(34, 197, 94, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div style={{ flex: 1 }}>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>
                      Hours Summary
                    </Text>
                    <Text size={32} fw={700} c="green" lh={1.2}>
                      {formatHoursMinutes(metrics.totalHours)}
                    </Text>
                  </div>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--mantine-color-green-1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconClock size={24} color="var(--mantine-color-green-6)" />
                  </div>
                </Group>
                
                <Divider />
                
                <Stack gap="sm">
                  <div>
                    <Group justify="space-between" mb={8}>
                      <Text size="sm" c="dimmed" fw={500}>
                        Regular Hours
                      </Text>
                      <Text fw={600} size="sm">
                        {formatHoursMinutes(metrics.totalRegularHours)} / {formatHoursMinutes(metrics.requiredHours || 0)}
                      </Text>
                    </Group>
                    <Progress
                      value={metrics.requiredHours > 0 ? (metrics.totalRegularHours / metrics.requiredHours) * 100 : 0}
                      color="blue"
                      size="lg"
                      radius="xl"
                      animated
                    />
                  </div>
                  
                  <div>
                    <Group justify="space-between" mb={8}>
                      <Text size="sm" c="dimmed" fw={500}>
                        Overtime Hours
                      </Text>
                      <Text fw={600} size="sm">
                        {formatHoursMinutes(metrics.totalOvertimeHours)} / {formatHoursMinutes(metrics.requiredHours || 0)}
                      </Text>
                    </Group>
                    <Progress
                      value={metrics.requiredHours > 0 ? (metrics.totalOvertimeHours / metrics.requiredHours) * 100 : 0}
                      color="orange"
                      size="lg"
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
    </Paper>
  )
}

