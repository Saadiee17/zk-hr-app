'use client'

import { useState } from 'react'
import { Modal, Stack, PasswordInput, Group, Button } from '@mantine/core'

/**
 * PasswordChangeModal - Reusable modal component for changing passwords
 * @param {Object} props
 * @param {boolean} opened - Whether modal is open
 * @param {Function} onClose - Callback when modal is closed
 * @param {Function} onSubmit - Callback when form is submitted (receives { currentPassword, newPassword, confirmPassword })
 * @param {boolean} loading - Loading state
 */
export function PasswordChangeModal({
  opened,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) {
      return // Validation should be handled by parent
    }
    onSubmit({ currentPassword, newPassword, confirmPassword })
  }

  const handleClose = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
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
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Change Password
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

