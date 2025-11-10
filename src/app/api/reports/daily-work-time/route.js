import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

// Helpers
const parseHHMM = (hhmm) => {
  const h = Number(hhmm.slice(0, 2)) || 0
  const m = Number(hhmm.slice(2, 4)) || 0
  return { h, m }
}

const segmentFromTz = (tzString, weekday) => {
  if (!tzString || tzString.length < 56) return null
  const start = weekday * 8
  const seg = tzString.slice(start, start + 8)
  return seg
}

// Construct a Date at given UTC HH:MM on the provided UTC date (avoid local tz skew)
const isoAt = (dateObj, { h, m }) => {
  const d = new Date(dateObj)
  d.setUTCHours(Number(h) || 0, Number(m) || 0, 0, 0)
  return d
}

const addMinutes = (dateObj, minutes) => {
  const d = new Date(dateObj)
  d.setMinutes(d.getMinutes() + (Number(minutes) || 0))
  return d
}

const durationHours = (ms) => Math.max(0, Math.round((ms / 36e5) * 100) / 100)

// NEW: Convert UTC timestamp to Pakistan date string (YYYY-MM-DD)
// Pakistan is UTC+5, so we add 5 hours to the UTC time
const getDateInPakistanTz = (timestamp) => {
  const d = new Date(timestamp.getTime() + 5 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

// NEW: Get working day date string for a given timestamp
// If working day is enabled, returns the working day date (e.g., 10 AM Nov 5 → 9:59 AM Nov 6 = Nov 5)
// Otherwise, returns the calendar date
const getWorkingDayForTimestamp = (timestamp, workingDayEnabled, workingDayStartTime) => {
  if (!workingDayEnabled) {
    return getDateInPakistanTz(timestamp)
  }
  
  // Parse working day start time (e.g., "10:00" -> { hour: 10, minute: 0 })
  const [startHour, startMinute] = workingDayStartTime.split(':').map(Number)
  const pakistanOffsetMs = 5 * 60 * 60 * 1000 // UTC+5
  
  // Convert timestamp to Pakistan time
  const pakistanTime = new Date(timestamp.getTime() + pakistanOffsetMs)
  
  // Get the calendar date in Pakistan timezone (YYYY-MM-DD)
  const pakistanDateStr = pakistanTime.toISOString().slice(0, 10)
  
  // Create a date object for today at midnight UTC, then convert to Pakistan time
  const todayUTC = new Date(pakistanDateStr + 'T00:00:00Z')
  const todayPakistan = new Date(todayUTC.getTime() + pakistanOffsetMs)
  
  // Set working day start time (e.g., 10:00 AM) for today in Pakistan time
  todayPakistan.setUTCHours(startHour, startMinute, 0, 0)
  
  // Convert back to UTC for comparison
  const workingDayStartUTC = new Date(todayPakistan.getTime() - pakistanOffsetMs)
  
  // If timestamp is before today's working day start, we're still in yesterday's working day
  if (timestamp < workingDayStartUTC) {
    const yesterdayUTC = new Date(todayUTC)
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1)
    return yesterdayUTC.toISOString().slice(0, 10)
  }
  
  // We're in today's working day
  return pakistanDateStr
}

// NEW: Parse schedule segment and get expected shift times
const getExpectedShift = (seg) => {
  if (!seg || seg.length !== 8) return null
  const startHHMM = seg.slice(0, 4)
  const endHHMM = seg.slice(4, 8)
  
  // Non-working day check
  if (startHHMM === '0000' && endHHMM === '2359') {
    return null // Day off
  }
  
  return {
    startHHMM,
    endHHMM,
    crossesMidnight: parseHHMM(startHHMM).h * 60 + parseHHMM(startHHMM).m > parseHHMM(endHHMM).h * 60 + parseHHMM(endHHMM).m,
  }
}

// NEW: Match punches to scheduled shifts (with proper overnight shift handling)
// If workingDayEnabled is true, uses working day boundaries instead of calendar dates
// schedule can be a single tz_string or an array of tz_strings (for multiple schedules)
const matchPunchesToShifts = async (allLogs, startDate, endDate, schedule, graceMinutes, workingDayEnabled = false, workingDayStartTime = '10:00') => {
  const dayMs = 24 * 60 * 60 * 1000
  const results = []
  
  // Sort all logs by time
  const sortedLogs = [...allLogs].sort((a, b) => a.t - b.t)
  
  if (sortedLogs.length === 0) {
    return results
  }
  
  // Build a map of scheduled working days by UTC date
  // This defines the shift windows (SOURCE OF TRUTH for timing)
  // CRITICAL FIX: Start one day BEFORE the requested range to capture overnight shifts
  // that may have started on the previous day (e.g., Oct 22 shift ending Oct 23)
  // 
  // CRITICAL NOTE: The tz_string times are in PAKISTAN LOCAL TIME (UTC+5)
  // We need to convert them to UTC for matching against UTC punch timestamps
  const PAKISTAN_OFFSET_HOURS = 5
  
  const scheduledDaysByUTCDate = new Map() // utc-date -> shift info (with schedule source)
  const scheduleStart = new Date(startDate.getTime() - dayMs) // One day before startDate
  
  // Handle multiple schedules: schedule can be { tz_string } or { tz_strings: [...] }
  const tzStrings = schedule.tz_strings || (schedule.tz_string ? [schedule.tz_string] : [])
  
  if (tzStrings.length === 0) {
    return results
  }
  
  // Build shifts for ALL assigned schedules
  for (let d = new Date(scheduleStart); d <= endDate; d = new Date(d.getTime() + dayMs)) {
    const weekday = d.getUTCDay()
    
    // Check each assigned schedule for this day
    for (const tzString of tzStrings) {
      const seg = segmentFromTz(tzString, weekday)
    const shift = getExpectedShift(seg)
    
    // IMPORTANT: Even if shift is null (day off), we still want to track the date
    // so that if employee punches in on their day off, we can mark them as present
    const isDayOff = !shift
    
    if (shift || isDayOff) {
      // For day off, use full 24-hour range to catch any punches
      const shiftToUse = shift || {
        startHHMM: '0000',
        endHHMM: '2359',
        crossesMidnight: false
      }
      
      // Convert Pakistan local times to UTC times for matching
      // e.g., 20:00 Pakistan (8 PM) → 15:00 UTC
      const startHour = parseInt(shiftToUse.startHHMM.slice(0, 2))
      const startMin = parseInt(shiftToUse.startHHMM.slice(2, 4))
      const endHour = parseInt(shiftToUse.endHHMM.slice(0, 2))
      const endMin = parseInt(shiftToUse.endHHMM.slice(2, 4))
      
      // Convert to UTC by subtracting Pakistan offset
        // For overnight shifts, we need to be careful about day boundaries
      let utcStartHour = startHour - PAKISTAN_OFFSET_HOURS
      let utcEndHour = endHour - PAKISTAN_OFFSET_HOURS
        let utcStartDayOffset = 0
        let utcEndDayOffset = 0
        
        // Handle negative hours (wrap to previous day for start, next day for end if overnight)
        if (utcStartHour < 0) {
          utcStartHour += 24
          utcStartDayOffset = -1 // Start is on previous UTC day
        }
        if (utcEndHour < 0) {
          utcEndHour += 24
          utcEndDayOffset = 1 // End is on next UTC day (for overnight shifts)
        }
        
        // For overnight shifts, end is always on next day
        if (shiftToUse.crossesMidnight) {
          utcEndDayOffset = 1
        }
      
      // Reconstruct HHMM strings in UTC
      const utcStartHHMM = String(utcStartHour).padStart(2, '0') + String(startMin).padStart(2, '0')
      const utcEndHHMM = String(utcEndHour).padStart(2, '0') + String(endMin).padStart(2, '0')
      
      // Update shift object with UTC times
      const utcShift = {
        ...shiftToUse,
        startHHMM: utcStartHHMM,
        endHHMM: utcEndHHMM
      }
      
        // Calculate actual UTC date for shift start (accounting for day offset)
        const utcStartDate = new Date(d)
        utcStartDate.setUTCDate(utcStartDate.getUTCDate() + utcStartDayOffset)
        const utcDateStr = utcStartDate.toISOString().slice(0, 10)
        
        // CRITICAL FIX: When working day is enabled, use working day date for grouping
        // This ensures shifts are assigned to the correct working day, not calendar date
        // Example: A shift starting at Nov 7 5 PM belongs to Nov 7 working day (10 AM - 9:59 AM next day)
        // even if it ends after midnight (Nov 8 2 AM)
        // 
        // BUG FIX: We must use the ACTUAL shift start time, not midnight!
        // Create a timestamp for the actual shift start (not just the date at 00:00)
        const actualShiftStartUTC = new Date(utcStartDate)
        actualShiftStartUTC.setUTCHours(parseInt(utcStartHHMM.slice(0, 2)), parseInt(utcStartHHMM.slice(2, 4)), 0, 0)
        
        const groupingDate = workingDayEnabled 
          ? getWorkingDayForTimestamp(actualShiftStartUTC, workingDayEnabled, workingDayStartTime)
          : utcDateStr
        
        // DEBUG: Log the grouping calculation
        if (workingDayEnabled) {
          console.log(`[daily-work-time] Working day calculation for shift:`, {
            utcDate: utcDateStr,
            shiftStartUTC: actualShiftStartUTC.toISOString(),
            shiftStartPakistan: new Date(actualShiftStartUTC.getTime() + 5*60*60*1000).toISOString(),
            groupingDate: groupingDate,
            pakistanHHMM: shiftToUse.startHHMM
          })
        }
        
        const shiftKey = `${groupingDate}-${tzString}` // Unique key per date-schedule combination
        
        // Store ALL shifts for this date (one per schedule)
        // Use shiftKey to allow multiple shifts per date from different schedules
        if (!scheduledDaysByUTCDate.has(shiftKey)) {
          scheduledDaysByUTCDate.set(shiftKey, {
        shift: utcShift,
            utcDate: utcStartDate, // Use the actual UTC start date
        is_half_day: false, // Regular shifts are not half days
        is_day_off: isDayOff, // Track if this was a scheduled day off
            tz_string: tzString, // Track which schedule this shift belongs to
            dateKey: groupingDate, // FIXED: Use working day date for grouping
            utcEndDayOffset: utcEndDayOffset, // Track end day offset for proper window calculation
      })
          const shiftDesc = isDayOff ? 'DAY OFF (will track punches if any)' : `Pakistan ${shiftToUse.startHHMM}-${shiftToUse.endHHMM} → UTC ${utcStartHHMM}-${utcEndHHMM}`
          console.log(`[daily-work-time] Shift ${utcDateStr} (${tzString}): ${shiftDesc} (UTC date: ${utcDateStr}, Working Day: ${groupingDate}, end offset: ${utcEndDayOffset} days)`)
        }
      }
    }
  }

  // >> NEW: Fetch schedule exceptions and overwrite the default schedule <<
  // Note: date in schedule_exceptions is stored as calendar date (YYYY-MM-DD), not UTC
  // We need to query using calendar dates that cover the UTC date range
  const startDateStr = startDate.toISOString().slice(0, 10)
  const endDateStr = endDate.toISOString().slice(0, 10)
  
  console.log(`[daily-work-time] Fetching schedule exceptions for employee ${schedule.employee_id} from ${startDateStr} to ${endDateStr}`)
  
  const { data: exceptions, error: exErr } = await supabase
    .from('schedule_exceptions')
    .select('date, start_time, end_time, is_day_off, is_half_day')
    .eq('employee_id', schedule.employee_id)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (exErr) {
    console.error('[daily-work-time] Error fetching schedule exceptions:', exErr)
  } else if (exceptions && exceptions.length > 0) {
    console.log(`[daily-work-time] Found ${exceptions.length} schedule exceptions:`, exceptions.map(ex => ({ date: ex.date, is_half_day: ex.is_half_day, is_day_off: ex.is_day_off })))
    for (const ex of exceptions) {
      // The date in schedule_exceptions is a calendar date (YYYY-MM-DD), treat it as such
      const utcDate = new Date(`${ex.date}T00:00:00Z`)
      const utcDateStr = utcDate.toISOString().slice(0, 10)

      if (ex.is_day_off) {
        // If it's a day off, remove ALL shifts for this date from ALL schedules
        for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
          if (shiftInfo.dateKey === utcDateStr) {
            scheduledDaysByUTCDate.delete(shiftKey)
          }
        }
        console.log(`[daily-work-time] Applying EXCEPTION: Day Off on ${utcDateStr}`)
      } else if (ex.start_time && ex.end_time) {
        // If it's a custom shift, create a new shift object and overwrite
        const startHHMM = ex.start_time.slice(0, 5).replace(':', '')
        const endHHMM = ex.end_time.slice(0, 5).replace(':', '')
        
        const exceptionShift = {
          startHHMM,
          endHHMM,
          crossesMidnight: parseInt(startHHMM) > parseInt(endHHMM),
        }

        // Convert Pakistan local times to UTC times for matching
        const startHour = parseInt(exceptionShift.startHHMM.slice(0, 2))
        const startMin = parseInt(exceptionShift.startHHMM.slice(2, 4))
        const endHour = parseInt(exceptionShift.endHHMM.slice(0, 2))
        const endMin = parseInt(exceptionShift.endHHMM.slice(2, 4))
        
        let utcStartHour = startHour - PAKISTAN_OFFSET_HOURS
        let utcEndHour = endHour - PAKISTAN_OFFSET_HOURS
        
        if (utcStartHour < 0) utcStartHour += 24
        if (utcEndHour < 0) utcEndHour += 24
        
        const utcStartHHMM = String(utcStartHour).padStart(2, '0') + String(startMin).padStart(2, '0')
        const utcEndHHMM = String(utcEndHour).padStart(2, '0') + String(endMin).padStart(2, '0')
        
        const utcShift = {
          ...exceptionShift,
          startHHMM: utcStartHHMM,
          endHHMM: utcEndHHMM
        }
        
        // For custom shift exceptions, replace ALL shifts for this date with the exception shift
        // First, remove all existing shifts for this date
        for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
          if (shiftInfo.dateKey === utcDateStr) {
            scheduledDaysByUTCDate.delete(shiftKey)
          }
        }
        // Then add the exception shift (use first tz_string as placeholder, exceptions override schedules)
        const exceptionShiftKey = `${utcDateStr}-exception`
        scheduledDaysByUTCDate.set(exceptionShiftKey, {
          shift: utcShift,
          utcDate: utcDate,
          is_half_day: ex.is_half_day || false,
          tz_string: tzStrings[0] || '', // Use first schedule as placeholder
          dateKey: utcDateStr,
        })
        console.log(`[daily-work-time] Applying EXCEPTION: Shift ${startHHMM}-${endHHMM} (Pakistan) on ${utcDateStr}${ex.is_half_day ? ' (HALF DAY)' : ''}`)
      } else if (ex.is_half_day) {
        // If it's marked as half day but no custom times, mark ALL existing shifts for this date as half day
        let found = false
        for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
          if (shiftInfo.dateKey === utcDateStr) {
            scheduledDaysByUTCDate.set(shiftKey, {
              ...shiftInfo,
            is_half_day: true,
          })
            found = true
          }
        }
        if (found) {
          console.log(`[daily-work-time] Applying EXCEPTION: Half Day on ${utcDateStr} (using regular shift times)`)
        } else {
          // Try matching by Pakistan date
          for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
            const shiftPakistanDateStr = getDateInPakistanTz(shiftInfo.utcDate)
            if (shiftPakistanDateStr === ex.date) {
              scheduledDaysByUTCDate.set(shiftKey, {
                ...shiftInfo,
                is_half_day: true,
              })
              console.log(`[daily-work-time] Applying EXCEPTION: Half Day on ${ex.date} (Pakistan) -> ${shiftInfo.dateKey} (UTC) (using regular shift times)`)
              found = true
              break
            }
          }
          if (!found) {
            console.log(`[daily-work-time] WARNING: Half Day exception for ${ex.date} but no matching shift found`)
          }
        }
      }
    }
  }

  // >> NEW: Fetch approved leave requests to mark days as "On Leave" instead of "Absent" <<
  // Query for leaves that overlap with the report period
  // A leave overlaps if: leave.start_date <= report.end_date AND leave.end_date >= report.start_date
  const { data: leaveRequests, error: lrErr } = await supabase
    .from('leave_requests')
    .select('start_date, end_date, status')
    .eq('employee_id', schedule.employee_id)
    .eq('status', 'approved')
    .gte('end_date', startDate.toISOString().slice(0, 10))
    .lte('start_date', endDate.toISOString().slice(0, 10))

  const leaveDates = new Set() // Set of YYYY-MM-DD strings (Pakistan dates)
  
  if (lrErr) {
    console.error('[daily-work-time] Error fetching leave requests:', lrErr)
  } else if (leaveRequests && leaveRequests.length > 0) {
    console.log(`[daily-work-time] Found ${leaveRequests.length} approved leave requests.`)
    for (const lr of leaveRequests) {
      // Dates are stored as YYYY-MM-DD strings (DATE type, calendar dates)
      // Since leave dates are calendar dates (not timestamps), we use them directly
      // Parse the range and add each date
      const start = new Date(lr.start_date + 'T00:00:00Z')
      const end = new Date(lr.end_date + 'T00:00:00Z')
      
      // Add all dates in the leave range (inclusive)
      // Convert each date to Pakistan date string to match how shift dates are displayed
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
        // Convert to Pakistan date string using the same logic as shift dates
        // This ensures consistent matching with pakistanDateStr
        const pakistanDateStr = getDateInPakistanTz(d)
        leaveDates.add(pakistanDateStr)
      }
    }
    console.log(`[daily-work-time] Leave dates: ${Array.from(leaveDates).join(', ')}`)
  }
  
  if (scheduledDaysByUTCDate.size === 0) {
    return results
  }
  
  // Group punches by which shift they belong to
  // Key: UTC date of the shift (not the punch), so late arrivals group with their shift
  // If working day is enabled, we also need to map shifts to working days
  const shiftPunches = new Map() // utc-date -> array of punches
  
  // Map to track which working day each shift belongs to (when working day is enabled)
  const shiftToWorkingDay = new Map() // dateKey -> working-day-date
  
  // Track punches that don't match any scheduled shift (for "Present" status)
  const unmatchedPunches = [] // Array of punches with no shift match
  
  for (const log of sortedLogs) {
    let assignedShiftUTCDate = null
    let bestMatch = null
    let bestScore = -Infinity // Higher score = better match
    
    // Find which shift this punch belongs to by checking ALL shift windows from ALL schedules
    // SIMPLIFIED: Match based on shift windows only, no complex working day logic
    for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
      const shift = shiftInfo.shift
      // Ensure shift has required properties
      if (!shift || typeof shift.startHHMM !== 'string' || typeof shift.endHHMM !== 'string') {
        console.warn(`[daily-work-time] Skipping invalid shift:`, shiftInfo)
        continue
      }
      const startClock = parseHHMM(shift.startHHMM)
      const endClock = parseHHMM(shift.endHHMM)
      
      // Build shift window on THIS UTC date
      let windowStart = isoAt(shiftInfo.utcDate, startClock)
      // For end time, account for day offset if stored, otherwise use crossesMidnight flag
      const endDayOffset = shiftInfo.utcEndDayOffset !== undefined ? shiftInfo.utcEndDayOffset : (shift.crossesMidnight ? 1 : 0)
      let windowEnd = isoAt(new Date(shiftInfo.utcDate.getTime() + endDayOffset * dayMs), endClock)
      
      // Add buffer: 2 hours before start
      const bufferStart = addMinutes(windowStart, -120)
      
      // CRITICAL FIX: When working day is enabled, extend buffer end to working day boundary
      // This ensures late punch-outs within the working day are still matched to the correct shift
      // Example: Night 8-5 shift (11/06 8 PM to 11/07 5 AM) belongs to 11/06 working day
      //          11/06 working day ends at 11/07 10 AM → buffer extends to 11/07 10 AM
      let bufferEnd
      if (workingDayEnabled) {
        // Parse working day start time (e.g., "10:00" -> { hour: 10, minute: 0 })
        const [workingDayHour, workingDayMinute] = workingDayStartTime.split(':').map(Number)
        
        // The buffer should extend to the END of this shift's working day
        // Working day date is in shiftInfo.dateKey (e.g., "2025-11-06")
        // End of 11/06 working day = 10 AM on 11/07 (start of 11/07 working day)
        const workingDayDate = new Date(shiftInfo.dateKey + 'T00:00:00Z')
        const nextDay = new Date(workingDayDate.getTime() + dayMs)
        
        // Calculate working day end in UTC
        // Example: 11/07 10:00 Pakistan = 11/07 05:00 UTC
        const pakistanOffsetMs = 5 * 60 * 60 * 1000
        const workingDayEndPakistan = new Date(nextDay.getTime() + pakistanOffsetMs) // Convert to "Pakistan UTC" (not real Pakistan time, just for calculation)
        workingDayEndPakistan.setUTCHours(workingDayHour, workingDayMinute, 0, 0)
        bufferEnd = new Date(workingDayEndPakistan.getTime() - pakistanOffsetMs) // Convert back to actual UTC
      } else {
        // Default: 10 hours after shift end
        bufferEnd = addMinutes(windowEnd, 600)
      }
      
      // Check if punch is within this shift's window
      if (log.t >= bufferStart && log.t <= bufferEnd) {
        // Score this match:
        // 1. If punch is within the actual shift window (not just buffer), give high priority
        // 2. For overnight shifts, if punch is after midnight but before shift end, prioritize this shift
        // 3. Otherwise, prefer shift with closest start time
        
        const isWithinActualShift = log.t >= windowStart && log.t <= windowEnd
        // For overnight shifts, punches after midnight but before shift end belong to the shift that started the previous day
        // Check if punch is after the shift start and before the shift end (even if it's the next calendar day)
        const isAfterMidnight = shift.crossesMidnight && log.t >= windowStart && log.t < windowEnd
        const distanceToStart = Math.abs(log.t.getTime() - windowStart.getTime())
        
        // SIMPLIFIED SCORING: Based on shift window proximity only
        let score = 0
        if (isWithinActualShift) {
          // Within actual shift window - highest priority
          score = 10000
          if (isAfterMidnight) {
            // For overnight shifts, punches after midnight belong to the shift that started the previous day
            score = 20000
          }
        } else {
          // Within buffer zone - prefer closer punches
          if (shift.crossesMidnight && log.t >= windowStart) {
            // Punch is after shift start for overnight shift
            score = 5000 - (distanceToStart / (60 * 60 * 1000))
          } else if (log.t < windowStart) {
            // Punch is before shift start - very low score
            score = Math.max(0, 100 - (distanceToStart / (60 * 60 * 1000)))
          } else {
            // After shift end
            score = Math.max(0, 100 - (distanceToStart / (60 * 60 * 1000)))
          }
        }
        
        // Use score first, then prefer shift with closest start time for ties
        const isBetterMatch = score > bestScore || 
          (score === bestScore && distanceToStart < Math.abs(log.t.getTime() - (bestMatch ? isoAt(bestMatch.utcDate, parseHHMM(bestMatch.shift.startHHMM)).getTime() : Infinity)))
        
        if (isBetterMatch) {
          bestScore = score
          bestMatch = shiftInfo
          assignedShiftUTCDate = shiftInfo.dateKey // Use dateKey for grouping
        }
      }
    }
    
    if (assignedShiftUTCDate) {
      if (!shiftPunches.has(assignedShiftUTCDate)) {
        shiftPunches.set(assignedShiftUTCDate, [])
      }
      shiftPunches.get(assignedShiftUTCDate).push(log)
      const pakistanPunch = new Date(log.t.getTime() + 5 * 60 * 60 * 1000)
      const pakistanDateStr = pakistanPunch.toISOString().slice(0, 10)
      console.log(`[daily-work-time] Punch at ${new Date(log.t).toISOString()} (${pakistanDateStr} Pakistan) → Shift ${assignedShiftUTCDate} (score: ${bestScore})`)
    } else {
      unmatchedPunches.push(log)
      const pakistanPunch = new Date(log.t.getTime() + 5 * 60 * 60 * 1000)
      const pakistanDateStr = pakistanPunch.toISOString().slice(0, 10)
      console.log(`[daily-work-time] Punch at ${new Date(log.t).toISOString()} (${pakistanDateStr} Pakistan) → NO SHIFT MATCH (checked all ${scheduledDaysByUTCDate.size} shifts)`)
    }
  }
  
  // Keep the shiftToWorkingDay map for compatibility, but always use Pakistan calendar date
  for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
    const dateKey = shiftInfo.dateKey
    if (!shiftToWorkingDay.has(dateKey)) {
      const pakistanDate = getDateInPakistanTz(shiftInfo.utcDate)
      shiftToWorkingDay.set(dateKey, pakistanDate)
      console.log(`[daily-work-time] Shift ${dateKey} → Pakistan Date: ${pakistanDate}`)
    }
  }
  
  // Group shifts by dateKey (since multiple schedules can have shifts on the same date)
  // We'll process one entry per date, using the shift that has punches or the first one
  const shiftsByDate = new Map() // dateKey -> { shiftInfo, punches }
  for (const [shiftKey, shiftInfo] of scheduledDaysByUTCDate) {
    const dateKey = shiftInfo.dateKey
    const punches = shiftPunches.get(dateKey) || []
    
    if (!shiftsByDate.has(dateKey)) {
      shiftsByDate.set(dateKey, { shiftInfo, punches })
    } else {
      // If this shift has punches and the existing one doesn't, prefer this one
      const existing = shiftsByDate.get(dateKey)
      if (punches.length > 0 && existing.punches.length === 0) {
        shiftsByDate.set(dateKey, { shiftInfo, punches })
      }
    }
  }
  
  // Process each shift FIRST (grouped by date, displayed by working day or Pakistan date)
  // This ensures shifts are processed before unmatched punches, avoiding duplicates
  for (const [dateKey, { shiftInfo, punches }] of shiftsByDate) {
    
    // Use Pakistan calendar date for display (simple and predictable)
    const displayDateStr = shiftToWorkingDay.get(dateKey) || getDateInPakistanTz(shiftInfo.utcDate)
    
    // Also get Pakistan date for leave checking (leaves are stored by calendar date)
    const pakistanDateStr = getDateInPakistanTz(shiftInfo.utcDate)
    
    // Check if this date already exists in results (to avoid duplicates)
    const existingIndex = results.findIndex(r => r.date === displayDateStr)
    if (existingIndex >= 0) {
      console.log(`[daily-work-time] WARNING: Date ${displayDateStr} already exists in results, skipping shift ${dateKey}`)
      continue
    }
    
    if (punches.length === 0) {
      // No punches - check if it's a leave day, half day, day off, or absent
      let status = 'Absent'
      if (leaveDates.has(pakistanDateStr)) {
        status = 'On Leave'
      } else if (shiftInfo.is_day_off) {
        // Scheduled day off with no punches - don't mark as absent
        status = 'Day Off'
      } else if (shiftInfo.is_half_day) {
        status = 'Half Day'
      }
      results.push({
        date: displayDateStr,
        inTime: null,
        outTime: null,
        durationHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        status: status,
      })
      if (status === 'On Leave') {
        console.log(`[daily-work-time] Shift ${dateKey} (display as ${displayDateStr}): On Leave`)
      } else if (status === 'Day Off') {
        console.log(`[daily-work-time] Shift ${dateKey} (display as ${displayDateStr}): Day Off (no punches)`)
      } else if (status === 'Half Day') {
        console.log(`[daily-work-time] Shift ${dateKey} (display as ${displayDateStr}): Half Day (no punches)`)
      }
    } else {
      // Sort punches chronologically
      const sortedPunches = punches.sort((a, b) => a.t - b.t)
      
      console.log(`[daily-work-time] Shift ${dateKey}: ${sortedPunches.length} punches:`)
      sortedPunches.forEach((p, idx) => {
        console.log(`  [${idx}] ${new Date(p.t).toISOString()}`)
      })
      
      // Process the shift - use the specific schedule's tz_string for this shift
      const shiftSchedule = { employee_id: schedule.employee_id, tz_string: shiftInfo.tz_string }
      const processedShift = processShift(sortedPunches, shiftInfo.utcDate, shiftSchedule, graceMinutes, leaveDates, pakistanDateStr, shiftInfo.is_half_day || false, shiftInfo.is_day_off || false)
      
      // Use working day date for display if enabled
      processedShift.date = displayDateStr
      
      console.log(`[daily-work-time] Shift ${dateKey} (display as ${displayDateStr}) calculated:`, {
        inTime: processedShift.inTime,
        outTime: processedShift.outTime,
        duration: processedShift.durationHours,
        regular: processedShift.regularHours,
        overtime: processedShift.overtimeHours,
        status: processedShift.status,
      })
      results.push(processedShift)
    }
  }
  
  // Process unmatched punches AFTER shifts - group by working day or calendar date
  // This ensures unmatched punches don't create duplicates with shift entries
  const unmatchedByDate = new Map() // date -> array of punches
  for (const log of unmatchedPunches) {
    // Use working day date if enabled, otherwise use Pakistan calendar date
    const dateStr = workingDayEnabled
      ? getWorkingDayForTimestamp(log.t, workingDayEnabled, workingDayStartTime)
      : getDateInPakistanTz(log.t)
    if (!unmatchedByDate.has(dateStr)) {
      unmatchedByDate.set(dateStr, [])
    }
    unmatchedByDate.get(dateStr).push(log)
  }
  
  // Add "Present" entries for unmatched punches
  for (const [dateStr, punches] of unmatchedByDate) {
    // Sort punches chronologically
    const sortedPunches = punches.sort((a, b) => a.t - b.t)
    const inTime = sortedPunches[0].t
    const outTime = sortedPunches[sortedPunches.length - 1].t
    const duration = outTime - inTime
    const durationHours = duration / (60 * 60 * 1000)
    
    // Check if this date already exists in results (from scheduled shifts)
    const existingIndex = results.findIndex(r => r.date === dateStr)
    
    if (existingIndex >= 0) {
      // If date already exists, this shouldn't happen (all punches should be matched)
      // But if it does, skip creating a duplicate entry
      console.log(`[daily-work-time] WARNING: Unmatched punches for ${dateStr} but date already exists in results, skipping`)
    } else {
      // Add new "Present" entry
      results.push({
        date: dateStr,
        inTime: inTime.toISOString(),
        outTime: outTime.toISOString(),
        durationHours: Math.round(durationHours * 100) / 100,
        regularHours: Math.round(durationHours * 100) / 100,
        overtimeHours: 0,
        status: 'Present',
      })
      console.log(`[daily-work-time] Unmatched punches for ${dateStr}: ${sortedPunches.length} punches → Status: Present`)
    }
  }
  
  return results.sort((a, b) => new Date(a.date) - new Date(b.date))
}

// NEW: Process a shift's punches and calculate hours
// SIMPLIFIED: Use first punch as IN and last punch as OUT if within same shift window
// Note: If punches exist, employee worked (status is On-Time/Late-In), even if on a leave day
// If is_half_day is true, regular hours are halved
// If is_day_off is true, employee worked on scheduled day off
// MAX_SHIFT_DURATION: 12 hours - if time between first and last punch exceeds this, assume forgot to punch out
const MAX_SHIFT_DURATION_HOURS = 12
const processShift = (punches, shiftDate, schedule, graceMinutes, leaveDates, pakistanDateStr, is_half_day = false, is_day_off = false) => {
  if (punches.length === 0) {
    return {
      date: shiftDate.toISOString().slice(0, 10),
      inTime: null,
      outTime: null,
      durationHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      status: 'Absent',
    }
  }
  
  // Sort punches chronologically
  const sortedPunches = punches.sort((a, b) => a.t - b.t)
  
  // Use first and last punch, they should bracket the shift
  // All punches in between are considered part of the same shift (breaks, re-scans, gate access, etc)
  const inTime = sortedPunches[0].t
  const lastPunch = sortedPunches[sortedPunches.length - 1]
  let outTime = lastPunch.t
  
  // FIRST: Determine if employee is still working BEFORE checking duration
  // This is critical for overnight shifts where someone might punch in late and still be working
  // If they're still working, we should NOT mark as "forgot punch out" even if duration > 12 hours
  let isStillWorking = false
  let forgotPunchOut = false
  
  // Helper function to check if shift is still active
  // For overnight shifts, we allow a buffer past shift end (2 hours) to account for overtime
  const checkIfShiftStillActive = () => {
    if (!schedule || !schedule.tz_string) {
      // No schedule - check if last punch was recent
      const now = new Date()
      const timeSinceLastPunch = now.getTime() - lastPunch.t.getTime()
      const maxBreakTime = 3 * 60 * 60 * 1000 // 3 hours
      return timeSinceLastPunch < maxBreakTime
    }
    
    const now = new Date()
    const shiftDateObj = new Date(shiftDate)
    shiftDateObj.setUTCHours(0, 0, 0, 0)
    const weekday = shiftDateObj.getUTCDay()
    const seg = segmentFromTz(schedule.tz_string, weekday)
    const shift = getExpectedShift(seg)
    
    if (!shift) {
      // No shift defined - check if last punch was recent
      const timeSinceLastPunch = now.getTime() - lastPunch.t.getTime()
      const maxBreakTime = 3 * 60 * 60 * 1000 // 3 hours
      return timeSinceLastPunch < maxBreakTime
    }
    
    const endClock = parseHHMM(shift.endHHMM)
    const PAKISTAN_OFFSET_HOURS = 5
    let utcEndHour = endClock.h - PAKISTAN_OFFSET_HOURS
    if (utcEndHour < 0) utcEndHour += 24
    const utcEndClock = { h: utcEndHour, m: endClock.m }
    let expectedEnd = isoAt(shiftDateObj, utcEndClock)
    if (shift.crossesMidnight) {
      expectedEnd = isoAt(new Date(shiftDateObj.getTime() + 24 * 60 * 60 * 1000), utcEndClock)
    }
    
    // Add buffer for overtime (2 hours) - if they're working past shift end but within buffer, still consider them working
    // This handles cases where someone works overtime (e.g., shift ends at 5 AM but they work until 7 AM)
    const overtimeBuffer = 2 * 60 * 60 * 1000 // 2 hours
    const shiftEndWithOvertimeBuffer = new Date(expectedEnd.getTime() + overtimeBuffer)
    
    // Also check if last punch was recent (within 3 hours) - if so, they might still be working
    const timeSinceLastPunch = now.getTime() - lastPunch.t.getTime()
    const maxBreakTime = 3 * 60 * 60 * 1000 // 3 hours
    
    // They're still working if:
    // 1. Current time is before shift end + overtime buffer, OR
    // 2. Last punch was recent (within 3 hours) - they might be on a break or still working
    return now <= shiftEndWithOvertimeBuffer || timeSinceLastPunch < maxBreakTime
  }
  
  if (sortedPunches.length === 1) {
    // Only one punch - check if shift is still active
    isStillWorking = checkIfShiftStillActive()
    // If still working, set outTime to null (they haven't punched out yet)
    if (isStillWorking) {
      outTime = null
    }
    // If not still working, they forgot to punch out
    if (!isStillWorking) {
      forgotPunchOut = true
      outTime = null
    }
  } else if (sortedPunches.length >= 2) {
    // TWO OR MORE PUNCHES = Check if shift is still active
    // CRITICAL: For overnight shifts, if current time is before shift end, they're still working
    // even if duration between first and last punch > 12 hours
    // BUT: If last punch is clearly an OUT punch (after shift end or reasonable duration), shift is complete
    isStillWorking = checkIfShiftStillActive()
    
    // Check if last punch is clearly an OUT punch
    // CRITICAL: We need to be careful - if someone punches near shift end, then punches again,
    // they're still working. The key insight: if we have 2+ punches and the last punch is near/after shift end,
    // it's likely an OUT punch UNLESS current time is still very close to that punch (they might punch again).
    if (schedule && schedule.tz_string) {
      const now = new Date()
      const shiftDateObj = new Date(shiftDate)
      shiftDateObj.setUTCHours(0, 0, 0, 0)
      const weekday = shiftDateObj.getUTCDay()
      const seg = segmentFromTz(schedule.tz_string, weekday)
      const shift = getExpectedShift(seg)
      
      if (shift) {
        const endClock = parseHHMM(shift.endHHMM)
        const PAKISTAN_OFFSET_HOURS = 5
        let utcEndHour = endClock.h - PAKISTAN_OFFSET_HOURS
        if (utcEndHour < 0) utcEndHour += 24
        const utcEndClock = { h: utcEndHour, m: endClock.m }
        let expectedEnd = isoAt(shiftDateObj, utcEndClock)
        if (shift.crossesMidnight) {
          expectedEnd = isoAt(new Date(shiftDateObj.getTime() + 24 * 60 * 60 * 1000), utcEndClock)
        }
        
        const timeToShiftEnd = expectedEnd.getTime() - lastPunch.t.getTime()
        const timeSinceLastPunch = now.getTime() - lastPunch.t.getTime()
        const nearShiftEndThreshold = 2 * 60 * 60 * 1000 // 2 hours
        const recentPunchThreshold = 1 * 60 * 60 * 1000 // 1 hour - if last punch was very recent, they might punch again
        
        // Treat as OUT punch if:
        // 1. Last punch is well AFTER shift end (definitely OUT), OR
        // 2. Last punch is near/after shift end AND it's been a while since that punch (they're not coming back)
        // BUT: If last punch was very recent (< 1 hour), they might still punch again - keep as still working
        if (lastPunch.t > expectedEnd + nearShiftEndThreshold) {
          // Last punch is well after shift end - definitely an OUT punch
          isStillWorking = false
        } else if ((lastPunch.t >= expectedEnd || Math.abs(timeToShiftEnd) <= nearShiftEndThreshold) && timeSinceLastPunch > recentPunchThreshold) {
          // Last punch is at or near shift end AND it's been more than 1 hour since that punch
          // This suggests they've completed their shift and aren't coming back
          isStillWorking = false
        }
        // Otherwise, if last punch was very recent (< 1 hour), they might still be working - keep isStillWorking as determined by checkIfShiftStillActive()
      }
    }
    
    // If shift is still active, they're working - set outTime to null
    // If shift ended, use the actual outTime (last punch)
    if (isStillWorking) {
      // Still working - set outTime to null
      outTime = null
    } else {
      // Shift has ended - check duration to see if they forgot to punch out
      const durationMs = outTime.getTime() - inTime.getTime()
      const durationHoursRaw = durationMs / (60 * 60 * 1000)
      
      // CRITICAL FIX: Only apply the 12-hour max duration check if the last punch is NOT after shift end
      // If the last punch is after shift end (and was matched to this shift), it's a valid OUT punch
      // regardless of duration. This handles cases where someone works overtime or punches out late
      // within the working day boundary (e.g., Night 8-5 shift, punch out at 7 AM within 10 AM working day end)
      let isLastPunchAfterShiftEnd = false
      if (schedule && schedule.tz_string) {
        const shiftDateObj = new Date(shiftDate)
        shiftDateObj.setUTCHours(0, 0, 0, 0)
        const weekday = shiftDateObj.getUTCDay()
        const seg = segmentFromTz(schedule.tz_string, weekday)
        const shift = getExpectedShift(seg)
        
        if (shift) {
          const endClock = parseHHMM(shift.endHHMM)
          const PAKISTAN_OFFSET_HOURS = 5
          let utcEndHour = endClock.h - PAKISTAN_OFFSET_HOURS
          if (utcEndHour < 0) utcEndHour += 24
          const utcEndClock = { h: utcEndHour, m: endClock.m }
          let expectedEnd = isoAt(shiftDateObj, utcEndClock)
          if (shift.crossesMidnight) {
            expectedEnd = isoAt(new Date(shiftDateObj.getTime() + 24 * 60 * 60 * 1000), utcEndClock)
          }
          
          // If last punch is after shift end, it's a legitimate OUT punch
          isLastPunchAfterShiftEnd = lastPunch.t >= expectedEnd
        }
      }
      
      // If duration exceeds maximum AND last punch is not after shift end, they likely forgot to punch out
      if (durationHoursRaw > MAX_SHIFT_DURATION_HOURS && !isLastPunchAfterShiftEnd) {
        forgotPunchOut = true
        outTime = null
      }
      // Otherwise, use the actual outTime (last punch)
    }
  }
  
  // Set outTime to null if still working
  if (isStillWorking) {
    outTime = null
  }
  
  // Calculate duration only if we have both IN and OUT times
  let duration = 0
  let durationHours = 0
  if (outTime) {
    duration = outTime - inTime
    durationHours = duration / (60 * 60 * 1000)
  }
  
  // Use the shiftDate parameter (the assigned shift date) to calculate shift times
  // Don't recalculate from punch time, as punches may be late arrivals/early departures
  const shiftDateObj = new Date(shiftDate)
  shiftDateObj.setUTCHours(0, 0, 0, 0)
  
  // Get the expected shift for the assigned shift date
  // If no schedule provided, return basic "Present" status
  if (!schedule || !schedule.tz_string) {
    return {
      date: shiftDate.toISOString().slice(0, 10),
      inTime: inTime ? inTime.toISOString() : null,
      outTime: forgotPunchOut ? null : (outTime ? outTime.toISOString() : null),
      durationHours: Math.round(durationHours * 100) / 100,
      regularHours: Math.round(durationHours * 100) / 100,
      overtimeHours: 0,
      status: forgotPunchOut ? 'Punch Out Missing' : 'Present',
    }
  }
  
  // If it's a scheduled day off and employee showed up, mark as "Worked on Day Off"
  if (is_day_off) {
    return {
      date: shiftDate.toISOString().slice(0, 10),
      inTime: inTime ? inTime.toISOString() : null,
      outTime: forgotPunchOut ? null : (outTime ? outTime.toISOString() : null),
      durationHours: Math.round(durationHours * 100) / 100,
      regularHours: Math.round(durationHours * 100) / 100,
      overtimeHours: 0,
      status: forgotPunchOut ? 'Punch Out Missing' : 'Worked on Day Off',
    }
  }
  
  const weekday = shiftDateObj.getUTCDay()
  const seg = segmentFromTz(schedule.tz_string, weekday)
  const shift = getExpectedShift(seg)
  
  let status = 'Present'
  let regularHours = durationHours
  let overtimeHours = 0
  
  if (shift) {
    const startClock = parseHHMM(shift.startHHMM)
    const endClock = parseHHMM(shift.endHHMM)
    
    // Convert Pakistan times to UTC times (shift.startHHMM and shift.endHHMM are in Pakistan time)
    const PAKISTAN_OFFSET_HOURS = 5
    let utcStartHour = startClock.h - PAKISTAN_OFFSET_HOURS
    let utcEndHour = endClock.h - PAKISTAN_OFFSET_HOURS
    
    // Handle negative hours (wrap to previous day)
    if (utcStartHour < 0) utcStartHour += 24
    if (utcEndHour < 0) utcEndHour += 24
    
    const utcStartClock = { h: utcStartHour, m: startClock.m }
    const utcEndClock = { h: utcEndHour, m: endClock.m }
    
    // Use shiftDateObj (the assigned shift date) to calculate shift times in UTC
    let expectedStart = isoAt(shiftDateObj, utcStartClock)
    let expectedEnd = isoAt(shiftDateObj, utcEndClock)
    
    if (shift.crossesMidnight) {
      expectedEnd = isoAt(new Date(shiftDateObj.getTime() + 24 * 60 * 60 * 1000), utcEndClock)
    }
    
    // Determine status - check if still working first, then forgot punch out, then half day, then on-time/late-in/out-of-schedule
    // CRITICAL: If still working, status should be On-Time or Late-In, NOT "Punch Out Missing"
    if (isStillWorking) {
      // Still working - determine if on-time or late-in based on first punch
      const onTimeThreshold = addMinutes(expectedStart, graceMinutes)
      if (inTime <= onTimeThreshold) {
        status = 'On-Time'
      } else {
        status = 'Late-In'
      }
    } else if (forgotPunchOut) {
      // Shift ended but they forgot to punch out
      status = 'Punch Out Missing'
    } else if (is_half_day) {
      status = 'Half Day'
    } else {
      // First check if punches are within the ACTUAL shift window (not just buffer)
      // Buffer is only for matching punches to shifts, but for status we check actual shift times
      const actualShiftStart = expectedStart
      const actualShiftEnd = expectedEnd
      
      // Check if first punch is within the actual shift window
      // NOTE: This buffer should be generous to avoid marking valid punches as "Out of Schedule"
      // For now, keep a reasonable buffer of 2 hours before and after
      const strictBufferStart = addMinutes(actualShiftStart, -120)
      const strictBufferEnd = addMinutes(actualShiftEnd, 120)
      
      console.log(`[daily-work-time] Status check for shift ${pakistanDateStr}:`)
      console.log(`  Shift window: ${actualShiftStart.toISOString()} - ${actualShiftEnd.toISOString()}`)
      console.log(`  Buffer window: ${strictBufferStart.toISOString()} - ${strictBufferEnd.toISOString()}`)
      console.log(`  First punch: ${inTime.toISOString()}`)
      
      const isWithinActualShift = inTime >= strictBufferStart && inTime <= strictBufferEnd
      
      console.log(`  Within shift window: ${isWithinActualShift}`)
      
      if (!isWithinActualShift) {
        // Punches are way outside the actual shift window - mark as "Out of Schedule"
        status = 'Out of Schedule'
      } else {
        // Punches are within shift window, check if on-time or late-in
        const onTimeThreshold = addMinutes(expectedStart, graceMinutes)
        
        if (inTime <= onTimeThreshold) {
          status = 'On-Time'
        } else {
          status = 'Late-In'
        }
      }
    }
    
    // Calculate regular vs overtime
    const shiftDuration = expectedEnd - expectedStart
    const scheduledHours = shiftDuration / (60 * 60 * 1000)
    
    // For half days, the scheduled hours are halved
    const effectiveScheduledHours = is_half_day ? scheduledHours / 2 : scheduledHours
    
    if (durationHours <= effectiveScheduledHours) {
      regularHours = durationHours
      overtimeHours = 0
    } else {
      regularHours = effectiveScheduledHours
      overtimeHours = durationHours - effectiveScheduledHours
    }
  }
  
  return {
    date: shiftDate.toISOString().slice(0, 10),
    inTime: inTime ? inTime.toISOString() : null,
    outTime: (isStillWorking || !outTime) ? null : outTime.toISOString(), // Set to null if still working or outTime is null
    durationHours: Math.round(durationHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    status,
  }
}

// GET /api/reports/daily-work-time?employee_id=UUID&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export async function GET(req) {
  try {
    const session = await getSession(req)
    const url = new URL(req.url)
    let employeeId = url.searchParams.get('employee_id')
    const startDateStr = url.searchParams.get('start_date')
    const endDateStr = url.searchParams.get('end_date')

    // Session-based access control: Non-admins can only see their own reports
    if (session && !isAdmin(session)) {
      employeeId = session.employeeId
    }

    if (!employeeId || !startDateStr || !endDateStr) {
      return NextResponse.json({ error: 'employee_id, start_date and end_date are required' }, { status: 400 })
    }

    const startDate = new Date(`${startDateStr}T00:00:00Z`)
    const endDate = new Date(`${endDateStr}T00:00:00Z`)
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    // Fetch employee with ALL individual tz overrides and department
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id, department_id, individual_tz_1, individual_tz_2, individual_tz_3')
      .eq('id', employeeId)
      .maybeSingle()

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })
    if (!emp) return NextResponse.json({ success: true, data: [{ date: startDateStr, durationHours: 0, inTime: null, outTime: null, regularHours: 0, overtimeHours: 0, status: 'Employee Not Found' }] })
    
    // Collect ALL assigned time zone IDs (individual overrides first, then department schedules)
    const assignedTzIds = []
    
    // Add individual time zones (in order of priority)
    if (emp.individual_tz_1) assignedTzIds.push(emp.individual_tz_1)
    if (emp.individual_tz_2) assignedTzIds.push(emp.individual_tz_2)
    if (emp.individual_tz_3) assignedTzIds.push(emp.individual_tz_3)
    
    // If no individual overrides, get department schedules
    if (assignedTzIds.length === 0 && emp.department_id) {
      const { data: sched, error: schedErr } = await supabase
        .from('schedules')
        .select('tz_id_1, tz_id_2, tz_id_3')
        .eq('department_id', emp.department_id)
        .maybeSingle()
      if (!schedErr && sched) {
        if (sched.tz_id_1) assignedTzIds.push(sched.tz_id_1)
        if (sched.tz_id_2) assignedTzIds.push(sched.tz_id_2)
        if (sched.tz_id_3) assignedTzIds.push(sched.tz_id_3)
      }
    }
    
    if (assignedTzIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [{
          date: startDateStr,
          durationHours: 0,
          inTime: null,
          outTime: null,
          regularHours: 0,
          overtimeHours: 0,
          status: 'No Schedule Assigned',
        }]
      })
    }

    // Fetch ALL assigned time zones with their buffer times
    const { data: timeZones, error: tzErr } = await supabase
        .from('time_zones')
      .select('id, tz_string, buffer_time_minutes')
      .in('id', assignedTzIds)

    if (tzErr) return NextResponse.json({ error: tzErr.message }, { status: 500 })
    
    // Create a map of tz_id -> tz_string and buffer_time_minutes
    const tzMap = new Map()
    const tzStrings = []
    let scheduleBufferMinutes = null
    
    if (timeZones && timeZones.length > 0) {
      for (const tz of timeZones) {
        tzMap.set(tz.id, {
          tz_string: tz.tz_string || null,
          buffer_time_minutes: tz.buffer_time_minutes != null ? Number(tz.buffer_time_minutes) : null
        })
        if (tz.tz_string) {
          tzStrings.push(tz.tz_string)
          // Use buffer time from first schedule (or we'll use company default later)
          if (scheduleBufferMinutes === null && tz.buffer_time_minutes != null) {
            scheduleBufferMinutes = Number(tz.buffer_time_minutes)
          }
        }
      }
    }
    
    // For now, use the first time zone string for backward compatibility
    // We'll update matchPunchesToShifts to handle multiple schedules
    const tzString = tzStrings.length > 0 ? tzStrings[0] : null

    // Get company-wide buffer time default
    const { data: companySettings, error: companyErr } = await supabase
      .from('company_settings')
      .select('setting_value')
      .eq('setting_key', 'buffer_time_minutes')
        .maybeSingle()

    let companyBufferMinutes = 30 // Default fallback
    if (!companyErr && companySettings) {
      companyBufferMinutes = Number(companySettings.setting_value) || 30
    }

    // Get department grace period as additional fallback (legacy support)
    const { data: dept, error: deptErr } = await supabase
      .from('departments')
      .select('id, grace_period_minutes')
      .eq('id', emp.department_id)
      .maybeSingle()
    if (deptErr) return NextResponse.json({ error: deptErr.message }, { status: 500 })
    
    // Priority: Schedule override > Company-wide default > Department grace period > 30 minutes
    const graceMinutes = scheduleBufferMinutes != null 
      ? scheduleBufferMinutes 
      : (companyBufferMinutes != null ? companyBufferMinutes : (dept?.grace_period_minutes != null ? Number(dept.grace_period_minutes) : 30))

    console.log('[daily-work-time] Input & Schedule', {
      employee_id: employeeId,
      start_date: startDateStr,
      end_date: endDateStr,
      tz_string: tzString || null,
      schedule_buffer_time_minutes: scheduleBufferMinutes,
      company_buffer_time_minutes: companyBufferMinutes,
      department_grace_period_minutes: dept?.grace_period_minutes,
      final_grace_period_minutes: graceMinutes,
    })

    // Fetch all logs in range
    const logsStart = new Date(startDate)
    logsStart.setDate(logsStart.getDate() - 1) // Start 1 day before for overnight shifts
    const logsEnd = new Date(endDate)
    logsEnd.setDate(logsEnd.getDate() + 2) // End 2 days after to capture overnight shift endings

    const { data: logs, error: logsErr } = await supabase
      .from('attendance_logs')
      .select('status, log_time')
      .eq('employee_id', employeeId)
      .gte('log_time', logsStart.toISOString())
      .lte('log_time', logsEnd.toISOString())
      .order('log_time', { ascending: true })

    if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 })

    // Convert to simple timestamps (ignore status codes - they're unreliable)
    const allLogs = (logs || [])
      .map((l) => ({ t: new Date(l.log_time) }))
      .filter((l) => !isNaN(l.t?.getTime?.()))
    
    console.log('[daily-work-time] Total Timestamps', { count: allLogs.length })

    // Fetch working day settings
    let workingDayEnabled = false
    let workingDayStartTime = '10:00'
    try {
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['working_day_enabled', 'working_day_start_time'])
      
      if (companySettings) {
        const settingsMap = new Map(companySettings.map(s => [s.setting_key, s.setting_value]))
        workingDayEnabled = settingsMap.get('working_day_enabled') === 'true'
        workingDayStartTime = settingsMap.get('working_day_start_time') || '10:00'
      }
    } catch (e) {
      console.warn('[daily-work-time] Failed to fetch working day settings:', e)
    }

    console.log('[daily-work-time] Working day settings:', { enabled: workingDayEnabled, startTime: workingDayStartTime })
    console.log('[daily-work-time] Assigned schedules:', { count: tzStrings.length, schedules: tzStrings })

    // NEW: Use intelligent shift matching with ALL assigned schedules
    const results = await matchPunchesToShifts(
      allLogs, 
      startDate, 
      endDate, 
      { employee_id: employeeId, tz_strings: tzStrings }, // Pass all schedules
      graceMinutes, 
      workingDayEnabled, 
      workingDayStartTime
    )

    console.log('[daily-work-time] Processed Shifts', { count: results.length })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


