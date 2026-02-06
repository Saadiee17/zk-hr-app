'use client'

import { Alert, Button, Group } from '@mantine/core'
import { IconSettings, IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export function AdminAccessBanner() {
  const { user } = useAuth()

  if (!user?.isAdmin) {
    return null
  }

  return (
    <Alert
      color="blue"
      title={
        <Group justify="space-between" style={{ width: '100%' }}>
          <span>You&apos;re logged in as an Administrator</span>
          <Button
            component={Link}
            href="/"
            size="xs"
            variant="light"
            leftSection={<IconSettings size={16} />}
          >
            Go to Admin Dashboard
          </Button>
        </Group>
      }
      style={{ marginBottom: '1rem' }}
    />
  )
}

