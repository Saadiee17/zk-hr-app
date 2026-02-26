import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sync/queue-status
 * Returns global state of the attendance_recalc_queue using COUNT queries.
 * Avoids Supabase's 1000-row default page limit by counting per-status.
 */
export async function GET() {
    try {
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        // Count each status individually to avoid 1000-row Supabase page limit
        const [pendingRes, processingRes, doneRes, failedRes, totalRes, winPendingRes, winProcessingRes] = await Promise.all([
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'done'),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('queued_at', windowStart),
            supabase.from('attendance_recalc_queue').select('id', { count: 'exact', head: true }).eq('status', 'processing').gte('queued_at', windowStart),
        ])

        // Check for errors
        const errors = [pendingRes, processingRes, doneRes, failedRes, totalRes].filter(r => r.error)
        if (errors.length > 0) {
            return NextResponse.json({ error: errors[0].error.message }, { status: 500 })
        }

        const pending = pendingRes.count || 0
        const processing = processingRes.count || 0
        const done = doneRes.count || 0
        const failed = failedRes.count || 0
        const total = totalRes.count || 0
        const completed = done + failed

        const percent = total === 0 ? 100 : Math.round((completed / total) * 100)
        const isActive = (pending + processing) > 0

        // Banner: only show if there's RECENT activity (last 15 min)
        const winPending = winPendingRes.count || 0
        const winProcessing = winProcessingRes.count || 0
        const showBanner = (winPending + winProcessing) > 0

        return NextResponse.json({
            isActive: showBanner,
            pending,
            processing,
            done,
            failed,
            total,
            percent,
            message: isActive
                ? `Updating attendance data… ${completed} of ${total} complete`
                : total > 0
                    ? `Attendance data up to date (${done} records synced)`
                    : null,
        }, {
            headers: { 'Cache-Control': 'no-store' }
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
