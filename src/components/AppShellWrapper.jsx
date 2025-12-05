'use client'

import { AppShell, useMantineTheme, Burger, Group, Text } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { EmployeeNavbar } from './EmployeeNavbar'

export function AppShellWrapper({ children }) {
  const theme = useMantineTheme()
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false)
  const [desktopCollapsed, { toggle: toggleDesktop }] = useDisclosure(false)
  const pathname = usePathname()
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`)

  const navbarBg = theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white

  const handleNavigate = () => {
    if (isMobile) {
      closeMobile()
    }
  }

  // Check if we're on an employee route (excluding auth pages)
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
      navbar={{
        width: desktopCollapsed ? 80 : 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      }}
    >
      <AppShell.Navbar
        p={desktopCollapsed ? "xs" : "md"}
        className="app-navbar"
        style={{
          backgroundColor: navbarBg,
          transition: 'width 0.3s ease',
          overflowX: 'hidden'
        }}
      >
        {isEmployeeRoute ? (
          <EmployeeNavbar
            onNavigate={handleNavigate}
            isCollapsed={desktopCollapsed}
            toggleCollapse={toggleDesktop}
          />
        ) : (
          <Navbar
            onNavigate={handleNavigate}
            isCollapsed={desktopCollapsed}
            toggleCollapse={toggleDesktop}
          />
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
        {/* Mobile Toggle Button (Floating) */}
        <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 99, display: isMobile ? 'block' : 'none' }}>
          <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" />
        </div>

        {children}
      </AppShell.Main>
    </AppShell>
  )
}

