'use client'

import {
    Card,
    Group,
    Text,
    Badge,
    Stack,
    Divider,
    ActionIcon,
    Collapse,
    Table,
    ThemeIcon,
    Progress,
    Avatar,
    Box,
    Tooltip,
    useMantineTheme,
    Button
} from '@mantine/core'
import {
    IconChevronUp,
    IconChevronDown,
    IconUserCheck,
    IconUserX,
    IconClock,
    IconAlertCircle,
    IconBriefcase,
    IconArrowRight
} from '@tabler/icons-react'
import Link from 'next/link'
import { formatUTC12HourTime } from '@/utils/dateFormatting'

export function DepartmentStatusCard({ dept, isExpanded, onToggle }) {
    const theme = useMantineTheme()
    const { present, late, absent, total } = dept.summary
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

    // Custom status color logic to match the app's theme but more "premium"
    const getStatusInfo = (status) => {
        switch (status) {
            case 'On-Time':
                return { color: 'teal', icon: <IconUserCheck size={14} />, label: 'Active: On-Time' }
            case 'Present':
                return { color: 'teal', icon: <IconUserCheck size={14} />, label: 'Active: Present' }
            case 'Worked on Day Off':
                return { color: 'indigo', icon: <IconBriefcase size={14} />, label: 'Day Off Work' }
            case 'Out of Schedule':
                return { color: 'violet', icon: <IconAlertCircle size={14} />, label: 'Out of Schedule' }
            case 'Late-In':
                return { color: 'orange', icon: <IconAlertCircle size={14} />, label: 'Active: Late' }
            case 'Punch Out Missing':
                return { color: 'yellow', icon: <IconClock size={14} />, label: 'Missing Out' }
            case 'Absent':
                return { color: 'red', icon: <IconUserX size={14} />, label: 'Not Present' }
            case 'Shift Not Started':
                return { color: 'blue', icon: <IconBriefcase size={14} />, label: 'Pending' }
            default:
                return { color: 'gray', icon: null, label: status }
        }
    }

    return (
        <Card
            withBorder
            radius="lg"
            p={0}
            mb="md"
            style={{
                transition: 'all 0.3s ease',
                border: isExpanded ? `1px solid ${theme.colors.blue[3]}` : '1px solid #f1f3f5',
                boxShadow: isExpanded ? '0 12px 30px rgba(0,0,0,0.08)' : '0 4px 6px rgba(0,0,0,0.02)',
                overflow: 'hidden'
            }}
        >
            {/* Header section */}
            <Box
                px="xl"
                py="lg"
                onClick={onToggle}
                style={{
                    cursor: 'pointer',
                    background: isExpanded ? theme.colors.blue[0] : 'white',
                    transition: 'background 0.2s ease'
                }}
            >
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        {/* Minimal Department Indicator */}
                        <ThemeIcon
                            size={34}
                            radius="md"
                            variant="light"
                            color={attendanceRate > 80 ? 'teal' : attendanceRate > 50 ? 'orange' : 'red'}
                            style={{ background: 'transparent', border: `1.5px solid ${theme.colors[attendanceRate > 80 ? 'teal' : attendanceRate > 50 ? 'orange' : 'red'][2]}` }}
                        >
                            <IconBriefcase size={18} stroke={2} />
                        </ThemeIcon>

                        <div>
                            <Text fw={800} size="md" style={{ letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                                {dept.department}
                            </Text>
                            <Group gap={6} mt={2}>
                                <Text size="11px" fw={700} c="dimmed" tt="uppercase">
                                    {total} Personnel
                                </Text>
                                <Box style={{ width: 4, height: 4, borderRadius: '50%', background: theme.colors.gray[3] }} />
                                <Text size="11px" fw={700} c="teal">
                                    {present} Online
                                </Text>
                            </Group>
                        </div>
                    </Group>

                    {/* Quick Stats Grid - Visible when collapsed */}
                    {!isExpanded && (
                        <Group gap="lg" visibleFrom="md" align="center">
                            <Group gap={8} align="center">
                                <Progress value={attendanceRate} size="xs" w={40} color={attendanceRate > 80 ? 'teal' : 'orange'} radius="xl" />
                                <Text fw={800} size="xs" c="dimmed" style={{ lineHeight: 1 }}>{attendanceRate}%</Text>
                            </Group>

                            <Group gap={6}>
                                {late > 0 && (
                                    <Badge color="orange" variant="dot" size="xs" fw={700}>
                                        {late} Late
                                    </Badge>
                                )}
                                {absent > 0 && (
                                    <Badge color="red" variant="dot" size="xs" fw={700}>
                                        {absent} Absent
                                    </Badge>
                                )}
                            </Group>
                        </Group>
                    )}

                    <ActionIcon
                        variant="transparent"
                        color="gray"
                        size="md"
                        style={{ transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
                    >
                        <IconChevronUp size={20} />
                    </ActionIcon>
                </Group>
            </Box>

            {/* Expanded Table Section */}
            <Collapse in={isExpanded}>
                <Box p="xl" style={{ background: 'white' }}>
                    <Divider mb="xl" label={<Text size="xs" fw={700} c="dimmed">DEPARTMENT ROSTER</Text>} labelPosition="left" />

                    <Table verticalSpacing="md" highlightOnHover style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ border: 'none', color: theme.colors.gray[6], fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Employee Info</Table.Th>
                                <Table.Th style={{ border: 'none', color: theme.colors.gray[6], fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Expected Shift</Table.Th>
                                <Table.Th style={{ border: 'none', color: theme.colors.gray[6], fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Status Badge</Table.Th>
                                <Table.Th style={{ border: 'none', color: theme.colors.gray[6], fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }}>Time Log</Table.Th>
                                <Table.Th style={{ border: 'none' }}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {dept.employees.map((emp) => {
                                const statusInfo = getStatusInfo(emp.status)
                                const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

                                return (
                                    <Table.Tr
                                        key={emp.id}
                                        style={{
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Table.Td style={{ border: 'none' }}>
                                            <Group gap="sm" wrap="nowrap">
                                                <Avatar
                                                    radius="md"
                                                    size="sm"
                                                    color={statusInfo.color}
                                                    variant="light"
                                                    fw={700}
                                                >
                                                    {initials}
                                                </Avatar>
                                                <div>
                                                    <Text fw={700} size="sm" style={{ lineHeight: 1.2 }}>{emp.name}</Text>
                                                    <Text size="10px" c="dimmed" fw={600} tt="uppercase">ID: {emp.employeeId}</Text>
                                                </div>
                                            </Group>
                                        </Table.Td>

                                        <Table.Td style={{ border: 'none' }}>
                                            <Text size="xs" fw={600} c="dimmed" style={{ maxWidth: '140px' }} truncate>{emp.schedule}</Text>
                                        </Table.Td>

                                        <Table.Td style={{ border: 'none' }}>
                                            <Badge
                                                color={statusInfo.color}
                                                variant="light"
                                                size="sm"
                                                radius="sm"
                                                styles={{
                                                    root: {
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        height: '24px'
                                                    }
                                                }}
                                            >
                                                {statusInfo.label}
                                            </Badge>
                                        </Table.Td>

                                        <Table.Td style={{ border: 'none' }}>
                                            {emp.inTime ? (
                                                <Group gap={4}>
                                                    <Text size="xs" fw={800} ff="monospace" c={statusInfo.color === 'red' || statusInfo.color === 'orange' ? statusInfo.color : 'dark'}>
                                                        {formatUTC12HourTime(emp.inTime)}
                                                    </Text>
                                                    <Text size="10px" fw={700} c="dimmed" tt="uppercase">In</Text>
                                                </Group>
                                            ) : (
                                                <Text size="xs" c="dimmed" fw={600} italic>—</Text>
                                            )}
                                        </Table.Td>

                                        <Table.Td style={{ border: 'none', textAlign: 'right' }}>
                                            <Button
                                                component={Link}
                                                href={`/employees/${emp.id}`}
                                                variant="subtle"
                                                size="compact-xs"
                                                color="gray"
                                                fw={700}
                                                style={{ fontSize: '11px' }}
                                            >
                                                View
                                            </Button>
                                        </Table.Td>
                                    </Table.Tr>
                                )
                            })}
                        </Table.Tbody>
                    </Table>
                </Box>
            </Collapse>
        </Card>
    )
}

export function DepartmentStatusGrid({ departmentData, expandedDepartments, setExpandedDepartments }) {
    if (!departmentData || departmentData.length === 0) return null

    return (
        <Stack gap="sm">
            {departmentData.map((dept) => (
                <DepartmentStatusCard
                    key={dept.department}
                    dept={dept}
                    isExpanded={expandedDepartments[dept.department]}
                    onToggle={() => {
                        setExpandedDepartments(prev => ({
                            ...prev,
                            [dept.department]: !prev[dept.department]
                        }))
                    }}
                />
            ))}
        </Stack>
    )
}
