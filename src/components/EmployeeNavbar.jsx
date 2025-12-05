'use client'

import {
  IconHome,
  IconUser,
  IconCalendar,
  IconReport,
  IconDownload,
  IconSettings
} from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { UniversalNavbar } from '@/components/shared/UniversalNavbar'
import { PremiumNavLink } from '@/components/shared/PremiumNavLink'

export function EmployeeNavbar({ onNavigate, isCollapsed, toggleCollapse }) {
  const { user } = useAuth()

  const navItems = [
    { icon: IconHome, label: 'Dashboard', href: '/employee/dashboard' },
    { icon: IconUser, label: 'My Profile', href: '/employee/profile' },
    { icon: IconCalendar, label: 'Leave Management', href: '/employee/leave' },
    { icon: IconReport, label: 'My Reports', href: '/employee/reports' },
    { icon: IconDownload, label: 'Bridge Installer', href: '/employee/bridge-installer' },
  ]

  const bottomActions = user?.isAdmin ? (
    <PremiumNavLink
      icon={IconSettings}
      label="Admin Dashboard"
      href="/"
      active={false}
      color="violet"
      onClick={onNavigate}
    />
  ) : null

  return (
    <UniversalNavbar
      navItems={navItems}
      onNavigate={onNavigate}
      bottomActions={bottomActions}
      isCollapsed={isCollapsed}
      toggleCollapse={toggleCollapse}
    />
  )
}
