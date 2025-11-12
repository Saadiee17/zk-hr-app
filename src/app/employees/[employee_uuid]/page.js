'use client'

import { useParams } from 'next/navigation'
import { EmployeeProfileReporting } from '@/components/EmployeeProfileReporting'

export default function EmployeeProfilePage() {
  const params = useParams()
  const employeeId = params?.employee_uuid

  return <EmployeeProfileReporting employeeId={employeeId} isAdminView={true} />
}
