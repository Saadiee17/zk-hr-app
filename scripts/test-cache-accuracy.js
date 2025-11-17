/**
 * Cache Accuracy Test Script
 * 
 * Compares results from cached implementation vs current implementation
 * to ensure calculation accuracy is maintained.
 * 
 * Usage:
 *   node scripts/test-cache-accuracy.js [employee_id] [start_date] [end_date]
 * 
 * Example:
 *   node scripts/test-cache-accuracy.js
 *   node scripts/test-cache-accuracy.js <uuid> 2025-01-01 2025-01-31
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper to normalize results for comparison
function normalizeResult(result) {
  return {
    date: result.date,
    status: result.status,
    inTime: result.inTime ? new Date(result.inTime).toISOString() : null,
    outTime: result.outTime ? new Date(result.outTime).toISOString() : null,
    durationHours: Math.round((result.durationHours || 0) * 100) / 100,
    regularHours: Math.round((result.regularHours || 0) * 100) / 100,
    overtimeHours: Math.round((result.overtimeHours || 0) * 100) / 100,
  }
}

// Compare two results
function compareResults(cached, calculated, employeeName, date) {
  const cachedNorm = normalizeResult(cached)
  const calculatedNorm = normalizeResult(calculated)
  
  const differences = []
  
  if (cachedNorm.date !== calculatedNorm.date) {
    differences.push(`date: ${cachedNorm.date} vs ${calculatedNorm.date}`)
  }
  if (cachedNorm.status !== calculatedNorm.status) {
    differences.push(`status: ${cachedNorm.status} vs ${calculatedNorm.status}`)
  }
  if (cachedNorm.inTime !== calculatedNorm.inTime) {
    differences.push(`inTime: ${cachedNorm.inTime} vs ${calculatedNorm.inTime}`)
  }
  if (cachedNorm.outTime !== calculatedNorm.outTime) {
    differences.push(`outTime: ${cachedNorm.outTime} vs ${calculatedNorm.outTime}`)
  }
  if (Math.abs(cachedNorm.durationHours - calculatedNorm.durationHours) > 0.01) {
    differences.push(`durationHours: ${cachedNorm.durationHours} vs ${calculatedNorm.durationHours}`)
  }
  if (Math.abs(cachedNorm.regularHours - calculatedNorm.regularHours) > 0.01) {
    differences.push(`regularHours: ${cachedNorm.regularHours} vs ${calculatedNorm.regularHours}`)
  }
  if (Math.abs(cachedNorm.overtimeHours - calculatedNorm.overtimeHours) > 0.01) {
    differences.push(`overtimeHours: ${cachedNorm.overtimeHours} vs ${calculatedNorm.overtimeHours}`)
  }
  
  if (differences.length > 0) {
    console.error(`  ❌ ${employeeName} - ${date}:`)
    differences.forEach(diff => console.error(`     ${diff}`))
    return false
  }
  
  return true
}

async function testCacheAccuracy(employeeId = null, startDateStr = null, endDateStr = null) {
  console.log(`\n=== Testing Cache Accuracy ===\n`)

  // Determine test scope
  let employees = []
  let testStartDate = startDateStr
  let testEndDate = endDateStr

  if (employeeId) {
    // Test specific employee
    const { data: emp, error } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle()

    if (error || !emp) {
      console.error(`Error: Employee not found: ${employeeId}`)
      process.exit(1)
    }

    employees = [emp]
  } else {
    // Test all active employees for last 7 days
    const { data: emps, error } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .eq('is_active', true)
      .limit(10) // Limit to 10 employees for testing

    if (error) {
      console.error('Error fetching employees:', error)
      process.exit(1)
    }

    employees = emps || []

    if (!testStartDate || !testEndDate) {
      const endDate = new Date()
      endDate.setUTCDate(endDate.getUTCDate() - 1) // Yesterday
      const startDate = new Date(endDate)
      startDate.setUTCDate(startDate.getUTCDate() - 6) // 7 days ago

      testStartDate = startDate.toISOString().slice(0, 10)
      testEndDate = endDate.toISOString().slice(0, 10)
    }
  }

  console.log(`Testing ${employees.length} employee(s) from ${testStartDate} to ${testEndDate}\n`)

  let totalTests = 0
  let passedTests = 0
  let failedTests = 0

  for (const employee of employees) {
    const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.employee_id

    console.log(`Testing ${employeeName} (${employee.employee_id})...`)

    try {
      // First, clear cache for this employee and date range to force recalculation
      await supabase
        .from('daily_attendance_calculations')
        .delete()
        .eq('employee_id', employee.id)
        .gte('date', testStartDate)
        .lte('date', testEndDate)

      // Call API - this will calculate and cache
      const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/reports/daily-work-time?employee_id=${employee.id}&start_date=${testStartDate}&end_date=${testEndDate}`
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`  ❌ API call failed: ${errorData.error}`)
        failedTests++
        continue
      }

      const apiResult = await response.json()
      const calculatedResults = apiResult.data || []

      // Now fetch from cache
      const { data: cachedResults, error: cacheError } = await supabase
        .from('daily_attendance_calculations')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('date', testStartDate)
        .lte('date', testEndDate)
        .order('date', { ascending: true })

      if (cacheError) {
        console.error(`  ❌ Cache fetch failed: ${cacheError.message}`)
        failedTests++
        continue
      }

      // Compare results
      const calculatedMap = new Map(calculatedResults.map(r => [r.date, r]))
      const cachedMap = new Map((cachedResults || []).map(r => [r.date, r]))

      // Check all calculated dates exist in cache
      for (const [date, calculated] of calculatedMap) {
        totalTests++
        const cached = cachedMap.get(date)

        if (!cached) {
          console.error(`  ❌ ${employeeName} - ${date}: Missing from cache`)
          failedTests++
          continue
        }

        // Format cached result to match API format
        const cachedFormatted = {
          date: cached.date,
          status: cached.status,
          inTime: cached.in_time,
          outTime: cached.out_time,
          durationHours: Number(cached.duration_hours) || 0,
          regularHours: Number(cached.regular_hours) || 0,
          overtimeHours: Number(cached.overtime_hours) || 0,
        }

        if (compareResults(cachedFormatted, calculated, employeeName, date)) {
          passedTests++
        } else {
          failedTests++
        }
      }

      // Check for extra cached dates (shouldn't happen, but worth checking)
      for (const [date, cached] of cachedMap) {
        if (!calculatedMap.has(date)) {
          console.warn(`  ⚠️  ${employeeName} - ${date}: Extra entry in cache (not in calculated results)`)
        }
      }

      console.log(`  ✅ ${employeeName}: ${calculatedResults.length} dates tested`)
    } catch (error) {
      console.error(`  ❌ ${employeeName}: ${error.message}`)
      failedTests++
    }
  }

  console.log(`\n=== Test Results ===`)
  console.log(`Total tests: ${totalTests}`)
  console.log(`Passed: ${passedTests}`)
  console.log(`Failed: ${failedTests}`)
  console.log(`Success rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0}%`)

  if (failedTests > 0) {
    console.error(`\n❌ Tests failed! Cache accuracy issues detected.`)
    process.exit(1)
  } else {
    console.log(`\n✅ All tests passed! Cache is accurate.`)
    process.exit(0)
  }
}

// Get parameters from command line
const employeeId = process.argv[2] || null
const startDate = process.argv[3] || null
const endDate = process.argv[4] || null

testCacheAccuracy(employeeId, startDate, endDate)
  .catch((error) => {
    console.error('Test failed:', error)
    process.exit(1)
  })

