'use client'

import { Badge } from '@mantine/core'

/**
 * LeaveStatusBadge - Reusable component for displaying leave request status with consistent styling.
 * @param {string} status - The leave status string (e.g., 'pending', 'approved', 'rejected', 'cancelled').
 * @param {string} variant - Badge variant (default: 'light').
 */
export function LeaveStatusBadge({ status, variant = 'light', ...props }) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'yellow'
      case 'approved': return 'green'
      case 'rejected': return 'red'
      case 'cancelled': return 'gray'
      default: return 'gray'
    }
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <Badge
      color={getStatusColor(status)}
      variant={variant}
      {...props}
    >
      {formatStatus(status)}
    </Badge>
  )
}



