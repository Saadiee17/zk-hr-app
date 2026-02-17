'use client'

import { Burger, useMantineTheme, useComputedColorScheme } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { EmployeeNavbar } from './EmployeeNavbar'
import React from 'react'

export function AppShellWrapper({ children }) {
  const theme = useMantineTheme()
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const isDark = computedColorScheme === 'dark';
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false)
  const [desktopCollapsed, { toggle: toggleDesktop }] = useDisclosure(false)
  const pathname = usePathname()
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`)

  const navbarBg = isDark ? theme.colors.dark[8] : theme.white
  const sidebarWidth = desktopCollapsed ? 84 : 260

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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: isDark ? '#0a0a0a' : '#f8f9fa' }}>
      {/* ─── Desktop Sidebar ─── */}
      {!isMobile && (
        <nav
          style={{
            width: sidebarWidth,
            minWidth: sidebarWidth,
            height: '100vh',
            position: 'sticky',
            top: 0,
            backgroundColor: isDark
              ? 'rgba(26, 27, 30, 0.98)'
              : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(6px)', // Reduced from 12px for better scroll performance
            WebkitBackdropFilter: 'blur(6px)',
            borderRight: isDark
              ? '1px solid rgba(255, 255, 255, 0.05)'
              : '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 0 20px rgba(0,0,0,0.02)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease',
            overflowX: 'hidden',
            overflowY: 'auto',
            flexShrink: 0,
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            transform: 'translateZ(0)', // Force GPU layer
            contain: 'layout paint'
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
              backgroundColor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
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
              width: 280,
              height: '100vh',
              backgroundColor: isDark
                ? 'rgba(26, 27, 30, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRight: isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.1)',
              zIndex: 201,
              overflowY: 'auto',
              padding: '20px 16px',
              boxShadow: '10px 0 30px rgba(0,0,0,0.1)',
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
