'use client'

import {
  IconDashboard,
  IconUsers,
  IconBuilding,
  IconDeviceDesktop,
  IconReport,
  IconUserPlus,
  IconCalendar,
  IconDownload,
  IconUser
} from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { UniversalNavbar } from '@/components/shared/UniversalNavbar'
import { PremiumNavLink } from '@/components/shared/PremiumNavLink'

export function Navbar({ onNavigate, isCollapsed, toggleCollapse }) {
  const { user } = useAuth()

  const navItems = [
    { icon: IconDashboard, label: 'Dashboard', href: '/' },
    { icon: IconUsers, label: 'Employees', href: '/employees/manage' },
    { icon: IconBuilding, label: 'Departments', href: '/departments' },
    { icon: IconDeviceDesktop, label: 'Schedules', href: '/device-config' },
    { icon: IconReport, label: 'Payroll Reports', href: '/payroll-reports' },
    { icon: IconUserPlus, label: 'Enrollment', href: '/employee-enrollment' },
    { icon: IconCalendar, label: 'Leave Management', href: '/leave-management' },
    { icon: IconDownload, label: 'Bridge Installer', href: '/bridge-installer' },
  ]

  const bottomActions = user?.isAdmin ? (
    <PremiumNavLink
      icon={IconUser}
      label="Employee View"
      href="/employee/dashboard"
      active={false}
      color="blue"
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
