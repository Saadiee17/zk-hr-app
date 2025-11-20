'use client'

import { AppShell, useMantineTheme, Burger, Group, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { EmployeeNavbar } from './EmployeeNavbar'

export function AppShellWrapper({ children }) {
  const theme = useMantineTheme()
  const [opened, { toggle, close }] = useDisclosure(true)
  const pathname = usePathname()

  const navbarBg = theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white
  const mainBg = theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]

  // Check if we're on an employee route (excluding auth pages)
  // IMPORTANT: Use exact match for '/employee' to avoid matching '/employees'
  const isEmployeeRoute = pathname?.startsWith('/employee/') &&
    !pathname.includes('/login') &&
    !pathname.includes('/setup-password')

  // Don't show AppShell on auth pages
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/setup-password')

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <AppShell
      padding={0}
      header={{ height: 56 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <AppShell.Header style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} size="sm" color={theme.colors.gray[6]} />
            <Text fw={600}>
              {isEmployeeRoute ? 'Employee Portal' : 'HR Attendance Dashboard'}
            </Text>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar
        p="md"
        className="app-navbar"
        style={{ backgroundColor: navbarBg }}
      >
        {isEmployeeRoute ? (
          <EmployeeNavbar />
        ) : (
          <Navbar onNavigate={close} />
        )}
      </AppShell.Navbar>
      <AppShell.Main
        className="app-main"
        style={{
          minHeight: '100vh',
          width: '100%',
          padding: 0,
          paddingLeft: 0,
          marginLeft: 0,
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

