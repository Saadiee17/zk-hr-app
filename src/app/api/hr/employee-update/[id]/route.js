import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/hr/employee-update/[id]
// Updates employee in Supabase (service role) and optionally pushes changes to ZKTeco via Python Bridge
// Note: Privilege changes are NOT pushed to device (device doesn't support privilege changes)
// Privilege is stored in database for web app access control only
export async function PATCH(req, { params } = {}) {
  try {
    // Resolve employee id from params or URL
    // Note: params is now a Promise in Next.js 15+, so we need to await it
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const fallbackId = pathParts[pathParts.length - 1] || null
    const resolvedParams = params ? await params : {}
    const { id: paramId } = resolvedParams
    const id = paramId || fallbackId
    if (!id) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 })
    }

    const body = await req.json()

    // Parse incoming fields
    const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : undefined
    const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : undefined
    const departmentId = body.department_id === undefined ? undefined : (body.department_id || null)
    const privilege = body.privilege === undefined
      ? undefined
      : (typeof body.privilege === 'number' ? body.privilege : Number(body.privilege))
    const isActive = body.is_active === undefined ? undefined : Boolean(body.is_active)
    const cardNumber = body.card_number === undefined ? undefined : (body.card_number || null)
    const individualTz1 = body.individual_tz_1 === undefined ? undefined : (body.individual_tz_1 === null || body.individual_tz_1 === '' ? null : Number(body.individual_tz_1))
    const individualTz2 = body.individual_tz_2 === undefined ? undefined : (body.individual_tz_2 === null || body.individual_tz_2 === '' ? null : Number(body.individual_tz_2))
    const individualTz3 = body.individual_tz_3 === undefined ? undefined : (body.individual_tz_3 === null || body.individual_tz_3 === '' ? null : Number(body.individual_tz_3))
    const password = body.password === undefined ? undefined : (body.password || null)

    const updates = {}
    if (firstName !== undefined) updates.first_name = firstName
    if (lastName !== undefined) updates.last_name = lastName
    if (departmentId !== undefined) updates.department_id = departmentId
    if (privilege !== undefined) {
      if (!Number.isFinite(privilege)) {
        return NextResponse.json({ error: 'privilege must be a number' }, { status: 400 })
      }
      updates.privilege = privilege
    }
    if (isActive !== undefined) updates.is_active = isActive
    if (cardNumber !== undefined) updates.card_number = cardNumber
    if (individualTz1 !== undefined) {
      if (individualTz1 !== null && !Number.isFinite(individualTz1)) return NextResponse.json({ error: 'individual_tz_1 must be integer or null' }, { status: 400 })
      updates.individual_tz_1 = individualTz1
    }
    if (individualTz2 !== undefined) {
      if (individualTz2 !== null && !Number.isFinite(individualTz2)) return NextResponse.json({ error: 'individual_tz_2 must be integer or null' }, { status: 400 })
      updates.individual_tz_2 = individualTz2
    }
    if (individualTz3 !== undefined) {
      if (individualTz3 !== null && !Number.isFinite(individualTz3)) return NextResponse.json({ error: 'individual_tz_3 must be integer or null' }, { status: 400 })
      updates.individual_tz_3 = individualTz3
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update employee in Supabase (always save to database, including privilege)
    const { data: updated, error: updateError } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select('id, first_name, last_name, zk_user_id, privilege, is_active, card_number, department_id, individual_tz_1, individual_tz_2, individual_tz_3')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Try to push to device (optional - failures don't block the update)
    // Skip device push if no zk_user_id or if device is not available
    const pythonBridgeBase = process.env.PYTHON_BRIDGE_URL
    const zkUserId = updated?.zk_user_id
    
    if (pythonBridgeBase && zkUserId !== null && zkUserId !== undefined) {
      const fullName = `${updated?.first_name || ''} ${updated?.last_name || ''}`.trim()
      
      // Minimalist payload - ONLY send fields that device supports
      // NOTE: Privilege is NOT included - device doesn't support privilege changes
      // Privilege is stored in database for web app access control only
      const pushPayload = {
        id: zkUserId,
        name: fullName || 'Unknown',
        password: password || '',
        enabled: Boolean(updated?.is_active)
      }

      // Push user information to device (optional - failures are logged but don't fail the request)
      try {
        const bridgeUrl = pythonBridgeBase.replace(/\/$/, '')
        const fullBridgeUrl = `${bridgeUrl}/api/zk/set-user`
        console.log('[employee-update] Attempting device push:', fullBridgeUrl)
        console.log('[employee-update] Payload:', pushPayload)
        
        const bridgeRes = await fetch(fullBridgeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pushPayload),
          signal: AbortSignal.timeout(10000), // Reduced timeout
        })

        if (!bridgeRes.ok) {
          const errText = await bridgeRes.text().catch(() => '')
          console.warn('[employee-update] Device push failed (non-blocking):', {
            statusCode: bridgeRes.status,
            statusText: bridgeRes.statusText,
            responseBody: errText.substring(0, 200), // Limit log size
          })
          // Don't return error - continue with database update
        } else {
          console.log('[employee-update] Device push successful')
        }
      } catch (e) {
        console.warn('[employee-update] Device push error (non-blocking):', e.message || String(e))
        // Don't return error - continue with database update
      }

      // Push individual schedule overrides (TZs) to device (optional)
      try {
        const tzPayload = {
          id: zkUserId,
          tz_id_1: updated?.individual_tz_1 ?? null,
          tz_id_2: updated?.individual_tz_2 ?? null,
          tz_id_3: updated?.individual_tz_3 ?? null,
        }
        const tzRes = await fetch(`${pythonBridgeBase.replace(/\/$/, '')}/api/zk/set-user-tz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tzPayload),
          signal: AbortSignal.timeout(10000),
        })
        if (!tzRes.ok) {
          const errText = await tzRes.text().catch(() => '')
          console.warn('[employee-update] Device TZ push failed (non-blocking):', {
            statusCode: tzRes.status,
            statusText: tzRes.statusText,
          })
          // Don't return error - continue with database update
        } else {
          console.log('[employee-update] Device TZ push successful')
        }
      } catch (e) {
        console.warn('[employee-update] Device TZ push error (non-blocking):', e.message || String(e))
        // Don't return error - continue with database update
      }
    } else {
      console.log('[employee-update] Skipping device push (no bridge URL or zk_user_id)')
    }

    // Always return success - database update is the source of truth
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


