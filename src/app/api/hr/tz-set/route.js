import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/hr/tz-set
// Body: { id: 1-50, name: string, tz_string: string, buffer_time_minutes?: number }
// Upserts into time_zones table (no device push)
export async function POST(req) {
  try {
    const body = await req.json()
    const tzId = typeof body?.id === 'number' ? body.id : Number(body?.id)
    const name = (body?.name || '').trim()
    const tzString = (body?.tz_string || '').trim()
    const bufferTimeMinutes = body?.buffer_time_minutes != null ? Number(body.buffer_time_minutes) : null

    if (!Number.isFinite(tzId) || tzId < 1 || tzId > 50) {
      return NextResponse.json({ error: 'id must be an integer between 1 and 50' }, { status: 400 })
    }
    if (!name || !tzString) {
      return NextResponse.json({ error: 'name and tz_string are required' }, { status: 400 })
    }
    if (bufferTimeMinutes != null && (!Number.isFinite(bufferTimeMinutes) || bufferTimeMinutes < 0)) {
      return NextResponse.json({ error: 'buffer_time_minutes must be a non-negative number' }, { status: 400 })
    }

    // Prepare data for upsert
    const upsertData = {
      id: tzId,
      name,
      tz_string: tzString,
    }
    
    // Only include buffer_time_minutes if provided (allows null to use default)
    if (bufferTimeMinutes != null) {
      upsertData.buffer_time_minutes = bufferTimeMinutes
    }

    // Upsert in Supabase (no device push)
    const { data, error } = await supabase
      .from('time_zones')
      .upsert(upsertData, { onConflict: 'id', ignoreDuplicates: false })
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



