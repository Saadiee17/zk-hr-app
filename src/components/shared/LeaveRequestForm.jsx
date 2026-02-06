'use client'

import { useState, useEffect } from 'react'
import { Stack, Select, Textarea, Text, Group, Button } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { toYMD } from '@/utils/attendanceUtils'

/**
 * LeaveRequestForm - Reusable form component for creating/editing leave requests
 * @param {Object} props
 * @param {Array} leaveTypes - Array of leave type objects with id and name
 * @param {Array} employees - Array of employee objects (optional, for admin view)
 * @param {Object} initialValues - Initial form values (optional)
 * @param {Function} onSubmit - Callback when form is submitted
 * @param {Function} onCancel - Callback when form is cancelled
 * @param {boolean} loading - Loading state
 * @param {boolean} showEmployeeSelect - Whether to show employee select (for admin)
 * @param {string} employeeId - Pre-selected employee ID (for employee view)
 */
export function LeaveRequestForm({
  leaveTypes = [],
  employees = [],
  initialValues = null,
  onSubmit,
  onCancel,
  loading = false,
  showEmployeeSelect = false,
  employeeId = null,
}) {
  const [selectedLeaveType, setSelectedLeaveType] = useState(initialValues?.leave_type_id || null)
  const [startDate, setStartDate] = useState(initialValues?.start_date ? new Date(initialValues.start_date) : null)
  const [endDate, setEndDate] = useState(initialValues?.end_date ? new Date(initialValues.end_date) : null)
  const [reason, setReason] = useState(initialValues?.reason || '')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialValues?.employee_id || employeeId || null)

  const [prevInitialValues, setPrevInitialValues] = useState(initialValues)
  const [prevEmployeeId, setPrevEmployeeId] = useState(employeeId)

  if (initialValues !== prevInitialValues || employeeId !== prevEmployeeId) {
    setPrevInitialValues(initialValues)
    setPrevEmployeeId(employeeId)
    setSelectedLeaveType(initialValues?.leave_type_id || null)
    setStartDate(initialValues?.start_date ? new Date(initialValues.start_date) : null)
    setEndDate(initialValues?.end_date ? new Date(initialValues.end_date) : null)
    setReason(initialValues?.reason || '')
    setSelectedEmployeeId(initialValues?.employee_id || employeeId || null)
  }


  const leaveTypeOptions = leaveTypes
    .filter(t => t.is_active !== false)
    .map(t => ({ value: t.id, label: t.name }))

  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id,
  }))

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmit = () => {
    if (!selectedLeaveType || !startDate || !endDate) {
      return
    }
    if (showEmployeeSelect && !selectedEmployeeId) {
      return
    }

    onSubmit({
      employee_id: selectedEmployeeId || employeeId,
      leave_type_id: selectedLeaveType,
      start_date: toYMD(startDate),
      end_date: toYMD(endDate),
      reason: reason || null,
    })
  }

  return (
    <Stack gap="md">
      {showEmployeeSelect && (
        <Select
          label="Employee"
          placeholder="Select employee"
          data={employeeOptions}
          value={selectedEmployeeId}
          onChange={setSelectedEmployeeId}
          required
          searchable
        />
      )}

      <Select
        label="Leave Type"
        placeholder="Select leave type"
        data={leaveTypeOptions}
        value={selectedLeaveType}
        onChange={setSelectedLeaveType}
        required
      />

      <DatePickerInput
        label="Start Date"
        placeholder="Pick start date"
        value={startDate}
        onChange={setStartDate}
        required
        minDate={new Date()}
      />

      <DatePickerInput
        label="End Date"
        placeholder="Pick end date"
        value={endDate}
        onChange={setEndDate}
        required
        minDate={startDate || new Date()}
      />

      <Textarea
        label="Reason"
        placeholder="Enter reason for leave (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />

      {startDate && endDate && (
        <Text size="sm" c="dimmed">
          Total days: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
        </Text>
      )}

      <Group justify="flex-end">
        {onCancel && (
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} loading={loading}>
          {initialValues ? 'Update Request' : 'Submit Request'}
        </Button>
      </Group>
    </Stack>
  )
}

