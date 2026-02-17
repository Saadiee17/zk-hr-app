import { UnstyledButton, Group, Text, ThemeIcon, useMantineTheme, useComputedColorScheme } from '@mantine/core'
import { memo } from 'react'
import Link from 'next/link'

export const PremiumNavLink = memo(({ icon: Icon, label, active, href, onClick, color = 'blue', collapsed }) => {
    const theme = useMantineTheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    const isDark = computedColorScheme === 'dark';

    return (
        <UnstyledButton
            component={Link}
            href={href}
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: collapsed ? '10px' : '10px 14px',
                borderRadius: '12px',
                backgroundColor: active
                    ? `var(--mantine-color-${color}-light)`
                    : 'transparent',
                color: active
                    ? `var(--mantine-color-${color}-filled)`
                    : 'var(--mantine-color-text)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, background-color 0.2s ease',
                marginBottom: '4px',
                opacity: active ? 1 : 0.8,
                boxShadow: active ? `0 4px 12px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}` : 'none',
                transform: 'translateZ(0)', // Force GPU
                willChange: 'transform, opacity'
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.transform = 'scale(1.02) translateX(4px) translateZ(0)'
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.opacity = '0.8'
                    e.currentTarget.style.transform = 'scale(1) translateX(0) translateZ(0)'
                }
            }}
        >
            <Group gap={12} wrap="nowrap" style={{ justifyContent: collapsed ? 'center' : 'flex-start', width: '100%' }}>
                <ThemeIcon
                    variant={active ? 'light' : 'transparent'}
                    color={active ? color : 'gray'}
                    size="md"
                    radius="md"
                    style={{
                        backgroundColor: active ? undefined : 'transparent',
                        color: active ? undefined : 'currentColor',
                        transition: 'transform 0.2s ease',
                    }}
                >
                    <Icon size={20} stroke={1.5} />
                </ThemeIcon>
                {!collapsed && (
                    <Text
                        size="sm"
                        fw={active ? 600 : 500}
                        truncate
                        style={{
                            letterSpacing: '0.2px',
                            flex: 1
                        }}
                    >
                        {label}
                    </Text>
                )}
            </Group>
        </UnstyledButton>
    )
})

PremiumNavLink.displayName = 'PremiumNavLink'
