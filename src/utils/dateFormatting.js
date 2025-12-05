/**
 * Format timestamp to 12-hour Pakistan timezone display format
 * Pakistan is UTC+5, so we add 5 hours to UTC for display
 * Example: 2025-11-04T21:24:02Z → 11/05/2025, 02:24:02 AM
 * @param {string|Date} timestamp - ISO timestamp or Date object (stored as UTC)
 * @returns {string} Formatted time in 12-hour AM/PM format (Pakistan time)
 */
export const formatUTC12Hour = (timestamp) => {
  if (!timestamp) return 'N/A'

  try {
    const date = new Date(timestamp)
    // Add 5 hours (Pakistan UTC+5) to display in local time
    const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)

    return pakistaniDate.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'UTC' // Use UTC since we manually added the offset
    })
  } catch (error) {
    console.error('Date formatting error:', error, timestamp)
    return 'Invalid Date'
  }
}

/**
 * Format only the time portion in 12-hour format (Pakistan time)
 * Example: 2025-11-04T21:24:02Z → 02:24:02 AM
 * @param {string|Date} timestamp - ISO timestamp or Date object (stored as UTC)
 * @returns {string} Formatted time in 12-hour AM/PM format (Pakistan time)
 */
export const formatUTC12HourTime = (timestamp) => {
  if (!timestamp) return 'N/A'

  try {
    const date = new Date(timestamp)
    // Add 5 hours (Pakistan UTC+5) to display in local time
    const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)

    return pakistaniDate.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'UTC' // Use UTC since we manually added the offset
    })
  } catch (error) {
    console.error('Time formatting error:', error, timestamp)
    return 'Invalid Time'
  }
}

/**
 * Format date only (Pakistan timezone)
 * Example: 2025-11-04T21:24:02Z → 11/05/2025 (day in Pakistan time)
 * @param {string|Date} timestamp - ISO timestamp or Date object (stored as UTC)
 * @returns {string} Formatted date (Pakistan timezone)
 */
export const formatUTCDate = (timestamp) => {
  if (!timestamp) return 'N/A'

  try {
    const date = new Date(timestamp)
    // Add 5 hours (Pakistan UTC+5) to get the correct date
    const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)

    return pakistaniDate.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC' // Use UTC since we manually added the offset
    })
  } catch (error) {
    console.error('Date formatting error:', error, timestamp)
    return 'Invalid Date'
  }
}

/**
 * Format date to friendly format "DD MMM YYYY"
 * Example: 2025-12-06 → 06 Dec 2025
 * @param {string|Date} dateStr - Date string or object
 * @returns {string} Formatted date
 */
export const formatDateFriendly = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
