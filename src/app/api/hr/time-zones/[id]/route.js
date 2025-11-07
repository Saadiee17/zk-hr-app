import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/hr/time-zones/[id]
export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await params
    const url = new URL(req.url)
    const fallbackId = url.pathname.split('/').pop()
    const id = resolvedParams?.id || fallbackId
    const tzId = Number(id)
    if (!Number.isFinite(tzId)) return NextResponse.json({ error: 'Invalid TZ id' }, { status: 400 })

    const { error } = await supabase.from('time_zones').delete().eq('id', tzId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/hr/time-zones/[id] - update name or tz_string only (no device push)
export async function PATCH(req, { params }) {
  try {
    const resolvedParams = await params
    const url = new URL(req.url)
    const fallbackId = url.pathname.split('/').pop()
    const id = resolvedParams?.id || fallbackId
    const tzId = Number(id)
    if (!Number.isFinite(tzId)) return NextResponse.json({ error: 'Invalid TZ id' }, { status: 400 })

    const body = await req.json()
    const updates = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.tz_string === 'string') updates.tz_string = body.tz_string.trim()
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const { data, error } = await supabase
      .from('time_zones')
      .update(updates)
      .eq('id', tzId)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



