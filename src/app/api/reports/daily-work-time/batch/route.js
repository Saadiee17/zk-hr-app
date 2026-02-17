import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'
import { calculateForDateRange, formatCachedResult } from '../route'

// GET /api/reports/daily-work-time/batch?date=YYYY-MM-DD
// Returns all employees' attendance calculations for a single date
export async function GET(req) {
  try {
    const session = await getSession(req)
    const url = new URL(req.url)
    const dateStr = url.searchParams.get('date')

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter is required (YYYY-MM-DD)' }, { status: 400 })
    }

    // Validate date format
    const date = new Date(`${dateStr}T00:00:00Z`)
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Fetch all active employees
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_id, department_id, individual_tz_1, individual_tz_2, individual_tz_3, department:departments(id, name)')
      .eq('is_active', true)

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 })
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // STEP 1: Fetch all cached calculations for this date
    const { data: cachedResults, error: cacheErr } = await supabase
      .from('daily_attendance_calculations')
      .select('*')
      .eq('date', dateStr)
      .in('employee_id', employees.map(e => e.id))

    if (cacheErr) {
      console.warn('[batch] Cache query error:', cacheErr)
    }

    const cachedMap = new Map()
    if (cachedResults) {
      cachedResults.forEach(cached => {
        cachedMap.set(cached.employee_id, cached)
      })
    }

    // STEP 1.5: Resolved employee schedule names from the source (Time Zones table)
    // This implements the "Universal Architecture" as requested by the user
    const { data: allSchedules } = await supabase.from('schedules').select('*')
    const { data: allTimeZones } = await supabase.from('time_zones').select('id, name')

    const tzNameMap = new Map(allTimeZones?.map(tz => [tz.id, tz.name]) || [])
    const scheduleMap = new Map(allSchedules?.map(s => [s.department_id, s]) || [])

    const getResolvedShiftName = (emp) => {
      // Priority: Individual TZ 1 > Dept TZ 1 > fallback
      const tzId = emp.individual_tz_1 || scheduleMap.get(emp.department_id)?.tz_id_1
      return tzNameMap.get(tzId) || 'Standard'
    }

    // STEP 2: Determine which employees need calculation
    const missingEmployeeIds = employees
      .filter(emp => {
        const cached = cachedMap.get(emp.id)
        if (!cached) return true

        // If record exists but is missing shift metadata (from old system), force re-calc
        const hasShiftInfo = (cached.shiftStartTime || cached.shift_start_time) && (cached.shiftName || cached.shift_name)
        const isWorkingStatus = ['Late-In', 'On-Time', 'Present', 'Half Day', 'Out of Schedule'].includes(cached.status)

        if (isWorkingStatus && !hasShiftInfo) return true

        return false
      })
      .map(emp => emp.id)

    console.log(`[batch] Date ${dateStr}: ${cachedMap.size} cached, ${missingEmployeeIds.length} need calculation`)

    // STEP 3: Return cached results with calculated data
    // We now await the calculations to ensure the dashboard never shows empty "0" stats.
    if (missingEmployeeIds.length > 0) {
      console.log(`[batch] Calculating ${missingEmployeeIds.length} missing employees for ${dateStr} synchronously`)

      // Process all missing employees in parallel
      const calculationPromises = missingEmployeeIds.map(async (employeeId) => {
        try {
          const results = await calculateForDateRange(employeeId, dateStr, dateStr)
          const dayData = results.find(d => d.date === dateStr)

          if (dayData && dayData.status !== 'Employee Not Found' && dayData.status !== 'No Schedule Assigned') {
            // Store in cache
            const { data: upsertData, error: insertError } = await supabase
              .from('daily_attendance_calculations')
              .upsert({
                employee_id: employeeId,
                date: dayData.date,
                status: dayData.status,
                in_time: dayData.inTime,
                out_time: dayData.outTime,
                duration_hours: dayData.durationHours,
                regular_hours: dayData.regularHours,
                overtime_hours: dayData.overtimeHours,
                shift_start_time: dayData.shiftStartTime,
                shift_end_time: dayData.shiftEndTime,
                shift_name: dayData.shiftName,
                last_calculated_at: new Date().toISOString(),
              }, {
                onConflict: 'employee_id,date',
              })
              .select()

            if (insertError) {
              console.warn(`[batch] Cache insert error for ${employeeId}:`, insertError)
            }

            // Return the calculated data to be included in the response
            return {
              employee_id: employeeId,
              status: dayData.status,
              inTime: dayData.inTime,
              outTime: dayData.outTime,
              durationHours: Number(dayData.durationHours) || 0,
              regularHours: Number(dayData.regularHours) || 0,
              overtimeHours: Number(dayData.overtimeHours) || 0,
              shiftStartTime: dayData.shiftStartTime,
              shiftEndTime: dayData.shiftEndTime,
              shiftName: dayData.shiftName,
            }
          }
        } catch (error) {
          console.error(`[batch] Error calculating for employee ${employeeId}:`, error)
        }
        return null
      })

      const newlyCalculatedResults = await Promise.all(calculationPromises)
      // Merge newly calculated results into our results source
      newlyCalculatedResults.forEach(res => {
        if (res) {
          cachedMap.set(res.employee_id, res)
        }
      })
    }

    // STEP 4: Return full results
    const allResults = employees.map(emp => {
      const result = cachedMap.get(emp.id)

      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id || 'Unknown',
        department: emp.department?.name || 'No Department',
        date: dateStr,
        status: result?.status || 'Absent',
        inTime: result?.inTime || result?.in_time || null,
        outTime: result?.outTime || result?.out_time || null,
        durationHours: Number(result?.durationHours || result?.duration_hours) || 0,
        regularHours: Number(result?.regularHours || result?.regular_hours) || 0,
        overtimeHours: Number(result?.overtimeHours || result?.overtime_hours) || 0,
        shiftStartTime: result?.shiftStartTime || result?.shift_start_time || null,
        shiftEndTime: result?.shiftEndTime || result?.shift_end_time || null,
        shiftName: result?.shiftName || result?.shift_name || getResolvedShiftName(emp),
      }
    })

    console.log(`[batch] Returning ${allResults.length} results for date ${dateStr} (Freshly calculated: ${missingEmployeeIds.length})`)

    return NextResponse.json({
      success: true,
      data: allResults,
      date: dateStr,
      cached: cachedMap.size,
      missing: missingEmployeeIds.length,
      note: missingEmployeeIds.length > 0 ? 'Some employees calculated in background, refresh to see updated results' : 'All data from cache'
    })
  } catch (error) {
    console.error('[batch] Error:', error)
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

