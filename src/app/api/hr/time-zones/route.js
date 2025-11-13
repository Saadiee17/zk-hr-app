import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/hr/time-zones - list all TZs (service role)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('time_zones')
      .select('*')
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unexpected error' }, { status: 500 })
  }
}









