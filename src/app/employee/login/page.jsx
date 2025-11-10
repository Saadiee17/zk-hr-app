'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Alert,
  Center,
  Box,
} from '@mantine/core'
import { IconAlertCircle, IconLogin } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'

export default function EmployeeLoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, user, loading: authLoading } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (user.isAdmin) {
        router.push('/')
      } else {
        router.push('/employee/dashboard')
      }
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!identifier || !password) {
      setError('Please enter both ZK User ID/Email and password')
      return
    }

    setLoading(true)

    try {
      const result = await login(identifier, password)
      
      // Redirect based on privilege
      if (result.user.isAdmin) {
        router.push('/')
      } else {
        router.push('/employee/dashboard')
      }
    } catch (err) {
      // Check if password needs setup
      if (err.message.includes('Password not set') || err.message.includes('needsSetup')) {
        router.push(`/employee/setup-password?zkUserId=${identifier}`)
        return
      }
      
      // Check if password reset is required
      if (err.message.includes('Password reset required') || err.message.includes('requiresReset')) {
        router.push(`/employee/setup-password?zkUserId=${identifier}&reset=true`)
        return
      }

      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Text>Loading...</Text>
      </Center>
    )
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Container size="xs">
        <Paper shadow="xl" p="xl" radius="md">
          <Stack gap="lg">
            <div>
              <Title order={1} ta="center" mb="xs">
                Employee Portal
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                Sign in to access your profile and attendance
              </Text>
            </div>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="ZK User ID or Email"
                  placeholder="Enter your ZK User ID or email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  size="md"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="md"
                />

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  leftSection={<IconLogin size={18} />}
                >
                  Sign In
                </Button>
              </Stack>
            </form>

            <Text size="sm" c="dimmed" ta="center">
              First time logging in? Enter your ZK User ID to set up your password.
            </Text>

            <Text size="xs" c="dimmed" ta="center">
              Need help? Contact your HR administrator.
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}



