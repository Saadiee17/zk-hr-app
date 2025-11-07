import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function resolveId(req, params) {
  const id = params?.id
  if (!id || typeof id !== 'string') {
    try {
      const url = new URL(req.url)
      const pathParts = url.pathname.split('/')
      const idx = pathParts.indexOf('leave-types')
      if (idx >= 0 && idx < pathParts.length - 1) {
        return pathParts[idx + 1]
      }
    } catch {
      return null
    }
    return null
  }
  return id
}

// PATCH /api/hr/leave-types/[id] - Update a leave type
export async function PATCH(req, { params } = {}) {
  try {
    const id = resolveId(req, params)
    if (!id) {
      return NextResponse.json({ error: 'Missing leave type id' }, { status: 400 })
    }

    const body = await req.json()
    const updates = {}

    if (body?.name !== undefined) {
      updates.name = (body.name || '').trim()
      if (!updates.name) {
        return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      }
    }

    if (body?.code !== undefined) {
      updates.code = (body.code || '').trim().toUpperCase()
      if (!updates.code) {
        return NextResponse.json({ error: 'code cannot be empty' }, { status: 400 })
      }
    }

    if (body?.max_days_per_year !== undefined) {
      const maxDays = body.max_days_per_year === null ? null : Number(body.max_days_per_year)
      if (maxDays !== null && (!Number.isFinite(maxDays) || maxDays < 0)) {
        return NextResponse.json(
          { error: 'max_days_per_year must be a non-negative number or null' },
          { status: 400 }
        )
      }
      updates.max_days_per_year = maxDays
    }

    if (body?.requires_approval !== undefined) {
      updates.requires_approval = Boolean(body.requires_approval)
    }

    if (body?.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leave_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
      }
      const isUniqueViolation = error.code === '23505' || /duplicate key value/.test(error.message || '')
      const message = isUniqueViolation
        ? 'Leave type code must be unique'
        : error.message
      return NextResponse.json({ error: message }, { status: isUniqueViolation ? 409 : 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// DELETE /api/hr/leave-types/[id] - Soft delete (set is_active = false)
export async function DELETE(req, { params } = {}) {
  try {
    const id = resolveId(req, params)
    if (!id) {
      return NextResponse.json({ error: 'Missing leave type id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('leave_types')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leave type not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}



