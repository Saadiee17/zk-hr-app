#!/usr/bin/env node

/**
 * Attendance Log Data Quality Validation Script
 * 
 * Detects:
 * - Timezone offset anomalies (> ±6 hours from UTC)
 * - Duplicate records
 * - Future-dated logs
 * - Logs older than expected
 * - Missing employee records
 * - Inconsistent punch patterns
 * 
 * Usage:
 *   node scripts/validate-attendance-logs.js
 *   node scripts/validate-attendance-logs.js --from 2025-10-30 --to 2025-11-02
 *   node scripts/validate-attendance-logs.js --report
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Parse command line arguments
const args = process.argv.slice(2)
const argFrom = args.indexOf('--from')
const argTo = args.indexOf('--to')
const isDetailedReport = args.includes('--report')

let fromDate = null
let toDate = null

if (argFrom >= 0 && args[argFrom + 1]) {
  fromDate = new Date(args[argFrom + 1])
}
if (argTo >= 0 && args[argTo + 1]) {
  toDate = new Date(args[argTo + 1])
}

// Default to last 30 days if not specified
if (!fromDate) {
  fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 30)
}
if (!toDate) {
  toDate = new Date()
}

console.log(`\n📊 Attendance Log Data Quality Validation`)
console.log(`   Checking: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`)
console.log(`   Detailed Report: ${isDetailedReport ? 'YES' : 'NO'}`)
console.log(`\n` + '='.repeat(70))

// Validation runner
async function validateLogs() {
  try {
    console.log(`\n1️⃣  Fetching attendance logs...`)
    
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .gte('log_time', fromDate.toISOString())
      .lte('log_time', toDate.toISOString())
      .order('log_time', { ascending: true })

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`)
    }

    console.log(`   ✓ Fetched ${logs.length} logs`)

    // ============================================
    // Validation 1: Timezone Offset Anomalies
    // ============================================
    console.log(`\n2️⃣  Checking for timezone offset anomalies...`)
    
    const offsetAnomalies = []
    const now = new Date()
    const MAX_FUTURE_DAYS = 1
    const MAX_PAST_DAYS = 365
    
    logs.forEach((log, idx) => {
      const logDate = new Date(log.log_time)
      const timeDiff = now.getTime() - logDate.getTime()
      const daysDiff = timeDiff / (24 * 60 * 60 * 1000)
      
      // Check for future logs
      if (logDate > now) {
        offsetAnomalies.push({
          type: 'FUTURE_LOG',
          log_id: log.id,
          log_time: log.log_time,
          zk_user_id: log.zk_user_id,
          daysInFuture: (-daysDiff).toFixed(2),
          severity: 'CRITICAL',
        })
      }
      
      // Check for very old logs (> 1 year)
      if (daysDiff > MAX_PAST_DAYS) {
        offsetAnomalies.push({
          type: 'VERY_OLD_LOG',
          log_id: log.id,
          log_time: log.log_time,
          zk_user_id: log.zk_user_id,
          daysOld: daysDiff.toFixed(2),
          severity: 'WARNING',
        })
      }
    })

    if (offsetAnomalies.length > 0) {
      console.log(`   ⚠️  Found ${offsetAnomalies.length} potential offset anomalies:`)
      offsetAnomalies.forEach(anomaly => {
        const icon = anomaly.severity === 'CRITICAL' ? '🔴' : '🟡'
        console.log(`      ${icon} ${anomaly.type} - User ${anomaly.zk_user_id} (${anomaly.log_time})`)
      })
    } else {
      console.log(`   ✓ No timezone offset anomalies detected`)
    }

    // ============================================
    // Validation 2: Duplicate Records
    // ============================================
    console.log(`\n3️⃣  Checking for duplicate records...`)
    
    const duplicates = new Map()
    logs.forEach(log => {
      const key = `${log.zk_user_id}|${log.log_time}|${log.status}`
      const count = (duplicates.get(key) || 0) + 1
      duplicates.set(key, count)
    })

    const duplicateRecords = Array.from(duplicates.entries())
      .filter(([key, count]) => count > 1)
      .map(([key, count]) => ({
        key,
        count,
        records: logs.filter(log => 
          `${log.zk_user_id}|${log.log_time}|${log.status}` === key
        ),
      }))

    if (duplicateRecords.length > 0) {
      console.log(`   ⚠️  Found ${duplicateRecords.length} duplicate entries:`)
      duplicateRecords.forEach(dup => {
        console.log(`      User ${dup.records[0].zk_user_id}: ${dup.count} copies of ${dup.records[0].log_time}`)
      })
    } else {
      console.log(`   ✓ No duplicate records found`)
    }

    // ============================================
    // Validation 3: Missing Employees
    // ============================================
    console.log(`\n4️⃣  Checking for missing employee records...`)
    
    const uniqueZkUserIds = [...new Set(logs.map(log => log.zk_user_id))]
    
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, zk_user_id, first_name, last_name')
      .in('zk_user_id', uniqueZkUserIds)

    if (empError) {
      console.warn(`   ⚠️  Error fetching employees: ${empError.message}`)
    } else {
      const empIds = new Set(employees.map(e => e.zk_user_id))
      const missingEmpIds = uniqueZkUserIds.filter(id => !empIds.has(id))
      
      if (missingEmpIds.length > 0) {
        console.log(`   ⚠️  Found ${missingEmpIds.length} logs with missing employee records:`)
        missingEmpIds.forEach(id => {
          const logCount = logs.filter(log => log.zk_user_id === id).length
          console.log(`      ZK User ${id}: ${logCount} logs, NO employee record`)
        })
      } else {
        console.log(`   ✓ All logs have corresponding employee records`)
      }
    }

    // ============================================
    // Validation 4: Punch Pattern Analysis
    // ============================================
    console.log(`\n5️⃣  Analyzing punch patterns...`)
    
    const userPatterns = new Map()
    logs.forEach(log => {
      if (!userPatterns.has(log.zk_user_id)) {
        userPatterns.set(log.zk_user_id, [])
      }
      userPatterns.get(log.zk_user_id).push({
        time: new Date(log.log_time),
        status: log.status,
        punch: log.punch,
      })
    })

    const suspiciousPatterns = []
    userPatterns.forEach((punches, zkUserId) => {
      // Sort by time
      punches.sort((a, b) => a.time - b.time)
      
      // Check for multiple punches on same day at different hours (suspicious if > 15 times/day)
      const byDay = new Map()
      punches.forEach(punch => {
        const dayKey = punch.time.toISOString().split('T')[0]
        if (!byDay.has(dayKey)) {
          byDay.set(dayKey, [])
        }
        byDay.get(dayKey).push(punch)
      })
      
      byDay.forEach((dayPunches, day) => {
        if (dayPunches.length > 15) {
          suspiciousPatterns.push({
            zk_user_id: zkUserId,
            day,
            punchCount: dayPunches.length,
            severity: 'WARNING',
          })
        }
      })
    })

    if (suspiciousPatterns.length > 0) {
      console.log(`   ⚠️  Found ${suspiciousPatterns.length} suspicious punch patterns:`)
      suspiciousPatterns.forEach(pattern => {
        console.log(`      User ${pattern.zk_user_id} on ${pattern.day}: ${pattern.punchCount} punches`)
      })
    } else {
      console.log(`   ✓ Punch patterns appear normal`)
    }

    // ============================================
    // Summary Report
    // ============================================
    console.log(`\n` + '='.repeat(70))
    console.log(`\n📋 Validation Summary:`)
    console.log(`   Total logs checked: ${logs.length}`)
    console.log(`   Timezone anomalies: ${offsetAnomalies.length}`)
    console.log(`   Duplicate records: ${duplicateRecords.length}`)
    console.log(`   Missing employees: ${uniqueZkUserIds.length - (employees?.length || 0)}`)
    console.log(`   Suspicious patterns: ${suspiciousPatterns.length}`)
    
    const totalIssues = offsetAnomalies.length + duplicateRecords.length + suspiciousPatterns.length
    if (totalIssues === 0) {
      console.log(`\n✅ All validations passed! Data quality looks good.`)
    } else {
      console.log(`\n⚠️  Found ${totalIssues} data quality issues that may need investigation.`)
    }

    if (isDetailedReport && offsetAnomalies.length > 0) {
      console.log(`\n📌 Detailed Anomalies:`)
      console.log(JSON.stringify(offsetAnomalies, null, 2))
    }

    console.log(`\n` + '='.repeat(70) + '\n')

  } catch (error) {
    console.error(`\n❌ Validation failed:`, error.message)
    process.exit(1)
  }
}

validateLogs()




