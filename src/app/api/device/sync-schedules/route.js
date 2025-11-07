import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/device/sync-schedules
// Syncs all time zones and employee schedules to K50 device
export async function POST() {
  try {
    const pythonBridgeBase = process.env.PYTHON_BRIDGE_URL || 'http://localhost:8080'
    const results = {
      timeZones: { total: 0, success: 0, errors: [] },
      employees: { total: 0, success: 0, errors: [] }
    }

    // Step 1: Fetch All Time Zones
    const { data: timeZones, error: tzError } = await supabase
      .from('time_zones')
      .select('id, name, tz_string')
      .order('id', { ascending: true })

    if (tzError) {
      return NextResponse.json({ error: `Failed to fetch time zones: ${tzError.message}` }, { status: 500 })
    }

    const allTimeZones = timeZones || []
    results.timeZones.total = allTimeZones.length

    // Step 2: Push TZs to K50
    for (const tz of allTimeZones) {
      try {
        const pushPayload = {
          id: tz.id,
          name: tz.name,
          tz_string: tz.tz_string
        }

        const bridgeRes = await fetch(`${pythonBridgeBase.replace(/\/$/, '')}/api/zk/set-tz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pushPayload),
          signal: AbortSignal.timeout(20000),
        })

        if (!bridgeRes.ok) {
          const errText = await bridgeRes.text().catch(() => '')
          results.timeZones.errors.push({
            tz_id: tz.id,
            error: `${bridgeRes.status} ${bridgeRes.statusText}${errText ? ` - ${errText}` : ''}`
          })
        } else {
          results.timeZones.success++
        }
      } catch (e) {
        results.timeZones.errors.push({
          tz_id: tz.id,
          error: e.message || String(e)
        })
      }
    }

    // Step 3: Fetch All Employees with their schedules
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        zk_user_id,
        individual_tz_1,
        individual_tz_2,
        individual_tz_3,
        department_id,
        department:department_id (
          id
        )
      `)
      .eq('is_active', true)

    if (empError) {
      return NextResponse.json({ error: `Failed to fetch employees: ${empError.message}` }, { status: 500 })
    }

    const allEmployees = employees || []
    results.employees.total = allEmployees.length

    // Step 4: Fetch department schedules for employees without individual overrides
    const deptIds = [...new Set(allEmployees
      .filter(e => e.department_id && !e.individual_tz_1 && !e.individual_tz_2 && !e.individual_tz_3)
      .map(e => e.department_id))]

    let deptSchedulesMap = new Map()
    if (deptIds.length > 0) {
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('department_id, tz_id_1, tz_id_2, tz_id_3')
        .in('department_id', deptIds)

      if (!schedError && Array.isArray(schedules)) {
        schedules.forEach(s => {
          deptSchedulesMap.set(s.department_id, {
            tz_1: s.tz_id_1,
            tz_2: s.tz_id_2,
            tz_3: s.tz_id_3
          })
        })
      }
    }

    // Step 5: Push Employee Schedules to K50
    for (const emp of allEmployees) {
      if (!emp.zk_user_id) {
        results.employees.errors.push({
          employee_id: emp.id,
          error: 'Missing zk_user_id'
        })
        continue
      }

      try {
        // Determine which TZs to use: individual override or department default
        let tz_1 = emp.individual_tz_1
        let tz_2 = emp.individual_tz_2
        let tz_3 = emp.individual_tz_3

        // If no individual override, use department default
        if (tz_1 === null && tz_2 === null && tz_3 === null && emp.department_id) {
          const deptSchedule = deptSchedulesMap.get(emp.department_id)
          if (deptSchedule) {
            tz_1 = deptSchedule.tz_1
            tz_2 = deptSchedule.tz_2
            tz_3 = deptSchedule.tz_3
          }
        }

        const pushPayload = {
          id: String(emp.zk_user_id),
          tz_id_1: tz_1,
          tz_id_2: tz_2,
          tz_id_3: tz_3
        }

        const bridgeRes = await fetch(`${pythonBridgeBase.replace(/\/$/, '')}/api/zk/set-user-tz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pushPayload),
          signal: AbortSignal.timeout(20000),
        })

        if (!bridgeRes.ok) {
          const errText = await bridgeRes.text().catch(() => '')
          results.employees.errors.push({
            employee_id: emp.id,
            zk_user_id: emp.zk_user_id,
            error: `${bridgeRes.status} ${bridgeRes.statusText}${errText ? ` - ${errText}` : ''}`
          })
        } else {
          results.employees.success++
        }
      } catch (e) {
        results.employees.errors.push({
          employee_id: emp.id,
          zk_user_id: emp.zk_user_id,
          error: e.message || String(e)
        })
      }
    }

    const hasErrors = results.timeZones.errors.length > 0 || results.employees.errors.length > 0
    const status = hasErrors ? 207 : 200 // 207 Multi-Status if partial success

    return NextResponse.json({
      success: !hasErrors,
      message: `Sync completed: ${results.timeZones.success}/${results.timeZones.total} TZs, ${results.employees.success}/${results.employees.total} employees`,
      results
    }, { status })

  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

