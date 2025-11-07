import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Sync employees from Python Bridge ZK device users
 * GET /api/sync-employees
 * 
 * Fetches users from Python Bridge (which gets them from ZK device)
 * and creates/updates employees in Supabase
 */
export async function GET() {
  try {
    // Step 1: Fetch users from Python Bridge
    const pythonBridgeUrl = process.env.PYTHON_BRIDGE_URL
      ? process.env.PYTHON_BRIDGE_URL.replace('/api/zk/logs', '/api/zk/users')
      : null
    
    if (!pythonBridgeUrl) {
      // Fallback: try to get users from logs and extract unique user_ids
      // For now, we'll need the bridge to support /api/zk/users endpoint
      return NextResponse.json(
        { error: 'PYTHON_BRIDGE_URL not configured for users endpoint' },
        { status: 500 }
      )
    }

    // Fetch users from Python Bridge (if endpoint exists)
    const response = await fetch(pythonBridgeUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch users from Python Bridge: ${response.statusText}`)
    }

    const users = await response.json()

    if (!Array.isArray(users)) {
      throw new Error('Invalid response from Python Bridge: expected an array')
    }

    // Step 2: Map ZK users to Supabase employees format
    const employeesToUpsert = users.map((user) => {
      // Parse name - ZK device might store name in different formats
      const fullName = user.name || user.user_name || ''
      const nameParts = fullName.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      return {
        employee_id: `ZK-${user.user_id || user.id || user.uid}`,
        first_name: firstName || `User ${user.user_id || user.id || user.uid}`,
        last_name: lastName,
        zk_user_id: user.user_id || user.id || user.uid,
        is_active: true,
      }
    })

    // Step 3: Upsert employees into Supabase
    const { data: insertedData, error: insertError } = await supabase
      .from('employees')
      .upsert(employeesToUpsert, {
        onConflict: 'zk_user_id',
        ignoreDuplicates: false,
      })
      .select()

    if (insertError) {
      console.error('Error inserting employees:', insertError)
      throw new Error(`Failed to insert employees into Supabase: ${insertError.message}`)
    }

    const insertedCount = insertedData?.length || 0

    return NextResponse.json({
      success: true,
      message: 'Employees synced successfully',
      employeesSynced: insertedCount,
      totalUsers: users.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sync employees error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during employee sync',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}






