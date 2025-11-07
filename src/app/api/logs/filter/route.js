import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helpers for human-readable fields
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

const toStartOfDayIso = (dateStr) => {
  try {
    if (!dateStr) return null
    // Accept YYYY-MM-DD or ISO string
    const date = dateStr.length <= 10 ? new Date(`${dateStr}T00:00:00.000Z`) : new Date(dateStr)
    if (isNaN(date.getTime())) return null
    date.setUTCHours(0, 0, 0, 0)
    return date.toISOString()
  } catch {
    return null
  }
}

const toEndOfDayIso = (dateStr) => {
  try {
    if (!dateStr) return null
    const date = dateStr.length <= 10 ? new Date(`${dateStr}T23:59:59.999Z`) : new Date(dateStr)
    if (isNaN(date.getTime())) return null
    date.setUTCHours(23, 59, 59, 999)
    return date.toISOString()
  } catch {
    return null
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams

    const pageParam = parseInt(search.get('page') || '1', 10)
    const limitParam = parseInt(search.get('limit') || '50', 10)
    const employeeUuid = search.get('employee_uuid') || null
    const dateRange = search.get('date_range') || ''

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
    // Enforce maximum 50 per page as requested
    const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 50)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
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
      `, { count: 'exact' })
      .order('log_time', { ascending: false })

    if (employeeUuid) {
      query = query.eq('employee_id', employeeUuid)
    }

    if (dateRange) {
      const [startStr, endStr] = dateRange.split(',').map((s) => s?.trim())
      const startIso = toStartOfDayIso(startStr)
      const endIso = toEndOfDayIso(endStr)
      if (startIso) query = query.gte('log_time', startIso)
      if (endIso) query = query.lte('log_time', endIso)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching filtered logs:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch filtered attendance logs' },
        { status: 500 }
      )
    }

    const enriched = (data || []).map((row) => ({
      ...row,
      status_text: mapStatusCode(row?.status),
      punch_text: mapPunchCode(row?.punch),
      department_name: row?.employees && (Array.isArray(row.employees) ? row.employees[0]?.department?.name : row.employees?.department?.name) || null,
    }))

    const total = count || 0
    const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1

    return NextResponse.json({
      success: true,
      data: enriched,
      page,
      limit,
      total,
      totalPages,
    })
  } catch (error) {
    console.error('Filter error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}


