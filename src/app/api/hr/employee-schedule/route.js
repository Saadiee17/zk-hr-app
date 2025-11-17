import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Parse schedule segment (8 chars: HHMMHHMM)
const parseScheduleSegment = (seg) => {
  if (!seg || seg.length !== 8) return null
  const startHHMM = seg.slice(0, 4)
  const endHHMM = seg.slice(4, 8)
  
  // Non-working day check
  if (startHHMM === '0000' && endHHMM === '2359') {
    return null // Day off
  }
  
  return {
    startHHMM,
    endHHMM,
  }
}

// Format HHMM to readable time (HH:MM AM/PM)
const formatTime = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return '--:--'
  const hour = parseInt(hhmm.slice(0, 2))
  const min = hhmm.slice(2, 4)
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour12}:${min} ${ampm}`
}

// GET /api/hr/employee-schedule?employee_id=UUID - Get employee's current schedule
export async function GET(req) {
  try {
    const url = new URL(req.url)
    const employeeId = url.searchParams.get('employee_id')
    if (!employeeId) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })

    // Fetch employee
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, individual_tz_1, department_id')
      .eq('id', employeeId)
      .maybeSingle()

    if (empError) throw empError
    if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    // Determine which timezone to use (individual override or department default)
    let tzId = emp.individual_tz_1 || null
    let scheduleType = 'individual'
    
    if (!tzId && emp.department_id) {
      const { data: sched, error: schedErr } = await supabase
        .from('schedules')
        .select('tz_id_1')
        .eq('department_id', emp.department_id)
        .maybeSingle()
      if (!schedErr && sched) {
        tzId = sched.tz_id_1 || null
        scheduleType = 'department'
      }
    }

    if (!tzId) {
      return NextResponse.json({
        success: true,
        data: {
          schedule_type: 'none',
          schedule_name: null,
          weekly_schedule: []
        }
      })
    }

    // Fetch timezone details
    const { data: tz, error: tzError } = await supabase
      .from('time_zones')
      .select('id, name, tz_string')
      .eq('id', tzId)
      .maybeSingle()

    if (tzError) throw tzError
    if (!tz || !tz.tz_string) {
      return NextResponse.json({
        success: true,
        data: {
          schedule_type: scheduleType,
          schedule_name: tz?.name || 'Unknown',
          weekly_schedule: []
        }
      })
    }

    // Parse tz_string into weekly schedule
    // tz_string format: 56 chars, 8 chars per day (Sun=0, Mon=1, ..., Sat=6)
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weeklySchedule = []
    
    for (let weekday = 0; weekday < 7; weekday++) {
      const start = weekday * 8
      const seg = tz.tz_string.slice(start, start + 8)
      const shift = parseScheduleSegment(seg)
      
      weeklySchedule.push({
        day: weekDays[weekday],
        isWorking: shift !== null,
        startTime: shift ? formatTime(shift.startHHMM) : null,
        endTime: shift ? formatTime(shift.endHHMM) : null,
        rawStart: shift ? shift.startHHMM : null,
        rawEnd: shift ? shift.endHHMM : null,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule_type: scheduleType,
        schedule_name: tz.name,
        weekly_schedule: weeklySchedule
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}








