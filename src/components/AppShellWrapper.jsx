'use client'

import { Burger, useMantineTheme } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { EmployeeNavbar } from './EmployeeNavbar'
import React from 'react'

export function AppShellWrapper({ children }) {
  const theme = useMantineTheme()
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false)
  const [desktopCollapsed, { toggle: toggleDesktop }] = useDisclosure(false)
  const pathname = usePathname()
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`)

  const navbarBg = theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white
  const sidebarWidth = desktopCollapsed ? 80 : 200

  const handleNavigate = () => {
    if (isMobile) {
      closeMobile()
    }
  }

  // Check if we're on an employee route (excluding auth pages)
  const isEmployeeRoute = pathname?.startsWith('/employee/') &&
    !pathname.includes('/login') &&
    !pathname.includes('/setup-password')

  // Don't show shell on auth pages
  const isAuthPage = pathname?.includes('/login') || pathname?.includes('/setup-password')

  if (isAuthPage) {
    return <>{children}</>
  }

  const NavComponent = isEmployeeRoute ? EmployeeNavbar : Navbar

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ─── Desktop Sidebar ─── */}
      {!isMobile && (
        <nav
          style={{
            width: sidebarWidth,
            minWidth: sidebarWidth,
            height: '100vh',
            position: 'sticky',
            top: 0,
            backgroundColor: navbarBg,
            borderRight: '1px solid rgba(0,0,0,0.05)',
            transition: 'width 0.3s ease, min-width 0.3s ease',
            overflowX: 'hidden',
            overflowY: 'auto',
            flexShrink: 0,
            padding: desktopCollapsed ? '8px' : '12px 8px',
          }}
        >
          <NavComponent
            onNavigate={handleNavigate}
            isCollapsed={desktopCollapsed}
            toggleCollapse={toggleDesktop}
          />
        </nav>
      )}

      {/* ─── Mobile Overlay Sidebar ─── */}
      {isMobile && mobileOpened && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 200,
              transition: 'opacity 0.3s ease',
            }}
          />
          {/* Sidebar Panel */}
          <nav
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 260,
              height: '100vh',
              backgroundColor: navbarBg,
              borderRight: '1px solid rgba(0,0,0,0.05)',
              zIndex: 201,
              overflowY: 'auto',
              padding: '12px 8px',
            }}
          >
            <NavComponent
              onNavigate={handleNavigate}
              isCollapsed={false}
              toggleCollapse={toggleDesktop}
            />
          </nav>
        </>
      )}

      {/* ─── Main Content ─── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          backgroundColor: 'transparent',
          transition: 'margin 0.3s ease',
        }}
      >
        {/* Mobile Burger Toggle */}
        {isMobile && (
          <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 99 }}>
            <Burger opened={mobileOpened} onClick={toggleMobile} size="sm" />
          </div>
        )}

        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { isCollapsed: desktopCollapsed });
          }
          return child;
        })}
      </main>
    </div>
  )
}
