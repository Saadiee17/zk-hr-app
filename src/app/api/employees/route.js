import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        is_active,
        zk_user_id,
        privilege,
        card_number,
        individual_tz_1,
        individual_tz_2,
        individual_tz_3,
        department_id,
        department:department_id (
          id,
          name
        )
      `)
      .eq('is_active', true)
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch employees' },
        { status: 500 }
      )
    }

    const employees = data || []

    const privilegeText = (value) => {
      switch (Number(value)) {
        case 0:
          return 'Employee'
        case 1:
          return 'Registrar'
        case 2:
          return 'Administrator'
        case 3:
          return 'Super Admin'
        default:
          return `Privilege ${value}`
      }
    }

    // Build maps to resolve Primary Schedule
    const individualTzIds = new Set(
      employees
        .map((e) => e.individual_tz_1)
        .filter((v) => v !== null && v !== undefined)
    )
    const departmentIds = new Set(
      employees
        .map((e) => e.department_id)
        .filter((v) => v !== null && v !== undefined)
    )

    // Fetch schedules for departments
    let deptSchedulesMap = new Map()
    if (departmentIds.size > 0) {
      const { data: schedules, error: schedErr } = await supabase
        .from('schedules')
        .select('department_id, tz_id_1')
        .in('department_id', Array.from(departmentIds))
      if (!schedErr && Array.isArray(schedules)) {
        deptSchedulesMap = new Map(schedules.map((s) => [s.department_id, s.tz_id_1]))
      }
    }

    // Collect tz ids from schedules too
    deptSchedulesMap.forEach((tzId) => {
      if (tzId !== null && tzId !== undefined) individualTzIds.add(tzId)
    })

    // Fetch time zone names for all referenced tz ids
    let tzNameMap = new Map()
    if (individualTzIds.size > 0) {
      const { data: tzs, error: tzErr } = await supabase
        .from('time_zones')
        .select('id, name')
        .in('id', Array.from(individualTzIds))
      if (!tzErr && Array.isArray(tzs)) {
        tzNameMap = new Map(tzs.map((t) => [t.id, t.name]))
      }
    }

    const enriched = employees.map((e) => {
      let primaryScheduleName = null
      if (e.individual_tz_1) {
        primaryScheduleName = tzNameMap.get(e.individual_tz_1) || null
      } else if (e.department_id) {
        const deptTz1 = deptSchedulesMap.get(e.department_id)
        if (deptTz1) primaryScheduleName = tzNameMap.get(deptTz1) || null
      }
      return {
        ...e,
        primary_schedule: primaryScheduleName || 'Not Assigned',
        privilege_text: privilegeText(e.privilege),
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: enriched,
        count: enriched.length,
      },
      {
        headers: {
          // Cache for 60s, serve stale for up to 5 min while revalidating.
          // Employees list changes rarely mid-session — this eliminates
          // the 1.5-2s DB hit on every page navigation.
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Employees API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}


