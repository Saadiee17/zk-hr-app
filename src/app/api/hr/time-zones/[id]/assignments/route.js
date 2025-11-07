import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/time-zones/[id]/assignments - Get departments and employees using this time zone
export async function GET(req, { params }) {
  try {
    const resolvedParams = await params
    const tzId = Number(resolvedParams.id)
    
    if (!Number.isFinite(tzId) || tzId < 1 || tzId > 50) {
      return NextResponse.json({ error: 'Invalid time zone ID' }, { status: 400 })
    }

    // Fetch departments using this TZ
    const { data: deptSchedules, error: deptError } = await supabase
      .from('schedules')
      .select(`
        department_id,
        tz_id_1,
        tz_id_2,
        tz_id_3,
        department:department_id (
          id,
          name
        )
      `)
      .or(`tz_id_1.eq.${tzId},tz_id_2.eq.${tzId},tz_id_3.eq.${tzId}`)

    if (deptError) throw deptError

    // Fetch employees using this TZ (individual override)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        individual_tz_1,
        individual_tz_2,
        individual_tz_3,
        department_id,
        department:department_id (
          id,
          name
        )
      `)
      .or(`individual_tz_1.eq.${tzId},individual_tz_2.eq.${tzId},individual_tz_3.eq.${tzId}`)
      .eq('is_active', true)

    if (empError) throw empError

    // Process departments
    const departments = (deptSchedules || []).map(s => ({
      id: s.department?.id,
      name: s.department?.name || 'Unknown',
      slot: s.tz_id_1 === tzId ? 'Slot 1' : s.tz_id_2 === tzId ? 'Slot 2' : 'Slot 3'
    }))

    // Process employees
    const employeesList = (employees || []).map(e => ({
      id: e.id,
      employee_id: e.employee_id,
      name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      department: e.department?.name || 'No Department',
      slot: e.individual_tz_1 === tzId ? 'Slot 1' : e.individual_tz_2 === tzId ? 'Slot 2' : 'Slot 3'
    }))

    return NextResponse.json({
      success: true,
      data: {
        departments,
        employees: employeesList
      }
    })
  } catch (error) {
    console.error('Error fetching schedule assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}

