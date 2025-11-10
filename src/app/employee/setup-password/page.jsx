'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Paper,
  Title,
  PasswordInput,
  Button,
  Stack,
  Text,
  Alert,
  Progress,
  Center,
  Box,
} from '@mantine/core'
import { IconAlertCircle, IconCheck, IconLock } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'

function SetupPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setupPassword, user, loading: authLoading } = useAuth()

  const zkUserId = searchParams.get('zkUserId')
  const isReset = searchParams.get('reset') === 'true'

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

  // Validate ZK User ID is provided
  useEffect(() => {
    if (!zkUserId) {
      setError('ZK User ID is required. Please go back to login.')
    }
  }, [zkUserId])

  // Calculate password strength
  const getPasswordStrength = () => {
    if (!password) return 0
    let strength = 0
    if (password.length >= 6) strength += 25
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    return strength
  }

  const passwordStrength = getPasswordStrength()
  const strengthColor =
    passwordStrength < 50 ? 'red' : passwordStrength < 75 ? 'yellow' : 'green'
  const strengthLabel =
    passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Fair' : 'Strong'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!zkUserId) {
      setError('ZK User ID is missing')
      return
    }

    setLoading(true)

    try {
      await setupPassword(Number(zkUserId), password)
      
      // Auto-login successful, redirect to dashboard
      router.push('/employee/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to set password. Please try again.')
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
                {isReset ? 'Reset Password' : 'Set Up Password'}
              </Title>
              <Text c="dimmed" size="sm" ta="center">
                {isReset
                  ? 'Your administrator has reset your password. Please create a new one.'
                  : 'Create a password to access the employee portal'}
              </Text>
              {zkUserId && (
                <Text size="sm" fw={500} ta="center" mt="xs">
                  ZK User ID: {zkUserId}
                </Text>
              )}
            </div>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <div>
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter your new password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="md"
                  />
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <Progress
                        value={passwordStrength}
                        color={strengthColor}
                        size="sm"
                        mb="xs"
                      />
                      <Text size="xs" c={strengthColor}>
                        Password strength: {strengthLabel}
                      </Text>
                    </div>
                  )}
                </div>

                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="md"
                  error={
                    confirmPassword && password !== confirmPassword
                      ? 'Passwords do not match'
                      : null
                  }
                />

                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Password requirements:
                  </Text>
                  <Text size="xs" c={password.length >= 6 ? 'teal' : 'dimmed'}>
                    {password.length >= 6 ? '✓' : '○'} At least 6 characters
                  </Text>
                  <Text size="xs" c={/[A-Z]/.test(password) ? 'teal' : 'dimmed'}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                    (recommended)
                  </Text>
                  <Text size="xs" c={/[0-9]/.test(password) ? 'teal' : 'dimmed'}>
                    {/[0-9]/.test(password) ? '✓' : '○'} One number (recommended)
                  </Text>
                </Stack>

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  loading={loading}
                  leftSection={<IconLock size={18} />}
                  disabled={!zkUserId || password !== confirmPassword}
                >
                  {isReset ? 'Reset Password' : 'Create Password'}
                </Button>
              </Stack>
            </form>

            <Button variant="subtle" onClick={() => router.push('/employee/login')}>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <Center style={{ minHeight: '100vh' }}>
          <Text>Loading...</Text>
        </Center>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  )
}



