'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HrManagementPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to departments page (main HR section)
    router.replace('/departments')
  }, [router])

  return null
}
