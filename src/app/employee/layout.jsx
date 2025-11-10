'use client'

import { usePathname } from 'next/navigation'

export default function EmployeeLayout({ children }) {
  const pathname = usePathname()
  
  // Login and setup-password pages should not have the AppShell wrapper
  // (they handle their own styling)
  const isAuthPage = pathname === '/employee/login' || pathname === '/employee/setup-password'
  
  if (isAuthPage) {
    return <>{children}</>
  }
  
  // Other employee pages will use the AppShell wrapper from parent layout
  return <>{children}</>
}



