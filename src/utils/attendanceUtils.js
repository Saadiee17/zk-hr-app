/**
 * Utility functions for attendance-related formatting and status handling
 */

/**
 * Convert decimal hours to "Xh Ym" format
 * @param {number} decimalHours - Hours as a decimal number (e.g., 8.5)
 * @returns {string} Formatted string (e.g., "8h 30m" or "8h")
 */
export const formatHoursMinutes = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0h'
  const hours = Math.floor(decimalHours)
  const minutes = Math.round((decimalHours - hours) * 60)
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

/**
 * Format date string with day name
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {object} Object with dayName and dateStr properties
 */
export const formatDateWithDay = (dateStr) => {
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[pakistaniDate.getUTCDay()]
    const month = String(pakistaniDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(pakistaniDate.getUTCDate()).padStart(2, '0')
    const year = pakistaniDate.getUTCFullYear()
    return { dayName, dateStr: `${month}/${day}/${year}` }
  } catch (e) {
    return { dayName: '', dateStr: dateStr }
  }
}

/**
 * Convert date to YYYY-MM-DD format using local timezone (not UTC)
 * This prevents timezone shifts that can cause dates to appear as previous day
 * @param {Date|string} d - Date object or date string
 * @returns {string} Date in YYYY-MM-DD format
 */
export const toYMD = (d) => {
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get badge color for attendance status
 * @param {string} status - Attendance status
 * @returns {string} Mantine color name
 */
export const getStatusColor = (status) => {
  if (!status) return 'gray'

  const statusColorMap = {
    'On-Time': 'green',
    'Late-In': 'orange',
    'Present': 'blue',
    'On Leave': 'violet',
    'Half Day': 'yellow',
    'Out of Schedule': 'grape',
    'Punch Out Missing': 'red',
    'Absent': 'red',
  }

  return statusColorMap[status] || 'gray'
}

/**
 * Generate status filter options from report rows
 * @param {Array} reportRows - Array of report row objects with status property
 * @returns {Array} Array of {value, label} objects for Select component
 */
export const getStatusOptions = (reportRows) => {
  if (!reportRows || reportRows.length === 0) {
    return [{ value: '', label: 'All Statuses' }]
  }

  const statuses = [...new Set(reportRows.map(r => r.status).filter(Boolean))]
  return [
    { value: '', label: 'All Statuses' },
    ...statuses.map(s => ({ value: s, label: s }))
  ]
}

/**
 * Get current date/time in Pakistan (UTC+5)
 * @returns {Date} Pakistan time as a Date object
 */
export const getPakistanNow = () => {
  const now = new Date()
  const pakistanOffset = 5 * 60 * 60 * 1000 // UTC+5
  return new Date(now.getTime() + pakistanOffset)
}

/**
 * Determine the effective working day date string (YYYY-MM-DD)
 * 
 * If working day is enabled, it checks if current time is before the start time.
 * Example: If start time is 09:00 AM and it is 02:00 AM Tuesday, the effective day is Monday.
 * 
 * @param {boolean} enabled - Whether working day concept is enabled
 * @param {string} startTime - HH:MM start time (e.g. "09:00")
 * @returns {string} YYYY-MM-DD date string
 */
export const getEffectiveWorkingDayDate = (enabled, startTime = '09:00') => {
  const pakNow = getPakistanNow()
  const dateStr = pakNow.toISOString().slice(0, 10)

  if (!enabled) return dateStr

  const [startHour, startMinute] = startTime.split(':').map(Number)
  const currentHour = pakNow.getUTCHours()
  const currentMinute = pakNow.getUTCMinutes()
  const currentTimeMinutes = currentHour * 60 + currentMinute
  const workingDayStartMinutes = startHour * 60 + startMinute

  if (currentTimeMinutes < workingDayStartMinutes) {
    // We are still in the previous working day
    const yesterday = new Date(pakNow)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }

  return dateStr
}

/**
 * Format employee name from employee object
 * @param {Object|string} employee - Employee object with first_name, last_name, employee_id, or a string
 * @returns {string} Formatted employee name or fallback
 */
export const formatEmployeeName = (employee) => {
  if (!employee) return '-'
  if (typeof employee === 'string') return employee
  const firstName = employee.first_name || ''
  const lastName = employee.last_name || ''
  const fullName = `${firstName} ${lastName}`.trim()
  return fullName || employee.employee_id || '-'
}

