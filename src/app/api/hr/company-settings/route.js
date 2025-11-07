import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/company-settings - Get company-wide settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .order('setting_key', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    
    // Convert array to object for easier access
    const settings = {}
    if (data) {
      data.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value
      })
    }
    
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/hr/company-settings - Update company-wide settings
// Body: { buffer_time_minutes?: number, working_day_start_time?: string, working_day_enabled?: boolean }
export async function POST(req) {
  try {
    const body = await req.json()
    const bufferTimeMinutes = body?.buffer_time_minutes
    const workingDayStartTime = body?.working_day_start_time
    const workingDayEnabled = body?.working_day_enabled

    const updates = []

    // Update buffer_time_minutes if provided
    if (bufferTimeMinutes != null) {
      if (!Number.isFinite(Number(bufferTimeMinutes)) || Number(bufferTimeMinutes) < 0) {
        return NextResponse.json({ error: 'buffer_time_minutes must be a non-negative number' }, { status: 400 })
      }
      updates.push({
        setting_key: 'buffer_time_minutes',
        setting_value: String(bufferTimeMinutes),
        description: 'Company-wide default buffer time in minutes for late-in calculation',
      })
    }

    // Update working_day_enabled if provided
    if (workingDayEnabled !== undefined) {
      updates.push({
        setting_key: 'working_day_enabled',
        setting_value: String(workingDayEnabled === true || workingDayEnabled === 'true'),
        description: 'Enable working day concept. When enabled, working day spans from working_day_start_time to 9:59 AM next day. When disabled, uses calendar dates.',
      })
    }

    // Update working_day_start_time if provided
    if (workingDayStartTime != null) {
      // Validate format: HH:MM (e.g., "10:00", "09:30")
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(workingDayStartTime)) {
        return NextResponse.json({ error: 'working_day_start_time must be in HH:MM format (e.g., "10:00")' }, { status: 400 })
      }
      updates.push({
        setting_key: 'working_day_start_time',
        setting_value: workingDayStartTime,
        description: 'Working day start time in HH:MM format. Working day spans from this time to 9:59 AM next day.',
      })
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 })
    }

    // Upsert all settings
    const { data, error } = await supabase
      .from('company_settings')
      .upsert(updates, { onConflict: 'setting_key', ignoreDuplicates: false })
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}


