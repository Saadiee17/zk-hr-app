'use client'
import { UnstyledButton, Group, Text, ThemeIcon } from '@mantine/core'
import Link from 'next/link'

export function PremiumNavLink({ icon: Icon, label, active, href, onClick, color = 'blue', collapsed }) {
    return (
        <UnstyledButton
            component={Link}
            href={href}
            onClick={onClick}
            style={{
                display: 'flex',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: '8px 8px',
                borderRadius: '8px',
                backgroundColor: active ? `var(--mantine-color-${color}-light)` : 'transparent',
                color: active ? `var(--mantine-color-${color}-9)` : 'var(--mantine-color-dimmed)',
                transition: 'all 0.2s ease',
                marginBottom: '4px',
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)'
                    e.currentTarget.style.color = 'var(--mantine-color-text)'
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--mantine-color-dimmed)'
                }
            }}
        >
            <Group gap={6} style={{ justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
                <ThemeIcon
                    variant={active ? 'filled' : 'transparent'}
                    color={active ? color : 'gray'}
                    size="md"
                    radius="md"
                    style={{
                        backgroundColor: active ? undefined : 'transparent',
                        color: active ? undefined : 'currentColor'
                    }}
                >
                    <Icon size={18} stroke={1.5} />
                </ThemeIcon>
                {!collapsed && (
                    <Text size="sm" fw={active ? 600 : 500} truncate>
                        {label}
                    </Text>
                )}
            </Group>
        </UnstyledButton>
    )
}
