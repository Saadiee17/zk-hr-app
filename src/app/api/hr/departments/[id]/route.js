import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/hr/departments/[id] - Update department by ID (service role)
export async function PATCH(req, { params }) {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing department id' }, { status: 400 })
    }

    const body = await req.json()
    const updates = {}

    if (typeof body?.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
      updates.name = name
    }

    if (body?.department_code !== undefined) {
      const code = typeof body.department_code === 'number'
        ? body.department_code
        : Number(body.department_code)
      if (!Number.isFinite(code)) {
        return NextResponse.json({ error: 'department_code must be a number' }, { status: 400 })
      }
      updates.department_code = code
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const isUniqueViolation = error.code === '23505' || /duplicate key value/.test(error.message || '')
      const message = /name/.test(error.message || '')
        ? 'Department name must be unique'
        : /department_code/.test(error.message || '')
          ? 'Department code must be unique'
          : error.message
      return NextResponse.json({ error: message }, { status: isUniqueViolation ? 409 : 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// DELETE /api/hr/departments/[id] - Delete department by ID (service role)
export async function DELETE(req, { params }) {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing department id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


