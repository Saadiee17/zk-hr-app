import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/sync/queue-status
 * Returns current state of the attendance_recalc_queue for the last 15 minutes.
 * Used by the dashboard's SyncProgressBanner to show real-time recalculation progress.
 * 
 * Response:
 *   { isActive, pending, processing, done, total, percent }
 * 
 * isActive = true when there are pending or processing items → show the banner
 * isActive = false when queue is empty → hide the banner
 */
export async function GET() {
    try {
        // Look at queue activity in the last 15 minutes only
        // This gives a meaningful "session" for progress tracking.
        // Items older than 15 min are ignored (they're from a previous sync cycle).
        const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()

        const { data, error } = await supabase
            .from('attendance_recalc_queue')
            .select('status')
            .gte('queued_at', windowStart)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const rows = data || []
        const pending = rows.filter(r => r.status === 'pending').length
        const processing = rows.filter(r => r.status === 'processing').length
        const done = rows.filter(r => r.status === 'done').length
        const failed = rows.filter(r => r.status === 'failed').length
        const total = pending + processing + done + failed

        // Percentage of work completed
        const percent = total === 0 ? 100 : Math.round(((done + failed) / total) * 100)

        // Active = there's still work in progress in this window
        const isActive = (pending + processing) > 0

        return NextResponse.json({
            isActive,
            pending,
            processing,
            done,
            failed,
            total,
            percent,
            // Human-readable status message
            message: isActive
                ? `Updating attendance data… ${done} of ${total} complete`
                : total > 0
                    ? `Attendance data up to date (${done} records synced)`
                    : null,
        }, {
            // Never cache this — must be fresh on every poll
            headers: { 'Cache-Control': 'no-store' }
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
