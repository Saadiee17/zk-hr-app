'use client'

import { AppShell, useMantineTheme, Burger, Group, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Navbar } from './Navbar'

export function AppShellWrapper({ children }) {
  const theme = useMantineTheme()
  const [opened, { toggle, close }] = useDisclosure(false)
  
  const navbarBg = theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white
  const mainBg = theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0]

  return (
    <AppShell
      padding="md"
      header={{ height: 56 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" color={theme.colors.gray[6]} />
            <Text fw={600}>HR Attendance Dashboard</Text>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar
        p="md"
        className="app-navbar"
        style={{ backgroundColor: navbarBg }}
      >
        <Navbar onNavigate={close} />
      </AppShell.Navbar>
      <AppShell.Main
        className="app-main"
        style={{ backgroundColor: mainBg, minHeight: '100vh' }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

