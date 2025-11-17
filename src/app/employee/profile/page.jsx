'use client'

import { useState, useEffect } from 'react'
import {
  Container,
  Title,
  Paper,
  Stack,
  Button,
  Group,
  LoadingOverlay,
  Badge,
  Divider,
} from '@mantine/core'
import { IconLock, IconEdit } from '@tabler/icons-react'
import { showSuccess, showError } from '@/utils/notifications'
import { useAuth } from '@/contexts/AuthContext'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'
import { ProfileFormFields } from '@/components/shared/ProfileFormFields'
import { PasswordChangeModal } from '@/components/shared/PasswordChangeModal'

export default function EmployeeProfilePage() {
  const { user, changePassword } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // Form states
  const [formValues, setFormValues] = useState({
    phone: '',
    email: '',
    address: '',
    birthday: null,
  })

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
        setFormValues({
          phone: data.data.phone || '',
          email: data.data.email || '',
          address: data.data.address || '',
          birthday: data.data.birthday ? new Date(data.data.birthday) : null,
        })
      } else {
        throw new Error(data.error || 'Failed to fetch profile')
      }
    } catch (error) {
      showError(error.message, 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      // Convert birthday to YYYY-MM-DD format
      let birthdayStr = null
      if (formValues.birthday) {
        if (formValues.birthday instanceof Date) {
          birthdayStr = formValues.birthday.toISOString().slice(0, 10)
        } else if (typeof formValues.birthday === 'string') {
          // If it's already a string in YYYY-MM-DD format, use it directly
          birthdayStr = formValues.birthday.length === 10 ? formValues.birthday : new Date(formValues.birthday).toISOString().slice(0, 10)
        } else {
          // Try to convert to Date
          const date = new Date(formValues.birthday)
          if (!isNaN(date.getTime())) {
            birthdayStr = date.toISOString().slice(0, 10)
          }
        }
      }

      const updates = {
        phone: formValues.phone,
        email: formValues.email,
        address: formValues.address,
        birthday: birthdayStr,
      }

      const res = await fetch('/api/employee/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await res.json()

      if (res.ok) {
        showSuccess('Profile updated successfully')
        setProfile(data.data)
        setIsEditing(false)
      } else {
        throw new Error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      showError(error.message, 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      showSuccess('Password changed successfully')
      setChangePasswordOpen(false)
    } catch (error) {
      showError(error.message || 'Failed to change password')
    }
  }

  const handleCancelEdit = () => {
    // Reset form to original values
    setFormValues({
      phone: profile?.phone || '',
      email: profile?.email || '',
      address: profile?.address || '',
      birthday: profile?.birthday ? new Date(profile.birthday) : null,
    })
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

            <ProfileFormFields
              profile={profile}
              formValues={formValues}
              onChange={setFormValues}
              isEditing={isEditing}
            />

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
      <PasswordChangeModal
        opened={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSubmit={handleChangePassword}
      />
    </Container>
  )
}



