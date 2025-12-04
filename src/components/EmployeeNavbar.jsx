'use client'

import { NavLink, Group, Text, Button, Stack, Badge, Box, ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core'
import {
  IconHome,
  IconUser,
  IconCalendar,
  IconReport,
  IconDownload,
  IconLogout,
  IconSettings,
  IconMoon,
  IconSun
} from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function EmployeeNavbar({ onNavigate }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()

  const handleLogout = async () => {
    await logout()
    router.push('/employee/login')
  }

  const navItems = [
    {
      icon: IconHome,
      label: 'Dashboard',
      href: '/employee/dashboard',
    },
    {
      icon: IconUser,
      label: 'My Profile',
      href: '/employee/profile',
    },
    {
      icon: IconCalendar,
      label: 'Leave Management',
      href: '/employee/leave',
    },
    {
      icon: IconReport,
      label: 'My Reports',
      href: '/employee/reports',
    },
    {
      icon: IconDownload,
      label: 'Bridge Installer',
      href: '/employee/bridge-installer',
    },
  ]

  return (
    <Stack justify="space-between" style={{ height: '100%' }}>
      <Box>
        <Group mb="md" p="xs">
          <div style={{ flex: 1 }}>
            <Text size="lg" fw={700}>
              Employee Portal
            </Text>
            {user && (
              <Text size="xs" c="dimmed">
                {user.firstName} {user.lastName}
              </Text>
            )}
          </div>
          {user?.isAdmin && (
            <Badge color="blue" size="sm" variant="light">
              Admin
            </Badge>
          )}
        </Group>

        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={pathname === item.href}
              onClick={onNavigate}
            />
          ))}

          {user?.isAdmin && (
            <>
              <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                <Button
                  component={Link}
                  href="/"
                  fullWidth
                  variant="filled"
                  color="blue"
                  leftSection={<IconSettings size={18} />}
                  size="md"
                  style={{ fontWeight: 600 }}
                  onClick={onNavigate}
                >
                  Admin Dashboard
                </Button>
              </div>
            </>
          )}
        </Stack>
      </Box>

      <Stack gap="xs">
        <Group justify="center" mb="xs">
          <Tooltip label={colorScheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'} position="right" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <Button
          fullWidth
          variant="light"
          color="red"
          leftSection={<IconLogout size={18} />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Stack>
    </Stack>
  )
}

