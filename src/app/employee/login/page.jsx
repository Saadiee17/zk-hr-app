'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Alert,
  Center,
  Loader,
} from '@mantine/core'
import { IconAlertCircle, IconFingerprint, IconArrowRight } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import classes from '../auth.module.css'

function LiveClock() {
  const [now, setNow] = useState(null)

  useEffect(() => {
    // first tick via rAF so the placeholder swaps right after hydration
    const raf = requestAnimationFrame(() => setNow(new Date()))
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(timer)
    }
  }, [])

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className={classes.clock}>
      <div className={classes.clockTime}>
        {now ? (
          <>
            {pad(now.getHours())}
            <span className={classes.clockColon}>:</span>
            {pad(now.getMinutes())}
            <span className={classes.clockColon}>:</span>
            {pad(now.getSeconds())}
          </>
        ) : (
          '--:--:--'
        )}
      </div>
      <div className={classes.clockDate}>
        {now
          ? now.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : ' '}
      </div>
    </div>
  )
}

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
            Every second,
            <br />
            <span className={classes.headlineAccent}>accounted for.</span>
          </h1>
          <p className={classes.subline}>
            Biometric attendance, schedules, and leave — synced live from your ZK
            device to one workspace.
          </p>
        </div>

        <div>
          <LiveClock />
          <div className={classes.chipRow}>
            <span className={classes.chip}>
              <span className={classes.chipDot} />
              Biometric sync
            </span>
            <span className={classes.chip}>Live attendance</span>
            <span className={classes.chip}>Leave &amp; shifts</span>
          </div>
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
              <h2 className={classes.formTitle}>Welcome back</h2>
              <p className={classes.formSubtitle}>
                Sign in to access your profile, attendance, and leave requests.
              </p>
            </div>

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                radius="md"
                title="Sign-in failed"
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                <TextInput
                  label="ZK User ID or Email"
                  placeholder="e.g. 1024 or you@company.com"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  size="md"
                  radius="md"
                  classNames={{ root: `${classes.fadeUp} ${classes.delay2}`, wrapper: classes.input }}
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  size="md"
                  radius="md"
                  classNames={{ root: `${classes.fadeUp} ${classes.delay3}`, wrapper: classes.input }}
                />

                <Button
                  type="submit"
                  fullWidth
                  size="md"
                  radius="md"
                  mt="xs"
                  loading={loading}
                  rightSection={<IconArrowRight size={18} />}
                  className={`${classes.submitButton} ${classes.fadeUp} ${classes.delay4}`}
                >
                  Sign in
                </Button>
              </Stack>
            </form>

            <Stack gap="sm" className={`${classes.fadeUp} ${classes.delay4}`}>
              <div className={classes.helpDivider}>
                <span className={classes.helpDividerLabel}>First time here?</span>
              </div>
              <Text size="sm" c="dimmed" ta="center">
                Enter your ZK User ID above and we&apos;ll walk you through setting a
                password.
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                Need help? Contact your HR administrator.
              </Text>
            </Stack>
          </Stack>
        </div>
      </div>
    </div>
  )
}
