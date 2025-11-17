'use client'

import { Grid, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconUser } from '@tabler/icons-react'

/**
 * ProfileFormFields - Reusable form fields component for employee profile editing
 * @param {Object} props
 * @param {Object} profile - Profile object with employee data
 * @param {Object} formValues - Current form values (phone, email, address, birthday)
 * @param {Function} onChange - Callback when form values change
 * @param {boolean} isEditing - Whether fields are editable
 * @param {boolean} showReadOnlyFields - Whether to show read-only fields (default: true)
 */
export function ProfileFormFields({
  profile,
  formValues,
  onChange,
  isEditing = false,
  showReadOnlyFields = true,
}) {
  const { phone, email, address, birthday } = formValues

  return (
    <Grid>
      {showReadOnlyFields && (
        <>
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
        </>
      )}

      {/* Editable fields */}
      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label="Phone"
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => onChange({ ...formValues, phone: e.target.value })}
          disabled={!isEditing}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 6 }}>
        <TextInput
          label="Email"
          placeholder="Enter email address"
          type="email"
          value={email}
          onChange={(e) => onChange({ ...formValues, email: e.target.value })}
          disabled={!isEditing}
        />
      </Grid.Col>

      <Grid.Col span={12}>
        <TextInput
          label="Address"
          placeholder="Enter your address"
          value={address}
          onChange={(e) => onChange({ ...formValues, address: e.target.value })}
          disabled={!isEditing}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, sm: 6 }}>
        <DateInput
          label="Birthday"
          placeholder="Select birthday"
          value={birthday}
          onChange={(date) => onChange({ ...formValues, birthday: date })}
          disabled={!isEditing}
          clearable
        />
      </Grid.Col>
    </Grid>
  )
}

