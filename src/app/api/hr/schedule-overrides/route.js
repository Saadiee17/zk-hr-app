import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

const EDGE_FUNCTION_URL = 'https://pshttookanrjlrmwhqnt.functions.supabase.co/process-attendance-queue'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Fire N parallel Edge Function calls to drain the recalc queue quickly.
// Same pattern as /api/sync — fire-and-forget, never awaited.
function kickEdgeFunctionBurst(queueSize) {
    const burstCount = Math.min(30, Math.max(1, Math.ceil(queueSize / 10)))
    const authHeader = `Bearer ${SUPABASE_ANON_KEY}`
    for (let i = 0; i < burstCount; i++) {
        fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: '{}',
        }).catch(err => console.warn(`[OVERRIDE] Edge Function kick ${i + 1}/${burstCount} failed (non-fatal):`, err.message))
    }
    console.log(`[OVERRIDE] Fired ${burstCount} Edge Function burst calls for ${queueSize} queued items`)
}

// GET /api/hr/schedule-overrides
// Returns all active overrides with employee + schedule info
export async function GET(req) {
    try {
        await getSession(req)

        const { data, error } = await supabase
            .from('schedule_overrides')
            .select(`
        id,
        employee_id,
        override_tz_id,
        original_tz_id,
        active_from,
        active_until,
        label,
        is_active,
        created_at,
        ended_at,
        employee:employees(id, first_name, last_name, employee_id, department:departments(id, name)),
        override_tz:time_zones!schedule_overrides_override_tz_id_fkey(id, name)
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true, data: data || [] })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST /api/hr/schedule-overrides
// Bulk-assign a schedule override to multiple employees
// Body: { employee_ids: UUID[], override_tz_id: number, active_from: date, active_until: date, label: string }
export async function POST(req) {
    try {
        const session = await getSession(req)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await req.json()
        const { employee_ids, override_tz_id, active_from, active_until, label } = body

        if (!employee_ids?.length || !override_tz_id || !active_from || !active_until) {
            return NextResponse.json({ error: 'employee_ids, override_tz_id, active_from, active_until are required' }, { status: 400 })
        }

        // SAFETY GUARD: active_from must not be more than 60 days in the past.
        // This prevents the "wrong year" bug (e.g. typing 2025 instead of 2026)
        // from retroactively applying an override to an entire year of history.
        const _today = new Date()
        _today.setUTCHours(0, 0, 0, 0)
        const _fromDate = new Date(active_from)
        const _daysInPast = (_today - _fromDate) / (1000 * 60 * 60 * 24)
        if (_daysInPast > 60) {
            return NextResponse.json({
                error: `active_from (${active_from}) is more than 60 days in the past. Did you enter the wrong year? Overrides retroactive beyond 60 days are blocked to protect historical data.`
            }, { status: 400 })
        }

        // Fetch current individual_tz_1 for each employee (to save as original)
        const { data: employees, error: empErr } = await supabase
            .from('employees')
            .select('id, individual_tz_1')
            .in('id', employee_ids)

        if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

        // Deactivate any existing active overrides for these employees
        await supabase
            .from('schedule_overrides')
            .update({ is_active: false, ended_at: new Date().toISOString(), ended_by: 'replaced' })
            .in('employee_id', employee_ids)
            .eq('is_active', true)

        // Insert new override rows
        const overrideRows = employees.map(emp => ({
            employee_id: emp.id,
            override_tz_id: Number(override_tz_id),
            original_tz_id: emp.individual_tz_1 || null,
            active_from,
            active_until,
            label: label || 'Temporary Override',
            is_active: true,
        }))

        const { error: insertErr } = await supabase
            .from('schedule_overrides')
            .insert(overrideRows)

        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

        // Apply the override — set individual_tz_1 to the override schedule
        const { error: updateErr } = await supabase
            .from('employees')
            .update({ individual_tz_1: Number(override_tz_id) })
            .in('id', employee_ids)

        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

        // Queue retroactive recalculation from active_from to today
        // This corrects any historical records since Ramzan started
        const startDate = new Date(active_from)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        const queueRows = []
        for (const emp of employees) {
            const cur = new Date(startDate)
            while (cur <= today) {
                queueRows.push({
                    employee_id: emp.id,
                    date: cur.toISOString().slice(0, 10),
                    status: 'pending',
                })
                cur.setDate(cur.getDate() + 1)
            }
        }

        if (queueRows.length > 0) {
            // Upsert to avoid duplicate queue entries
            await supabase
                .from('attendance_recalc_queue')
                .upsert(queueRows, { onConflict: 'employee_id,date', ignoreDuplicates: false })

            // Kick Edge Function burst to drain the queue immediately
            // (same as sync route does — without this, items sit idle until next sync)
            kickEdgeFunctionBurst(queueRows.length)
        }

        return NextResponse.json({
            success: true,
            message: `Override applied to ${employees.length} employee(s). ${queueRows.length} days queued for recalculation — processing now.`,
            employees_updated: employees.length,
            days_queued: queueRows.length,
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// DELETE /api/hr/schedule-overrides
// Revert overrides — restore original schedules
// Body: { employee_ids?: UUID[] }  — if empty, reverts ALL active overrides
export async function DELETE(req) {
    try {
        const session = await getSession(req)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }

        const body = await req.json().catch(() => ({}))
        const { employee_ids } = body

        // Fetch active overrides (filtered by employee_ids if provided)
        let query = supabase
            .from('schedule_overrides')
            .select('id, employee_id, original_tz_id, active_from')
            .eq('is_active', true)

        if (employee_ids?.length) query = query.in('employee_id', employee_ids)

        const { data: activeOverrides, error: fetchErr } = await query
        if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
        if (!activeOverrides?.length) {
            return NextResponse.json({ success: true, message: 'No active overrides to revert', reverted: 0 })
        }

        const overrideIds = activeOverrides.map(o => o.id)
        const affectedEmployeeIds = activeOverrides.map(o => o.employee_id)

        // Mark overrides as ended
        await supabase
            .from('schedule_overrides')
            .update({ is_active: false, ended_at: new Date().toISOString(), ended_by: 'admin' })
            .in('id', overrideIds)

        // Restore each employee's original_tz_id (NULL = revert to dept default)
        for (const override of activeOverrides) {
            await supabase
                .from('employees')
                .update({ individual_tz_1: override.original_tz_id })
                .eq('id', override.employee_id)
        }

        // Queue recalculation from the override start date to today
        // so the reverted schedule recalculates all affected days
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        const queueRows = []

        for (const override of activeOverrides) {
            const startDate = new Date(override.active_from)
            const cur = new Date(startDate)
            while (cur <= today) {
                queueRows.push({
                    employee_id: override.employee_id,
                    date: cur.toISOString().slice(0, 10),
                    status: 'pending',
                })
                cur.setDate(cur.getDate() + 1)
            }
        }

        if (queueRows.length > 0) {
            await supabase
                .from('attendance_recalc_queue')
                .upsert(queueRows, { onConflict: 'employee_id,date', ignoreDuplicates: false })

            // Kick burst to drain immediately — no waiting for next sync
            kickEdgeFunctionBurst(queueRows.length)
        }

        return NextResponse.json({
            success: true,
            message: `${activeOverrides.length} override(s) reverted. ${queueRows.length} days queued for recalculation — processing now.`,
            reverted: activeOverrides.length,
            days_queued: queueRows.length,
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
