'use client'

import { Group, Text, Stack, Box, ActionIcon, Tooltip, useMantineColorScheme, Avatar, Divider, ThemeIcon, Center } from '@mantine/core'
import { IconMoon, IconSun, IconLogout, IconBriefcase, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PremiumNavLink } from '@/components/shared/PremiumNavLink'
import React from 'react'

export function UniversalNavbar({
    navItems,
    onNavigate,
    bottomActions,
    brand,
    showProfile = true,
    isCollapsed,
    toggleCollapse
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuth()
    const { colorScheme, toggleColorScheme } = useMantineColorScheme()

    const handleLogout = async () => {
        await logout()
        router.push('/employee/login')
    }

    return (
        <Stack justify="space-between" h="100%" p={0}>
            <Box>
                {/* Brand Section */}
                <Box mb="xl" mt="xs" px={0}>
                    {brand || (
                        <Group justify="center" style={{ position: 'relative', minHeight: 60 }}>
                            {/* Logo */}
                            <img
                                src="/logo.png"
                                alt="Company Logo"
                                style={{
                                    height: isCollapsed ? '40px' : '60px',
                                    width: 'auto',
                                    maxWidth: '100%',
                                    objectFit: 'contain',
                                    transition: 'height 0.3s ease'
                                }}
                            />

                            {/* Collapse Toggle (Desktop Only) */}
                            {!isCollapsed && toggleCollapse && (
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={toggleCollapse}
                                    style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    <IconChevronLeft size={16} />
                                </ActionIcon>
                            )}
                        </Group>
                    )}
                    {isCollapsed && toggleCollapse && (
                        <Center mt="xs">
                            <ActionIcon variant="subtle" color="gray" size="sm" onClick={toggleCollapse}>
                                <IconChevronRight size={16} />
                            </ActionIcon>
                        </Center>
                    )}
                </Box>

                {/* User Profile Mini-Card */}
                {showProfile && user && (
                    <Box mb="xl" px={0}>
                        {isCollapsed ? (
                            <Tooltip label={`${user.firstName} ${user.lastName}`} position="right" withArrow>
                                <Center>
                                    <Avatar src={null} radius="xl" size="md" color="blue">
                                        {user.firstName?.[0]}
                                    </Avatar>
                                </Center>
                            </Tooltip>
                        ) : (
                            <Group>
                                <Avatar src={null} radius="xl" size="md" color="blue">
                                    {user.firstName?.[0]}
                                </Avatar>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <Text size="sm" fw={600} lh={1.2} truncate>
                                        {user.firstName} {user.lastName}
                                    </Text>
                                    <Text size="xs" c="dimmed" lh={1.2} truncate>
                                        {user.isAdmin ? 'Administrator' : 'Employee'}
                                    </Text>
                                </div>
                            </Group>
                        )}
                    </Box>
                )}

                {/* Nav Items */}
                <Stack gap={4} align={isCollapsed ? "center" : "stretch"}>
                    {!isCollapsed && (
                        <Text size="xs" c="dimmed" fw={700} px={4} mb={4} tt="uppercase" ls={1}>
                            Menu
                        </Text>
                    )}
                    {navItems.map((item) => (
                        <Tooltip
                            key={item.href}
                            label={item.label}
                            position="right"
                            withArrow
                            disabled={!isCollapsed}
                        >
                            <div>
                                <PremiumNavLink
                                    {...item}
                                    active={pathname === item.href}
                                    onClick={onNavigate}
                                    collapsed={isCollapsed}
                                />
                            </div>
                        </Tooltip>
                    ))}
                </Stack>
            </Box>

            {/* Bottom Section */}
            <Stack gap="xs" align={isCollapsed ? "center" : "stretch"}>
                {bottomActions && (
                    <Tooltip label="Switch View" position="right" withArrow disabled={!isCollapsed}>
                        <div>
                            {React.cloneElement(bottomActions, { collapsed: isCollapsed })}
                        </div>
                    </Tooltip>
                )}

                {(bottomActions) && <Divider width="100%" />}

                <Group justify={isCollapsed ? "center" : "space-between"} px={0}>
                    <Tooltip label="Toggle Theme" position="right" withArrow>
                        <ActionIcon variant="default" size="lg" radius="md" onClick={toggleColorScheme}>
                            {colorScheme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label="Logout" position="right" withArrow>
                        <ActionIcon variant="light" color="red" size="lg" radius="md" onClick={handleLogout}>
                            <IconLogout size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Stack>
        </Stack>
    )
}
