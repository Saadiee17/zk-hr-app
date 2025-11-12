'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Paper,
  Stack,
  TextInput,
  Button,
  Group,
  LoadingOverlay,
  Alert,
  Modal,
  PasswordInput,
  Grid,
  Badge,
  Divider,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX, IconLock, IconEdit, IconUser } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function EmployeeProfilePage() {
  const { user, changePassword } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // Form states
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [birthday, setBirthday] = useState(null)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/employee/profile')
      const data = await res.json()

      if (res.ok) {
        setProfile(data.data)
        setPhone(data.data.phone || '')
        setEmail(data.data.email || '')
        setAddress(data.data.address || '')
        setBirthday(data.data.birthday ? new Date(data.data.birthday) : null)
      } else {
        throw new Error(data.error || 'Failed to fetch profile')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      // Convert birthday to YYYY-MM-DD format
      let birthdayStr = null
      if (birthday) {
        if (birthday instanceof Date) {
          birthdayStr = birthday.toISOString().slice(0, 10)
        } else if (typeof birthday === 'string') {
          // If it's already a string in YYYY-MM-DD format, use it directly
          birthdayStr = birthday.length === 10 ? birthday : new Date(birthday).toISOString().slice(0, 10)
        } else {
          // Try to convert to Date
          const date = new Date(birthday)
          if (!isNaN(date.getTime())) {
            birthdayStr = date.toISOString().slice(0, 10)
          }
        }
      }

      const updates = {
        phone,
        email,
        address,
        birthday: birthdayStr,
      }

      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()

      if (res.ok) {
        notifications.show({
          title: 'Success',
          message: 'Profile updated successfully',
          color: 'green',
          icon: <IconCheck size={18} />,
        })
        setProfile(data.data)
        setIsEditing(false)
      } else {
        throw new Error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Error',
        message: 'Passwords do not match',
        color: 'red',
        icon: <IconX size={18} />,
      })
      return
    }

    if (newPassword.length < 6) {
      notifications.show({
        title: 'Error',
        message: 'Password must be at least 6 characters',
        color: 'red',
        icon: <IconX size={18} />,
      })
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      notifications.show({
        title: 'Success',
        message: 'Password changed successfully',
        color: 'green',
        icon: <IconCheck size={18} />,
      })
      setChangePasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to change password',
        color: 'red',
        icon: <IconX size={18} />,
      })
    }
  }

  const handleCancelEdit = () => {
    // Reset form to original values
    setPhone(profile?.phone || '')
    setEmail(profile?.email || '')
    setAddress(profile?.address || '')
    setBirthday(profile?.birthday ? new Date(profile.birthday) : null)
    setIsEditing(false)
  }

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <LoadingOverlay visible />
      </Container>
    )
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <AdminAccessBanner />
        <Group justify="space-between">
          <div>
            <Title order={1}>My Profile</Title>
            <Badge color={user?.isAdmin ? 'blue' : 'gray'} size="lg" mt="xs">
              {user?.isAdmin ? 'Administrator' : 'Employee'}
            </Badge>
          </div>
          {!isEditing && (
            <Button
              leftSection={<IconEdit size={18} />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </Group>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Title order={3}>Personal Information</Title>
            <Divider />

            <Grid>
              {/* Read-only fields */}
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="First Name"
                  value={profile?.first_name || ''}
                  disabled
                  rightSection={<IconUser size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Last Name"
                  value={profile?.last_name || ''}
                  disabled
                  rightSection={<IconUser size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Employee ID"
                  value={profile?.employee_id || ''}
                  disabled
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="ZK User ID"
                  value={profile?.zk_user_id || ''}
                  disabled
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Department"
                  value={profile?.department?.name || 'Not Assigned'}
                  disabled
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Schedule"
                  value={profile?.schedule_name || 'Not Assigned'}
                  disabled
                />
              </Grid.Col>

              {/* Editable fields */}
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Phone"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label="Email"
                  placeholder="Enter email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                />
              </Grid.Col>

              <Grid.Col span={12}>
                <TextInput
                  label="Address"
                  placeholder="Enter your address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!isEditing}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6 }}>
                <DateInput
                  label="Birthday"
                  placeholder="Select birthday"
                  value={birthday}
                  onChange={setBirthday}
                  disabled={!isEditing}
                  clearable
                />
              </Grid.Col>
            </Grid>

            {isEditing && (
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button loading={saving} onClick={handleSaveProfile}>
                  Save Changes
                </Button>
              </Group>
            )}
          </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Title order={3}>Security</Title>
            <Divider />
            <Group>
              <Button
                leftSection={<IconLock size={18} />}
                variant="light"
                onClick={() => setChangePasswordOpen(true)}
              >
                Change Password
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>

      {/* Change Password Modal */}
      <Modal
        opened={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        title="Change Password"
      >
        <Stack gap="md">
          <PasswordInput
            label="Current Password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={
              confirmPassword && newPassword !== confirmPassword
                ? 'Passwords do not match'
                : null
            }
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}



