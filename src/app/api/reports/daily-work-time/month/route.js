import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

/**
 * GET /api/reports/daily-work-time/month?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns ALL cached attendance calculations for ALL active employees
 * within a date range — in a single SQL query.
 *
 * Used by payroll-reports and any other page that needs a full month at once.
 * Reads from daily_attendance_calculations (Option 4 cache) — never calculates.
 * Uncached dates simply won't appear (Edge Function will fill them within 60s).
 *
 * Response: { success: true, data: [...], missing_dates: [...] }
 *   data: flat array of calculation rows (one per employee per date)
 *   missing_dates: dates with no cache entries (for debugging only)
 *   from_cache: true (always — this endpoint never falls back to live calc)
 */
export async function GET(req) {
    try {
        await getSession(req) // auth check

        const url = new URL(req.url)
        const startStr = url.searchParams.get('start')
        const endStr = url.searchParams.get('end')

        if (!startStr || !endStr) {
            return NextResponse.json(
                { error: 'start and end parameters are required (YYYY-MM-DD)' },
                { status: 400 }
            )
        }

        // Validate
        const startDate = new Date(`${startStr}T00:00:00Z`)
        const endDate = new Date(`${endStr}T00:00:00Z`)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
        }
        if (endDate < startDate) {
            return NextResponse.json({ error: 'end must be >= start' }, { status: 400 })
        }

        // Fetch all cache rows for the date range in ONE query
        const { data: rows, error: cacheErr } = await supabase
            .from('daily_attendance_calculations')
            .select(`
        employee_id,
        date,
        status,
        in_time,
        out_time,
        total_hours,
        regular_hours,
        overtime_hours,
        shift_name,
        shift_start_time,
        shift_end_time,
        last_calculated_at
      `)
            .gte('date', startStr)
            .lte('date', endStr)
            .order('date', { ascending: true })

        if (cacheErr) {
            console.error('[month] Cache query error:', cacheErr)
            return NextResponse.json({ error: cacheErr.message }, { status: 500 })
        }

        // Also fetch employee names to enrich the response
        const { data: employees } = await supabase
            .from('employees')
            .select('id, first_name, last_name, employee_id, department:departments(id, name)')
            .eq('is_active', true)

        const empMap = new Map((employees || []).map(e => [e.id, e]))

        // Build enriched response rows (same shape as batch endpoint)
        const data = (rows || []).map(row => {
            const emp = empMap.get(row.employee_id)
            return {
                employee_id: row.employee_id,
                date: row.date,
                status: row.status,
                in_time: row.in_time,
                out_time: row.out_time,
                total_hours: row.total_hours,
                regular_hours: row.regular_hours,
                overtime_hours: row.overtime_hours,
                // Normalize field names (batch uses camelCase, cache uses snake_case)
                shiftName: row.shift_name || 'Standard',
                shift_name: row.shift_name || 'Standard',
                shiftStartTime: row.shift_start_time,
                shiftEndTime: row.shift_end_time,
                last_calculated_at: row.last_calculated_at,
                // Employee details
                name: emp ? `${emp.first_name} ${emp.last_name}`.trim() : 'Unknown',
                employee_code: emp?.employee_id || null,
                department: emp?.department?.name || 'Unassigned',
                department_id: emp?.department?.id || null,
            }
        })

        // Identify dates in range that have NO cache entries (useful for debugging)
        const cachedDates = new Set(rows?.map(r => r.date) || [])
        const missingDates = []
        const cur = new Date(startDate)
        const today = new Date()
        while (cur <= endDate && cur <= today) {
            const d = cur.toISOString().slice(0, 10)
            if (!cachedDates.has(d)) missingDates.push(d)
            cur.setDate(cur.getDate() + 1)
        }

        return NextResponse.json({
            success: true,
            data,
            from_cache: true,
            total: data.length,
            date_range: { start: startStr, end: endStr },
            missing_dates: missingDates.length > 0 ? missingDates : undefined,
        })

    } catch (err) {
        console.error('[month] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
