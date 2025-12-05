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
  Avatar,
  Card,
  Grid,
  ThemeIcon,
  Text,
} from '@mantine/core'
import {
  IconLock,
  IconEdit,
  IconUser,
  IconBuilding,
  IconClock,
  IconId,
} from '@tabler/icons-react'
import { UniversalTabs } from '@/components/shared/UniversalTabs'
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
      <Container size="xl" py="xl">
        <LoadingOverlay visible />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <AdminAccessBanner />
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>My Profile</Title>
            <Text c="dimmed">Manage your personal information and security settings</Text>
          </div>
        </Group>

        <Grid gutter="lg">
          {/* Left Column: Profile Card */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="lg" p="xl" shadow="sm">
              <Stack align="center" gap="md">
                <Avatar size={120} radius={120} color="blue" variant="light">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </Avatar>
                <div style={{ textAlign: 'center' }}>
                  <Title order={3}>{profile?.first_name} {profile?.last_name}</Title>
                  <Badge size="lg" variant="light" mt="xs" color={user?.isAdmin ? 'blue' : 'gray'}>
                    {user?.isAdmin ? 'Administrator' : 'Employee'}
                  </Badge>
                </div>
              </Stack>

              <Divider my="lg" />

              <Stack gap="md">
                <Group wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size="lg" radius="md">
                    <IconBuilding size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Department</Text>
                    <Text fw={500} size="sm">{profile?.department?.name || 'Not Assigned'}</Text>
                  </div>
                </Group>
                <Group wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size="lg" radius="md">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Schedule</Text>
                    <Text fw={500} size="sm">{profile?.schedule_name || 'Not Assigned'}</Text>
                  </div>
                </Group>
                <Group wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size="lg" radius="md">
                    <IconId size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">Employee ID</Text>
                    <Text fw={500} size="sm">{profile?.employee_id || '-'}</Text>
                  </div>
                </Group>
                <Group wrap="nowrap">
                  <ThemeIcon variant="light" color="gray" size="lg" radius="md">
                    <IconUser size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">ZK User ID</Text>
                    <Text fw={500} size="sm">{profile?.zk_user_id || '-'}</Text>
                  </div>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          {/* Right Column: Details & Settings */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <UniversalTabs defaultValue="details">
              <UniversalTabs.List mb="md">
                <UniversalTabs.Tab value="details" leftSection={<IconUser size={16} />}>
                  Personal Details
                </UniversalTabs.Tab>
                <UniversalTabs.Tab value="security" leftSection={<IconLock size={16} />}>
                  Security
                </UniversalTabs.Tab>
              </UniversalTabs.List>

              <UniversalTabs.Panel value="details">
                <Card withBorder radius="lg" p="xl" shadow="sm">
                  <Group justify="space-between" mb="lg">
                    <div>
                      <Title order={4}>Contact Information</Title>
                      <Text size="sm" c="dimmed">Update your contact details and birthday</Text>
                    </div>
                    {!isEditing && (
                      <Button variant="light" leftSection={<IconEdit size={16} />} onClick={() => setIsEditing(true)}>
                        Edit Details
                      </Button>
                    )}
                  </Group>

                  <ProfileFormFields
                    profile={profile}
                    formValues={formValues}
                    onChange={setFormValues}
                    isEditing={isEditing}
                    showReadOnlyFields={false}
                  />

                  {isEditing && (
                    <Group justify="flex-end" mt="xl">
                      <Button variant="default" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button loading={saving} onClick={handleSaveProfile}>
                        Save Changes
                      </Button>
                    </Group>
                  )}
                </Card>
              </UniversalTabs.Panel>

              <UniversalTabs.Panel value="security">
                <Card withBorder radius="lg" p="xl" shadow="sm">
                  <Stack gap="md">
                    <div>
                      <Title order={4}>Password & Security</Title>
                      <Text size="sm" c="dimmed">Manage your password and account security preferences</Text>
                    </div>

                    <Divider />

                    <Group justify="space-between" align="center">
                      <div>
                        <Text fw={500}>Login Password</Text>
                        <Text size="sm" c="dimmed">Change your password regularly to keep your account secure</Text>
                      </div>
                      <Button
                        variant="light"
                        color="blue"
                        leftSection={<IconLock size={16} />}
                        onClick={() => setChangePasswordOpen(true)}
                      >
                        Change Password
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              </UniversalTabs.Panel>
            </UniversalTabs>
          </Grid.Col>
        </Grid>
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



