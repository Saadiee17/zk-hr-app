import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/leave-types - Fetch all leave types (optionally filter by is_active)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('leave_types')
      .select('*')
      .order('name', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/hr/leave-types - Create a new leave type
export async function POST(req) {
  try {
    const body = await req.json()
    const name = (body?.name || '').trim()
    const code = (body?.code || '').trim().toUpperCase()
    const maxDays = body?.max_days_per_year !== undefined ? Number(body.max_days_per_year) : null
    const requiresApproval = body?.requires_approval !== undefined ? Boolean(body.requires_approval) : true

    if (!name || !code) {
      return NextResponse.json(
        { error: 'name and code are required' },
        { status: 400 }
      )
    }

    if (maxDays !== null && (!Number.isFinite(maxDays) || maxDays < 0)) {
      return NextResponse.json(
        { error: 'max_days_per_year must be a non-negative number or null' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        name,
        code,
        max_days_per_year: maxDays,
        requires_approval: requiresApproval,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      const isUniqueViolation = error.code === '23505' || /duplicate key value/.test(error.message || '')
      const message = isUniqueViolation
        ? 'Leave type code must be unique'
        : error.message
      return NextResponse.json({ error: message }, { status: isUniqueViolation ? 409 : 400 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



