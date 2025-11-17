'use client'

import { Badge } from '@mantine/core'
import { getStatusColor } from '@/utils/attendanceUtils'

/**
 * StatusBadge - Reusable status badge component with consistent color mapping
 * @param {string} status - Attendance status
 * @param {string} variant - Badge variant (default: 'light')
 * @param {object} props - Additional props to pass to Badge component
 */
export function StatusBadge({ status, variant = 'light', ...props }) {
  return (
    <Badge
      color={getStatusColor(status)}
      variant={variant}
      {...props}
    >
      {status || 'Unknown'}
    </Badge>
  )
}


