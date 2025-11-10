'use client'

import { Group, Image, NavLink, Tooltip, AppShell, Stack, ActionIcon, useMantineColorScheme, Button } from '@mantine/core'
import { IconDashboard, IconSun, IconMoon, IconCalendar, IconUsers, IconBuilding, IconDeviceDesktop, IconReport, IconUserPlus, IconDownload, IconUser } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function Navbar({ onNavigate }) {
  const pathname = usePathname()
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const { user } = useAuth()

  return (
    <>
      <AppShell.Section>
        <Group justify="center" mb="xl" mt="md">
          <Image
            src="/logo.png"
            alt="Company Logo"
            h={90}
            w="auto"
            fit="contain"
          />
        </Group>
      </AppShell.Section>

      <AppShell.Section grow>
        <Stack gap="xs">
          <Tooltip label="View Attendance Dashboard" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/"
                label="Dashboard"
                leftSection={<IconDashboard size={20} />}
                active={pathname === '/'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Employee Management" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/employees/manage"
                label="Employees"
                leftSection={<IconUsers size={20} />}
                active={pathname === '/employees/manage'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Department Management" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/departments"
                label="Departments"
                leftSection={<IconBuilding size={20} />}
                active={pathname === '/departments'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Schedule Management" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/device-config"
                label="Schedule Management"
                leftSection={<IconDeviceDesktop size={20} />}
                active={pathname === '/device-config'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Payroll Reports" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/payroll-reports"
                label="Payroll Reports"
                leftSection={<IconReport size={20} />}
                active={pathname === '/payroll-reports'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Employee Enrollment" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/employee-enrollment"
                label="Enrollment"
                leftSection={<IconUserPlus size={20} />}
                active={pathname === '/employee-enrollment'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Leave Management" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/leave-management"
                label="Leave Management"
                leftSection={<IconCalendar size={20} />}
                active={pathname === '/leave-management'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>
          <Tooltip label="Download Bridge Installer" position="right" withArrow>
            <div>
              <NavLink
                component={Link}
                href="/bridge-installer"
                label="Bridge Installer"
                leftSection={<IconDownload size={20} />}
                active={pathname === '/bridge-installer'}
                variant="light"
                onClick={onNavigate}
                style={{
                  borderRadius: '8px',
                }}
              />
            </div>
          </Tooltip>

          {user?.isAdmin && (
            <>
              <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                <Button
                  component={Link}
                  href="/employee/dashboard"
                  fullWidth
                  variant="filled"
                  color="blue"
                  leftSection={<IconUser size={18} />}
                  size="md"
                  style={{ fontWeight: 600 }}
                  onClick={onNavigate}
                >
                  Employee View
                </Button>
              </div>
            </>
          )}
        </Stack>
      </AppShell.Section>

      <AppShell.Section>
        <Group justify="center" mb="md">
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
      </AppShell.Section>
    </>
  )
}

