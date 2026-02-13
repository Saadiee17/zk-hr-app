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
                {/* Brand Section & Collapse Toggle */}
                <Box mb="xl" px={4}>
                    <Group justify="space-between" align="center" wrap="nowrap">
                        {!isCollapsed && (
                            <Box style={{ flex: 1 }}>
                                {brand || (
                                    <img
                                        src="/logo.png"
                                        alt="Company Logo"
                                        style={{
                                            height: '42px',
                                            width: 'auto',
                                            maxWidth: '180px',
                                            objectFit: 'contain',
                                            display: 'block'
                                        }}
                                    />
                                )}
                            </Box>
                        )}

                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="md"
                            radius="md"
                            onClick={toggleCollapse}
                            style={{
                                marginLeft: isCollapsed ? 'auto' : 0,
                                marginRight: isCollapsed ? 'auto' : 0,
                                transition: 'all 0.3s ease',
                                backgroundColor: 'rgba(0,0,0,0.03)',
                            }}
                        >
                            {isCollapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
                        </ActionIcon>
                    </Group>
                </Box>

                {/* User Profile Section */}
                {showProfile && user && (
                    <Box
                        mb="xl"
                        px={isCollapsed ? 0 : 8}
                        py={8}
                        style={{
                            borderRadius: '12px',
                            backgroundColor: !isCollapsed ? 'rgba(0,0,0,0.02)' : 'transparent',
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {isCollapsed ? (
                            <Tooltip label={`${user.firstName} ${user.lastName}`} position="right" withArrow>
                                <Center>
                                    <Avatar src={null} radius="xl" size="md" color="blue" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                        {user.firstName?.[0]}
                                    </Avatar>
                                </Center>
                            </Tooltip>
                        ) : (
                            <Group gap="sm" wrap="nowrap">
                                <Avatar src={null} radius="xl" size="md" color="blue" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    {user.firstName?.[0]}
                                </Avatar>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <Text size="sm" fw={600} lh={1.2} truncate>
                                        {user.firstName} {user.lastName}
                                    </Text>
                                    <Text size="xs" c="dimmed" lh={1.2} truncate style={{ opacity: 0.8 }}>
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
                        <Text
                            size="xs"
                            c="dimmed"
                            fw={700}
                            px={12}
                            mb={8}
                            tt="uppercase"
                            ls={1.5}
                            style={{ opacity: 0.5, fontSize: '10px' }}
                        >
                            Main Menu
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
            <Stack gap="sm" align={isCollapsed ? "center" : "stretch"} mt="xl">
                {bottomActions && (
                    <Box px={isCollapsed ? 0 : 4}>
                        {React.cloneElement(bottomActions, { collapsed: isCollapsed })}
                    </Box>
                )}

                <Divider
                    width="100%"
                    label={!isCollapsed ? "System" : null}
                    labelPosition="center"
                    variant="dashed"
                    styles={{ label: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 } }}
                />

                <Box px={isCollapsed ? 0 : 4}>
                    <Group
                        justify={isCollapsed ? "center" : "space-between"}
                        gap="xs"
                        style={{
                            backgroundColor: !isCollapsed ? 'rgba(0,0,0,0.02)' : 'transparent',
                            padding: !isCollapsed ? '8px' : 0,
                            borderRadius: '12px',
                        }}
                    >
                        <Tooltip label="Toggle Theme" position="right" withArrow>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="lg"
                                radius="md"
                                onClick={toggleColorScheme}
                            >
                                {colorScheme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
                            </ActionIcon>
                        </Tooltip>

                        {!isCollapsed && (
                            <Text size="xs" fw={500} c="dimmed" style={{ flex: 1, textAlign: 'center' }}>
                                {colorScheme === 'light' ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                        )}

                        <Tooltip label="Logout" position="right" withArrow>
                            <ActionIcon
                                variant="light"
                                color="red"
                                size="lg"
                                radius="md"
                                onClick={handleLogout}
                                style={{ boxShadow: '0 2px 8px rgba(255,0,0,0.1)' }}
                            >
                                <IconLogout size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Box>
            </Stack>
        </Stack>
    )
}
