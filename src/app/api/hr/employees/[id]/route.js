import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/hr/employees/[id]
// Body: { first_name?, last_name?, department_id?, privilege?, is_active?, card_number? }
export async function PATCH(req, { params } = {}) {
  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const fallbackId = pathParts[pathParts.length - 1] || null
    const { id: paramId } = params || {}
    const id = paramId || fallbackId
    if (!id) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const body = await req.json()
    const updates = {}

    if (typeof body.first_name === 'string') updates.first_name = body.first_name.trim()
    if (typeof body.last_name === 'string') updates.last_name = body.last_name.trim()
    if (body.department_id !== undefined) updates.department_id = body.department_id || null
    if (body.privilege !== undefined) {
      const p = typeof body.privilege === 'number' ? body.privilege : Number(body.privilege)
      if (!Number.isFinite(p)) return NextResponse.json({ error: 'privilege must be a number' }, { status: 400 })
      updates.privilege = p
    }
    if (body.is_active !== undefined) updates.is_active = Boolean(body.is_active)
    if (body.card_number !== undefined) updates.card_number = body.card_number || null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
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





