import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const EDGE_FUNCTION_URL = 'https://pshttookanrjlrmwhqnt.functions.supabase.co/process-attendance-queue'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

/**
 * POST /api/sync/burst-drain
 *
 * Fires N parallel Supabase Edge Function calls to drain the entire
 * attendance_recalc_queue at once. Each Edge Function call claims and
 * processes 10 items using SKIP LOCKED (safe concurrent access).
 *
 * For 1927 pending items: fires ceil(1927/10) = 193 parallel calls.
 * All calls run simultaneously → entire queue drains in ~20-30 seconds.
 *
 * Returns immediately after firing — the UI polls /api/sync/queue-status
 * to track progress. No looping needed in the UI.
 */
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))

        // Get current pending count to know how many Edge Function calls to fire
        const { count: pendingCount, error: countErr } = await supabase
            .from('attendance_recalc_queue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')

        if (countErr) {
            return NextResponse.json({ error: `Count failed: ${countErr.message}` }, { status: 500 })
        }

        const pending = pendingCount || 0

        if (pending === 0) {
            return NextResponse.json({
                success: true,
                fired: 0,
                pending: 0,
                message: 'Queue is empty. All caught up! ✓',
            })
        }

        // Each Edge Function call processes 10 items.
        // Fire enough calls to cover the entire queue at once, capped at 200
        // to avoid overwhelming Supabase's Edge Function concurrency limits.
        const ITEMS_PER_CALL = 10
        const MAX_PARALLEL = 200
        const burstCount = Math.min(MAX_PARALLEL, Math.ceil(pending / ITEMS_PER_CALL))

        const authHeader = `Bearer ${SUPABASE_ANON_KEY}`

        // Fire all calls in parallel — fire-and-forget, none are awaited.
        // Each one independently claims its own batch via SKIP LOCKED in the DB,
        // so there's no race condition even with 200 concurrent calls.
        const promises = Array.from({ length: burstCount }, (_, i) =>
            fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: '{}',
            }).catch(err => console.warn(`[burst-drain] Edge call ${i + 1}/${burstCount} failed (non-fatal):`, err.message))
        )

        // Fire all — don't await, return immediately so the UI can poll
        Promise.allSettled(promises).then(results => {
            const succeeded = results.filter(r => r.status === 'fulfilled').length
            console.log(`[burst-drain] Burst complete: ${succeeded}/${burstCount} Edge Function calls succeeded`)
        })

        console.log(`[burst-drain] Fired ${burstCount} parallel Edge Function calls for ${pending} pending items`)

        return NextResponse.json({
            success: true,
            fired: burstCount,
            pending,
            estimatedSeconds: Math.ceil(burstCount / 20) * 10, // rough estimate
            message: `Fired ${burstCount} parallel workers for ${pending} items. Poll /api/sync/queue-status for progress.`,
        })

    } catch (err) {
        console.error('[burst-drain] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
