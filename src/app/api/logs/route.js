import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Fetch attendance logs from Supabase
 * GET /api/logs
 * Returns the 20 most recent attendance logs with employee information
 */
export async function GET() {
  try {
    // Helper: Map ZKTeco status codes to human-readable strings
    const mapStatusCode = (value) => {
      if (value === null || value === undefined) return 'N/A'
      switch (Number(value)) {
        case 0:
          return 'Check-In'
        case 1:
          return 'Check-Out'
        case 2:
          return 'Break-Out'
        case 3:
          return 'Break-In'
        case 4:
          return 'OT-In'
        case 5:
          return 'OT-Out'
        default:
          return `Status Code ${value}`
      }
    }

    // Helper: Map ZKTeco punch method codes to human-readable strings
    const mapPunchCode = (value) => {
      if (value === null || value === undefined) return 'N/A'
      switch (Number(value)) {
        case 0:
          return 'Password'
        case 1:
          return 'Fingerprint'
        case 2:
          return 'Card'
        default:
          return `Punch Code ${value}`
      }
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        employees:employee_id (
          id,
          employee_id,
          first_name,
          last_name,
          department_id,
          department:department_id (
            id,
            name
          )
        )
      `)
      .order('log_time', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch attendance logs' },
        { status: 500 }
      )
    }

    // Enrich with human-readable fields on the server
    const enriched = (data || []).map((row) => ({
      ...row,
      status_text: mapStatusCode(row?.status),
      punch_text: mapPunchCode(row?.punch),
      department_name: row?.employees && (Array.isArray(row.employees) ? row.employees[0]?.department?.name : row.employees?.department?.name) || null,
    }))

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}



