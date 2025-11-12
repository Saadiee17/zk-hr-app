'use client'

import { useAuth } from '@/contexts/AuthContext'
import { EmployeeProfileReporting } from '@/components/EmployeeProfileReporting'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function EmployeeReportsPage() {
  const { user } = useAuth()

  if (!user?.employeeId) {
    return (
      <div>
        <AdminAccessBanner />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <AdminAccessBanner />
      <EmployeeProfileReporting employeeId={user.employeeId} isAdminView={false} />
    </>
  )
}
