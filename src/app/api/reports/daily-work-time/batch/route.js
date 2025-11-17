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
      .select('id, first_name, last_name, employee_id, department_id, department:departments(id, name)')
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

    // STEP 2: Determine which employees need calculation
    const missingEmployeeIds = employees
      .filter(emp => !cachedMap.has(emp.id))
      .map(emp => emp.id)

    console.log(`[batch] Date ${dateStr}: ${cachedMap.size} cached, ${missingEmployeeIds.length} need calculation`)

    // STEP 3: Return cached results immediately, calculate missing ones in background
    // This allows the dashboard to load instantly with cached data
    
    // Start background calculation for missing employees (don't wait for it)
    if (missingEmployeeIds.length > 0) {
      console.log(`[batch] Starting background calculation for ${missingEmployeeIds.length} missing employees for ${dateStr}`)
      
      // Don't await this - let it run in background
      // Process in chunks to avoid overwhelming the system
      const chunkSize = 10
      const chunks = []
      for (let i = 0; i < missingEmployeeIds.length; i += chunkSize) {
        chunks.push(missingEmployeeIds.slice(i, i + chunkSize))
      }

      // Run calculations in background (fire and forget)
      Promise.all(chunks.map(async (chunk) => {
        const promises = chunk.map(async (employeeId) => {
          try {
            // Directly call the calculation function (no HTTP overhead!)
            const results = await calculateForDateRange(employeeId, dateStr, dateStr)
            const dayData = results.find(d => d.date === dateStr)
            
            if (dayData && dayData.status !== 'Employee Not Found' && dayData.status !== 'No Schedule Assigned') {
              // Store in cache for future use
              try {
                const { error: insertError } = await supabase
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
                    last_calculated_at: new Date().toISOString(),
                  }, {
                    onConflict: 'employee_id,date',
                  })
                
                if (insertError) {
                  console.warn(`[batch] Cache insert error for ${employeeId}:`, insertError)
                } else {
                  console.log(`[batch] Background: Cached calculation for employee ${employeeId} on ${dateStr}`)
                }
              } catch (e) {
                console.warn(`[batch] Cache insert exception for ${employeeId}:`, e)
              }
            }
          } catch (error) {
            console.error(`[batch] Error calculating for employee ${employeeId}:`, error)
          }
        })
        
        await Promise.all(promises)
      })).catch(err => {
        console.error('[batch] Background calculation error:', err)
      })
    }

    // STEP 4: Return results immediately with cached data
    // Missing employees will show as "Absent" (which is likely correct if no cache exists)
    const allResults = employees.map(emp => {
      const cached = cachedMap.get(emp.id)

      if (cached) {
        // Return cached data immediately
        return {
          employee_id: emp.id,
          employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id || 'Unknown',
          department: emp.department?.name || 'No Department',
          date: cached.date,
          status: cached.status,
          inTime: cached.in_time,
          outTime: cached.out_time,
          durationHours: Number(cached.duration_hours) || 0,
          regularHours: Number(cached.regular_hours) || 0,
          overtimeHours: Number(cached.overtime_hours) || 0,
        }
      } else {
        // No cache available - return "Absent" immediately
        // Background calculation will update cache for next request
        return {
          employee_id: emp.id,
          employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id || 'Unknown',
          department: emp.department?.name || 'No Department',
          date: dateStr,
          status: 'Absent',
          inTime: null,
          outTime: null,
          durationHours: 0,
          regularHours: 0,
          overtimeHours: 0,
        }
      }
    })

    console.log(`[batch] Returning ${allResults.length} results immediately for date ${dateStr} (${cachedMap.size} from cache, ${missingEmployeeIds.length} defaulted to Absent, calculating in background)`)

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

