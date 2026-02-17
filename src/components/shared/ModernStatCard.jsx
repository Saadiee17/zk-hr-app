'use client'

import { Paper, Text, Group, Badge } from '@mantine/core'
import { memo } from 'react'

export const ModernStatCard = memo(({
    title,
    value,
    badgeLabel,
    badgeColor,
    color = 'blue',
    borderPosition = 'right',
    children
}) => {
    return (
        <Paper
            p="lg"
            radius="md"
            withBorder
            shadow="sm"
            style={{
                borderLeft: borderPosition === 'left' ? `4px solid var(--mantine-color-${color}-5)` : undefined,
                borderRight: borderPosition === 'right' ? `4px solid var(--mantine-color-${color}-5)` : undefined,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transform: 'translateZ(0)'
            }}
        >
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={0.5}>{title}</Text>

            {children ? (
                <div style={{ marginTop: 'var(--mantine-spacing-md)', flex: 1 }}>
                    {children}
                </div>
            ) : (
                <Group justify="space-between" align="flex-end" mt="md">
                    <Text size="xl" fw={700} style={{ fontSize: '2rem', lineHeight: 1 }}>{value}</Text>
                    {badgeLabel && (
                        <Badge variant="light" color={badgeColor || color} radius="sm" size="lg">
                            {badgeLabel}
                        </Badge>
                    )}
                </Group>
            )}
        </Paper>
    )
})

ModernStatCard.displayName = 'ModernStatCard'
