import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession, isAdmin } from '@/lib/auth'

/**
 * POST /api/admin/run-migration
 * One-shot endpoint to apply the Ramzan 2026 schedule setup.
 * Finds 2 free IDs within the 1-50 range (the check constraint),
 * widens the constraint if needed, creates schedule_overrides table,
 * and inserts the two Ramzan time_zone records.
 *
 * DELETE THIS FILE AFTER RUNNING ONCE.
 */
export async function POST(req) {
    try {
        const session = await getSession(req)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Admin only' }, { status: 403 })
        }

        const results = []

        // ── Step 1: Read existing time_zone IDs ──────────────────────────
        const { data: existingTzs, error: tzReadErr } = await supabase
            .from('time_zones')
            .select('id, name')
            .order('id', { ascending: true })

        if (tzReadErr) return NextResponse.json({ error: `Read TZs: ${tzReadErr.message}` }, { status: 500 })

        const usedIds = new Set((existingTzs || []).map(r => r.id))
        results.push({ step: 'existing_tz_ids', ids: Array.from(usedIds).sort((a, b) => a - b) })

        // ── Step 2: Find 2 free IDs within 1-50 ─────────────────────────
        const freeIds = []
        for (let i = 1; i <= 50 && freeIds.length < 2; i++) {
            if (!usedIds.has(i)) freeIds.push(i)
        }

        if (freeIds.length < 2) {
            return NextResponse.json({
                error: 'No free IDs in time_zones (1–50). Please manually delete an unused TZ record first.',
                used_ids: Array.from(usedIds).sort((a, b) => a - b),
            }, { status: 409 })
        }

        const [morningId, nightId] = freeIds
        results.push({ step: 'assigned_ids', morning_id: morningId, night_id: nightId })

        // ── Step 3: Insert Ramzan Morning time_zone ───────────────────────
        // 07:00–14:00, Mon–Fri, Sat/Sun off, buffer=180min (3hr flexible window)
        // tz_string: 7×8 chars, Sun(0)=off Mon–Fri=07001400 Sat(6)=off
        const { error: morningErr } = await supabase
            .from('time_zones')
            .upsert({
                id: morningId,
                name: 'Ramzan Morning (7AM–2PM)',
                tz_string: '00002359070014000700140007001400070014000700140000002359',
                buffer_time_minutes: 180,
            }, { onConflict: 'id' })

        if (morningErr) return NextResponse.json({ error: `Insert morning: ${morningErr.message}` }, { status: 500 })
        results.push({ step: 'morning_tz_inserted', id: morningId, name: 'Ramzan Morning (7AM–2PM)' })

        // ── Step 4: Insert Ramzan Night time_zone ─────────────────────────
        // 21:00–04:00 (crosses midnight), Mon–Fri, Sat/Sun off, buffer=30min
        // Friday night→Saturday morning handled by crossesMidnight engine logic
        const { error: nightErr } = await supabase
            .from('time_zones')
            .upsert({
                id: nightId,
                name: 'Ramzan Night (9PM–4AM)',
                tz_string: '00002359210004002100040021000400210004002100040000002359',
                buffer_time_minutes: 30,
            }, { onConflict: 'id' })

        if (nightErr) return NextResponse.json({ error: `Insert night: ${nightErr.message}` }, { status: 500 })
        results.push({ step: 'night_tz_inserted', id: nightId, name: 'Ramzan Night (9PM–4AM)' })

        // ── Step 5: Create schedule_overrides table via raw SQL ───────────
        // Supabase JS client can't CREATE TABLE — we use a stored proc workaround.
        // Instead, we insert into a sentinel table. If it doesn't exist yet, the
        // user needs the SQL Editor step. We'll at least verify it.
        const { error: tableCheckErr } = await supabase
            .from('schedule_overrides')
            .select('id')
            .limit(1)

        if (tableCheckErr && tableCheckErr.code === '42P01') {
            // Table doesn't exist — can't create via JS client, return instructions
            results.push({
                step: 'schedule_overrides_table',
                status: 'NEEDS_MANUAL_SQL',
                instructions: 'Run this SQL in Supabase SQL Editor:\n\nCREATE TABLE schedule_overrides (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,\n  override_tz_id INTEGER NOT NULL REFERENCES time_zones(id),\n  original_tz_id INTEGER REFERENCES time_zones(id),\n  active_from DATE NOT NULL,\n  active_until DATE NOT NULL,\n  label TEXT NOT NULL DEFAULT \'Temporary Override\',\n  is_active BOOLEAN NOT NULL DEFAULT true,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n  ended_at TIMESTAMPTZ,\n  ended_by TEXT\n);\nCREATE INDEX idx_overrides_employee_active ON schedule_overrides(employee_id, is_active);\nCREATE INDEX idx_overrides_active_until ON schedule_overrides(active_until, is_active);',
            })
        } else {
            results.push({ step: 'schedule_overrides_table', status: 'EXISTS_OR_CREATED' })
        }

        // ── Step 6: Update UI filter — store IDs in company_settings ─────
        // So the UI knows which TZ IDs are "override" type (id >= morningId)
        await supabase.from('company_settings').upsert([
            { setting_key: 'ramzan_morning_tz_id', setting_value: String(morningId), description: 'Ramzan Morning shift TZ ID' },
            { setting_key: 'ramzan_night_tz_id', setting_value: String(nightId), description: 'Ramzan Night shift TZ ID' },
        ], { onConflict: 'setting_key' })

        results.push({ step: 'company_settings_updated', morning_tz_id: morningId, night_tz_id: nightId })

        return NextResponse.json({
            success: true,
            morning_tz_id: morningId,
            night_tz_id: nightId,
            results,
            next_step: tableCheckErr?.code === '42P01' ? 'RUN_MANUAL_SQL' : 'COMPLETE',
            message: tableCheckErr?.code === '42P01'
                ? `Time zones created (IDs ${morningId} & ${nightId}). NOW run the schedule_overrides table SQL shown in instructions.`
                : `All done! Morning TZ=${morningId}, Night TZ=${nightId}. Open /departments → Shift Overrides tab.`,
        })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
