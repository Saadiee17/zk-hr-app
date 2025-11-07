import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Sync attendance logs from Python Bridge to Supabase
 * GET /api/sync
 * 
 * Fetches logs from Python Bridge, compares with existing records,
 * and inserts only new records into Supabase attendance_logs table
 */
export async function GET() {
  try {
    // Step 1: Fetch attendance logs from Python Bridge
    const pythonBridgeUrl = process.env.PYTHON_BRIDGE_URL
    
    if (!pythonBridgeUrl) {
      return NextResponse.json(
        { error: 'PYTHON_BRIDGE_URL environment variable is not set' },
        { status: 500 }
      )
    }

    // Fetch logs from Python Bridge
    let response
    try {
      response = await fetch(pythonBridgeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
    } catch (fetchError) {
      // Handle network errors (connection refused, timeout, etc.)
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request to Python Bridge timed out after 30 seconds. Please check if the bridge is running at ${pythonBridgeUrl}`)
      }
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error(`Failed to connect to Python Bridge at ${pythonBridgeUrl}. Please ensure the bridge is running and accessible.`)
      }
      throw new Error(`Network error connecting to Python Bridge: ${fetchError.message}`)
    }

    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = ''
      try {
        const errorBody = await response.text()
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody)
            errorDetails = parsed.error || parsed.message || errorBody
          } catch {
            errorDetails = errorBody
          }
        }
      } catch {
        // Ignore errors when reading error body
      }
      
      const statusText = response.statusText || 'Unknown Error'
      const statusCode = response.status
      
      if (statusCode === 404) {
        throw new Error(`Python Bridge endpoint not found (404). Please verify:\n1. The bridge is running\n2. The URL is correct: ${pythonBridgeUrl}\n3. The endpoint /api/zk/logs exists\n${errorDetails ? `\nError details: ${errorDetails}` : ''}`)
      } else if (statusCode === 500) {
        throw new Error(`Python Bridge server error (500). ${errorDetails ? `Error: ${errorDetails}` : 'Please check the bridge logs for details.'}`)
      } else {
        throw new Error(`Failed to fetch logs from Python Bridge: ${statusCode} ${statusText}${errorDetails ? ` - ${errorDetails}` : ''}`)
      }
    }

    const logs = await response.json()

    if (!Array.isArray(logs)) {
      throw new Error('Invalid response from Python Bridge: expected an array')
    }

    // Step 2: Query Supabase for the most recent log timestamp
    const { data: latestLog, error: queryError } = await supabase
      .from('attendance_logs')
      .select('log_time')
      .order('log_time', { ascending: false })
      .limit(1)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is okay for first sync
      console.error('Error querying latest log:', queryError)
      // Continue with empty latestTimestamp
    }

    const latestTimestamp = latestLog?.log_time
      ? new Date(latestLog.log_time)
      : null

    // Step 3: Filter logs to include only records newer than the most recent log
    const newLogs = logs.filter((log) => {
      if (!latestTimestamp) {
        // No existing logs, include all
        return true
      }

      // Parse timestamp from Python Bridge response
      const logTimestamp = new Date(log.timestamp)
      
      // Check if log is newer than the latest recorded timestamp
      // Using > instead of >= to handle edge cases where timestamps might match
      return logTimestamp > latestTimestamp
    })

    // SAFETY LAYER: Check for and correct timezone offset corruption
    // If bridge sends times with +5 hour offset, detect and correct them
    console.log(`[SYNC] Checking for timezone offset corruption in ${newLogs.length} logs...`)
    
    // Analyze first few logs to detect offset pattern
    const offsetAnalysis = {
      hasOffset: false,
      detectedOffset: 0,
      samplesChecked: 0,
    }
    
    if (newLogs.length > 0) {
      // Check if logs have suspicious future dates or consistent offset pattern
      const now = new Date()
      let futureCount = 0
      
      for (let i = 0; i < Math.min(newLogs.length, 5); i++) {
        const logDate = new Date(newLogs[i].timestamp)
        if (logDate > now) {
          futureCount++
        }
        offsetAnalysis.samplesChecked++
      }
      
      // If most recent logs are future-dated, they likely have +5 offset
      if (futureCount >= 3) {
        console.warn(`[SYNC] WARNING: Detected ${futureCount}/${offsetAnalysis.samplesChecked} future-dated logs. Likely UTC+5 offset corruption!`)
        offsetAnalysis.hasOffset = true
        offsetAnalysis.detectedOffset = 5
      }
    }
    
    // Apply correction if offset detected
    const correctedLogs = newLogs.map(log => {
      if (offsetAnalysis.hasOffset && offsetAnalysis.detectedOffset > 0) {
        const logDate = new Date(log.timestamp)
        // Subtract the detected offset hours
        const correctedDate = new Date(logDate.getTime() - (offsetAnalysis.detectedOffset * 60 * 60 * 1000))
        console.log(`[SYNC] Correcting timestamp: ${log.timestamp} → ${correctedDate.toISOString()}`)
        return {
          ...log,
          timestamp: correctedDate.toISOString()
        }
      }
      return log
    })
    
    if (offsetAnalysis.hasOffset) {
      console.log(`[SYNC] Offset Correction Applied: -${offsetAnalysis.detectedOffset} hours to ${correctedLogs.length} logs`)
    }

    // NEW: Step 3.5 - Validate timezone offsets to prevent corruption
    // pyzk library returns timestamps that are already UTC from the device
    // We should NOT apply any additional offset - store them as-is
    console.log(`[SYNC] Validating timezone offsets for ${correctedLogs.length} logs after correction...`)
    
    const MAX_OFFSET_HOURS = 6 // Flag anything with offset > ±6 hours as suspicious
    const offsetStats = {
      totalChecked: 0,
      suspicious: 0,
      suspiciousLogs: [],
      offsetDistribution: {}
    }
    
    // Check each log for suspicious offsets
    for (const log of correctedLogs) {
      const logDate = new Date(log.timestamp)
      if (isNaN(logDate.getTime())) continue
      
      offsetStats.totalChecked++
      
      // After correction, logs should be in reasonable range (past 30 days to few hours in future)
      // Any remaining issues suggest other problems
      
      const now = new Date()
      const timeDiff = Math.abs(now.getTime() - logDate.getTime())
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000)
      
      // Flag logs that are > 30 days old or in the future
      // (reasonable range for backlog syncing)
      if (daysDiff > 30) {
        offsetStats.suspicious++
        offsetStats.suspiciousLogs.push({
          timestamp: log.timestamp,
          userId: log.id || log.user_id,
          daysDiff: daysDiff.toFixed(2),
          reason: 'Log too old (> 30 days)',
        })
      }
      
      if (logDate > now) {
        offsetStats.suspicious++
        offsetStats.suspiciousLogs.push({
          timestamp: log.timestamp,
          userId: log.id || log.user_id,
          reason: 'Future-dated log (after correction)',
        })
      }
      
      // Track offset distribution for monitoring
      const hourOfDay = logDate.getUTCHours()
      offsetStats.offsetDistribution[hourOfDay] = (offsetStats.offsetDistribution[hourOfDay] || 0) + 1
    }
    
    if (offsetStats.suspicious > 0) {
      console.warn(`[SYNC] WARNING: ${offsetStats.suspicious} suspicious logs detected:`, offsetStats.suspiciousLogs)
    }
    
    console.log(`[SYNC] Timezone offset validation complete:`, {
      totalChecked: offsetStats.totalChecked,
      suspicious: offsetStats.suspicious,
      distribution: offsetStats.offsetDistribution
    })

    // Step 4: Create/update employees from ZK device user data
    // Do this BEFORE checking for new logs, so employees are always created/updated
    // Extract ALL unique users from logs (not just new ones) to ensure employees are synced
    const allUniqueUsers = new Map()
    correctedLogs.forEach(log => {
      const zkUserId = log.id || log.user_id
      if (zkUserId && !allUniqueUsers.has(zkUserId)) {
        const fullName = log.name || log.user_name || ''
        const nameParts = fullName.trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        // Convert zk_user_id to integer (database column is INTEGER)
        const zkUserIdInt = parseInt(zkUserId, 10) || 0

        allUniqueUsers.set(zkUserId, {
          zk_user_id: zkUserIdInt,
          employee_id: `ZK-${zkUserId}`,
          first_name: firstName || `User ${zkUserId}`,
          last_name: lastName,
          is_active: true,
        })
      }
    })

    // Upsert employees from ZK device data (create/update all employees)
    if (allUniqueUsers.size > 0) {
      const employeesToUpsert = Array.from(allUniqueUsers.values())
      console.log(`Upserting ${employeesToUpsert.length} employees from ZK device`)
      
      const { data: upsertedEmployees, error: upsertError } = await supabase
        .from('employees')
        .upsert(employeesToUpsert, {
          onConflict: 'zk_user_id',
          ignoreDuplicates: false,
        })
        .select()

      if (upsertError) {
        console.error('Error upserting employees:', upsertError)
        // Continue even if employee upsert fails, but log it
      } else {
        console.log(`Successfully upserted ${upsertedEmployees?.length || 0} employees`)
      }
    }

    // Step 5: If no new logs to sync, return early (but employees are already created above)
    if (correctedLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new logs to sync',
        newRecordsInserted: 0,
        totalFetched: logs.length,
        latestTimestamp: latestTimestamp?.toISOString() || null,
        employeesSynced: allUniqueUsers.size,
      })
    }

    // Step 7: Fetch employee mappings (zk_user_id -> employee UUID)
    // Convert zk_user_ids to integers for database query (zk_user_id column is INTEGER)
    const uniqueZkUserIds = [...new Set(correctedLogs.map(log => {
      const userId = log.id || log.user_id
      return userId ? parseInt(userId, 10) : null
    }))].filter(id => id !== null && !isNaN(id))
    
    // Query employees table to get employee_id (UUID) for each zk_user_id
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, zk_user_id')
      .in('zk_user_id', uniqueZkUserIds)
      .eq('is_active', true)

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      // Continue without employee_id linking if fetch fails
    }

    // Create a map for quick lookup: zk_user_id -> employee_id (UUID)
    const employeeMap = new Map()
    if (employees) {
      employees.forEach(emp => {
        if (emp.zk_user_id) {
          employeeMap.set(emp.zk_user_id, emp.id)
        }
      })
    }

    // Step 8: Map the logs to match Supabase schema
    // Python Bridge returns: { uid, id (user_id), timestamp, status, punch, name, user_name }
    // Supabase schema expects: { zk_user_id, uid, log_time, status, punch, employee_id }
    const mappedLogs = correctedLogs.map((log) => {
      // Parse and validate timestamp
      const logTimestamp = new Date(log.timestamp)
      if (isNaN(logTimestamp.getTime())) {
        throw new Error(`Invalid timestamp in log: ${log.timestamp}`)
      }

      // Get zk_user_id from log and convert to integer
      const zkUserId = log.id || log.user_id
      const zkUserIdInt = zkUserId ? parseInt(zkUserId, 10) : null
      
      // Look up employee_id (UUID) from employees table using zk_user_id (as integer)
      const employeeId = zkUserIdInt && !isNaN(zkUserIdInt) ? employeeMap.get(zkUserIdInt) : null

      return {
        zk_user_id: zkUserIdInt || 0, // Map from log.id/user_id to zk_user_id (as integer)
        uid: log.uid || null,
        log_time: logTimestamp.toISOString(), // Use log_time column name
        status: log.status,
        punch: log.punch || null,
        employee_id: employeeId || null, // Link to employee UUID if found
        // Note: ZK device name (log.name or log.user_name) is not stored in attendance_logs
        // but can be used to create/update employees in the employees table
      }
    })
    
    // NEW: Log timestamp mapping details for audit trail
    if (mappedLogs.length > 0) {
      console.log(`[SYNC] Sample log mappings (first 3):`)
      mappedLogs.slice(0, 3).forEach((mapped, idx) => {
        console.log(`  [${idx}] Device → DB: ${correctedLogs[idx].timestamp} → ${mapped.log_time}`)
      })
    }

    // Step 9: Batch insert the new logs into Supabase
    // Using upsert with ignoreDuplicates to handle potential race conditions
    const { data: insertedData, error: insertError } = await supabase
      .from('attendance_logs')
      .upsert(mappedLogs, {
        onConflict: 'zk_user_id,log_time,status', // Use the unique constraint with log_time
        ignoreDuplicates: false, // Update if exists (to handle status changes)
      })
      .select()

    if (insertError) {
      console.error('Error inserting logs:', insertError)
      throw new Error(`Failed to insert logs into Supabase: ${insertError.message}`)
    }

    // Step 10: Return JSON response with number of new records inserted
    const insertedCount = insertedData?.length || 0

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      newRecordsInserted: insertedCount,
      totalFetched: logs.length,
      filteredNew: correctedLogs.length,
      latestTimestamp: latestTimestamp?.toISOString() || null,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during sync',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Allow POST method as well for manual triggers
export async function POST() {
  return GET()
}

