/**
 * Utility functions for calculating attendance metrics
 */

/**
 * Calculate adherence metrics from report rows
 * @param {Array} reportRows - Array of report row objects
 * @returns {object} Metrics object with adherence, counts, hours, etc.
 */
export const calculateAdherenceMetrics = (reportRows) => {
  if (!reportRows || reportRows.length === 0) {
    return {
      adherence: 0,
      totalDays: 0,
      onTime: 0,
      lateIn: 0,
      absent: 0,
      present: 0,
      onLeave: 0,
      halfDay: 0,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalHours: 0,
      statusBreakdown: {},
    }
  }

  const statusCounts = {}
  let onTime = 0
  let lateIn = 0
  let absent = 0
  let present = 0
  let onLeave = 0
  let halfDay = 0
  let totalRegularHours = 0
  let totalOvertimeHours = 0

  // Count working days: Only days with scheduled shifts
  // Exclude: "No Schedule Assigned", "Out of Schedule", "Day Off", "Present"
  // Include: "On-Time", "Late-In", "Absent", "On Leave", "Half Day", "Punch Out Missing", "Worked on Day Off"
  let workingDays = 0

  reportRows.forEach((row) => {
    const status = row.status || 'Unknown'
    statusCounts[status] = (statusCounts[status] || 0) + 1

    // Only count as working day if it's a scheduled shift day
    // Exclude non-scheduled days and scheduled day-offs
    const excludedStatuses = [
      'No Schedule Assigned',
      'Out of Schedule', 
      'Day Off',           // Scheduled day off (no work expected)
      'Present'            // Worked on unscheduled day (not a scheduled working day)
    ]
    
    if (!excludedStatuses.includes(status)) {
      workingDays++
    }

    if (status === 'On-Time') onTime++
    else if (status === 'Late-In') lateIn++
    else if (status === 'Absent') absent++
    else if (status === 'Present') present++
    else if (status === 'On Leave') onLeave++
    else if (status === 'Half Day') {
      present++
      halfDay++
    }
    else if (status === 'Out of Schedule') {
      present++
    }

    totalRegularHours += Number(row.regularHours) || 0
    totalOvertimeHours += Number(row.overtimeHours) || 0
  })

  // Use workingDays instead of total reportRows.length for adherence calculation
  const totalDays = workingDays
  const adherence = totalDays > 0 ? Math.round((onTime / totalDays) * 100) : 0

  // Calculate required hours based on working days (9 hours per working day, same as employee dashboard)
  const requiredHours = totalDays * 9

  return {
    adherence,
    totalDays,
    onTime,
    lateIn,
    absent,
    present,
    onLeave,
    halfDay,
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalHours: Math.round((totalRegularHours + totalOvertimeHours) * 100) / 100,
    requiredHours: Math.round(requiredHours * 100) / 100,
    statusBreakdown: statusCounts,
  }
}

/**
 * Aggregate hours across multiple employees or days
 * @param {Array} data - Array of objects with regularHours and overtimeHours properties
 * @returns {object} Aggregated hours object
 */
export const aggregateHours = (data) => {
  if (!data || data.length === 0) {
    return {
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalHours: 0,
    }
  }

  const totalRegularHours = data.reduce((acc, item) => acc + (Number(item.regularHours) || 0), 0)
  const totalOvertimeHours = data.reduce((acc, item) => acc + (Number(item.overtimeHours) || 0), 0)
  const totalHours = totalRegularHours + totalOvertimeHours

  return {
    totalRegularHours: Math.round(totalRegularHours * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalHours: Math.round(totalHours * 100) / 100,
  }
}

