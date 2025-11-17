/**
 * Backfill Attendance Cache Script
 * 
 * Populates the daily_attendance_calculations table with historical data
 * for the last N days (default: 30 days) for all active employees.
 * 
 * Usage:
 *   node scripts/backfill-attendance-cache.js [days]
 * 
 * Example:
 *   node scripts/backfill-attendance-cache.js 30
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

async function backfillCache(days = 30) {
  console.log(`\n=== Starting cache backfill for last ${days} days ===\n`)

  // Calculate date range
  const endDate = new Date()
  endDate.setUTCHours(0, 0, 0, 0)
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - days)

  const startDateStr = startDate.toISOString().slice(0, 10)
  const endDateStr = endDate.toISOString().slice(0, 10)

  console.log(`Date range: ${startDateStr} to ${endDateStr}`)

  // Fetch all active employees
  console.log('\nFetching active employees...')
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, employee_id, first_name, last_name')
    .eq('is_active', true)

  if (empError) {
    console.error('Error fetching employees:', empError)
    process.exit(1)
  }

  console.log(`Found ${employees.length} active employees`)

  // Process employees in batches
  const batchSize = 5
  let processed = 0
  let cached = 0
  let errors = 0

  for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize)
    
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(employees.length / batchSize)} (employees ${i + 1}-${Math.min(i + batchSize, employees.length)})`)

    const promises = batch.map(async (employee) => {
      try {
        // Call the API endpoint which will calculate and cache
        // We use the service role key to bypass RLS
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/reports/daily-work-time?employee_id=${employee.id}&start_date=${startDateStr}&end_date=${endDateStr}`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`  ❌ ${employee.first_name} ${employee.last_name} (${employee.employee_id}): ${errorData.error}`)
          return { success: false, employee }
        }

        const result = await response.json()
        const calculated = result.calculated || 0
        const cached = result.cached || 0

        console.log(`  ✅ ${employee.first_name} ${employee.last_name} (${employee.employee_id}): ${calculated} calculated, ${cached} cached`)
        return { success: true, employee, calculated, cached }
      } catch (error) {
        console.error(`  ❌ ${employee.first_name} ${employee.last_name} (${employee.employee_id}): ${error.message}`)
        return { success: false, employee, error: error.message }
      }
    })

    const results = await Promise.all(promises)
    
    results.forEach(result => {
      processed++
      if (result.success) {
        cached += result.calculated || 0
      } else {
        errors++
      }
    })

    // Small delay between batches to avoid overwhelming the system
    if (i + batchSize < employees.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`\n=== Backfill Complete ===`)
  console.log(`Processed: ${processed} employees`)
  console.log(`Cached: ${cached} calculations`)
  console.log(`Errors: ${errors}`)
  console.log(`\n`)
}

// Get days from command line argument
const days = process.argv[2] ? parseInt(process.argv[2], 10) : 30

if (isNaN(days) || days < 1) {
  console.error('Error: Days must be a positive number')
  process.exit(1)
}

backfillCache(days)
  .then(() => {
    console.log('Backfill completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })

