'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  PasswordInput,
  Button,
  Stack,
  Text,
  Alert,
  Progress,
  Center,
  Loader,
  Group,
} from '@mantine/core'
import { IconAlertCircle, IconFingerprint, IconLock, IconArrowLeft } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import classes from '../auth.module.css'

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
        <Loader size="sm" />
      </Center>
    )
  }

  return (
    <div className={classes.shell}>
      {/* ── Brand panel (desktop) ── */}
      <div className={classes.brandPanel}>
        <div className={classes.dotGrid} />

        <div className={classes.brandContent}>
          <div className={classes.brandMark}>
            <div className={classes.brandIcon}>
              <IconFingerprint size={26} stroke={1.6} />
            </div>
            <div>
              <div className={classes.brandName}>ZK HR</div>
              <div className={classes.brandTag}>Attendance OS</div>
            </div>
          </div>

          <h1 className={classes.headline}>
            One step from
            <br />
            <span className={classes.headlineAccent}>your workspace.</span>
          </h1>
          <p className={classes.subline}>
            {isReset
              ? 'Your administrator reset your password. Choose a new one to get back in.'
              : 'Set a password once, then sign in anytime with your ZK User ID or email.'}
          </p>
        </div>

        <div className={classes.chipRow}>
          <span className={classes.chip}>
            <span className={classes.chipDot} />
            Encrypted credentials
          </span>
          <span className={classes.chip}>Self-service access</span>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className={classes.formPanel}>
        <div className={classes.formColumn}>
          <div className={classes.mobileBrand}>
            <div className={classes.brandIcon}>
              <IconFingerprint size={24} stroke={1.6} />
            </div>
            <div>
              <Text fw={700} size="md" lh={1.2}>
                ZK HR
              </Text>
              <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 2 }}>
                Attendance OS
              </Text>
            </div>
          </div>

          <Stack gap="xl">
            <div className={`${classes.fadeUp} ${classes.delay1}`}>
              <h2 className={classes.formTitle}>
                {isReset ? 'Reset password' : 'Set up your password'}
              </h2>
              <p className={classes.formSubtitle}>
                {isReset
                  ? 'Create a new password for your account.'
                  : 'Create a password to access the employee portal.'}
                {zkUserId && (
                  <>
                    {' '}
                    Setting up for ZK User ID <b>{zkUserId}</b>.
                  </>
                )}
              </p>
            </div>

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                radius="md"
                title="Something went wrong"
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <div className={`${classes.fadeUp} ${classes.delay2}`}>
                  <PasswordInput
                    label="New Password"
                    placeholder="Enter your new password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="md"
                    radius="md"
                    classNames={{ wrapper: classes.input }}
                  />
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <Progress value={passwordStrength} color={strengthColor} size="sm" mb={6} />
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
                  radius="md"
                  classNames={{ root: `${classes.fadeUp} ${classes.delay3}`, wrapper: classes.input }}
                  error={
                    confirmPassword && password !== confirmPassword
                      ? 'Passwords do not match'
                      : null
                  }
                />

                <Stack gap={4} className={`${classes.fadeUp} ${classes.delay3}`}>
                  <Text size="xs" c={password.length >= 6 ? 'teal' : 'dimmed'}>
                    {password.length >= 6 ? '✓' : '○'} At least 6 characters
                  </Text>
                  <Text size="xs" c={/[A-Z]/.test(password) ? 'teal' : 'dimmed'}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter (recommended)
                  </Text>
                  <Text size="xs" c={/[0-9]/.test(password) ? 'teal' : 'dimmed'}>
                    {/[0-9]/.test(password) ? '✓' : '○'} One number (recommended)
                  </Text>
                </Stack>

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  radius="md"
                  mt="xs"
                  loading={loading}
                  leftSection={<IconLock size={18} />}
                  disabled={!zkUserId || password !== confirmPassword}
                  className={`${classes.submitButton} ${classes.fadeUp} ${classes.delay4}`}
                >
                  {isReset ? 'Reset password' : 'Create password'}
                </Button>
              </Stack>
            </form>

            <Group justify="center" className={`${classes.fadeUp} ${classes.delay4}`}>
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => router.push('/employee/login')}
              >
                Back to login
              </Button>
            </Group>
          </Stack>
        </div>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <Center style={{ minHeight: '100vh' }}>
          <Loader size="sm" />
        </Center>
      }
    >
      <SetupPasswordContent />
    </Suspense>
  )
}
