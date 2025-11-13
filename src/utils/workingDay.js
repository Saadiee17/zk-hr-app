/**
 * Working Day Utility Functions
 * 
 * A working day spans from a configurable start time (e.g., 10:00 AM) 
 * to 9:59:59 AM the next calendar day.
 * 
 * This helps with:
 * - Determining if someone is "absent" vs "shift not started"
 * - Handling overnight shifts that cross midnight
 * - Clearer day boundaries for attendance calculations
 */

/**
 * Get the current working day date string (YYYY-MM-DD format)
 * @param {Date} now - Current time (defaults to new Date())
 * @param {string} workingDayStartTime - Working day start time in HH:MM format (e.g., "10:00")
 * @returns {string} - Working day date string (YYYY-MM-DD)
 */
export function getCurrentWorkingDay(now = new Date(), workingDayStartTime = '10:00') {
  const pakistanOffsetMs = 5 * 60 * 60 * 1000 // UTC+5
  const pakistanNow = new Date(now.getTime() + pakistanOffsetMs)
  
  // Parse working day start time (e.g., "10:00" -> { hour: 10, minute: 0 })
  const [startHour, startMinute] = workingDayStartTime.split(':').map(Number)
  const startHourMs = startHour * 60 * 60 * 1000
  const startMinuteMs = startMinute * 60 * 1000
  const workingDayStartMs = startHourMs + startMinuteMs
  
  // Get today's date at midnight (Pakistan time)
  const todayMidnight = new Date(pakistanNow)
  todayMidnight.setUTCHours(0, 0, 0, 0)
  
  // Calculate working day start time for today
  const todayWorkingDayStart = new Date(todayMidnight.getTime() + workingDayStartMs)
  
  // If current time is before today's working day start, we're still in yesterday's working day
  if (pakistanNow < todayWorkingDayStart) {
    // We're still in yesterday's working day
    const yesterday = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000)
    return yesterday.toISOString().slice(0, 10)
  }
  
  // We're in today's working day
  return todayMidnight.toISOString().slice(0, 10)
}

/**
 * Get the working day start time for a given date
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} workingDayStartTime - Working day start time in HH:MM format (e.g., "10:00")
 * @returns {Date} - Working day start time as a Date object
 */
export function getWorkingDayStart(dateStr, workingDayStartTime = '10:00') {
  const [startHour, startMinute] = workingDayStartTime.split(':').map(Number)
  const date = new Date(dateStr + 'T00:00:00Z') // UTC midnight
  const pakistanOffsetMs = 5 * 60 * 60 * 1000 // UTC+5
  
  // Convert to Pakistan time and set working day start
  const pakistanDate = new Date(date.getTime() + pakistanOffsetMs)
  pakistanDate.setUTCHours(startHour, startMinute, 0, 0)
  
  // Convert back to UTC
  return new Date(pakistanDate.getTime() - pakistanOffsetMs)
}

/**
 * Get the working day end time for a given date (9:59:59 AM next day)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} workingDayStartTime - Working day start time in HH:MM format (e.g., "10:00")
 * @returns {Date} - Working day end time as a Date object
 */
export function getWorkingDayEnd(dateStr, workingDayStartTime = '10:00') {
  // Working day ends 1 minute before the next working day starts
  const nextDay = new Date(dateStr + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  
  const [startHour, startMinute] = workingDayStartTime.split(':').map(Number)
  const pakistanOffsetMs = 5 * 60 * 60 * 1000 // UTC+5
  
  // Convert to Pakistan time and set to 9:59:59 AM
  const pakistanDate = new Date(nextDay.getTime() + pakistanOffsetMs)
  pakistanDate.setUTCHours(startHour - 1, 59, 59, 999) // 1 minute before working day start
  
  // Convert back to UTC
  return new Date(pakistanDate.getTime() - pakistanOffsetMs)
}

/**
 * Check if a given time is within a working day
 * @param {Date} time - Time to check
 * @param {string} workingDayDateStr - Working day date string (YYYY-MM-DD)
 * @param {string} workingDayStartTime - Working day start time in HH:MM format (e.g., "10:00")
 * @returns {boolean} - True if time is within the working day
 */
export function isWithinWorkingDay(time, workingDayDateStr, workingDayStartTime = '10:00') {
  const start = getWorkingDayStart(workingDayDateStr, workingDayStartTime)
  const end = getWorkingDayEnd(workingDayDateStr, workingDayStartTime)
  return time >= start && time <= end
}





