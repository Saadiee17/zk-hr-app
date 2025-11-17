/**
 * Test Cache Endpoints Script
 * Tests the cache implementation by calling API endpoints and verifying behavior
 */

const BASE_URL = 'http://localhost:3000'

async function testCacheEndpoint() {
  console.log('\n=== Testing Cache Implementation ===\n')

  // Get an employee ID from Supabase
  const employeeId = '3a47314a-07ef-434c-b8a7-d9426f8a5317' // From test data
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  console.log(`Testing with Employee ID: ${employeeId}`)
  console.log(`Date range: ${yesterday} to ${today}\n`)

  // Test 1: First call (should calculate and cache)
  console.log('Test 1: First API call (should calculate and cache)')
  console.log('─'.repeat(60))
  const start1 = Date.now()
  try {
    const response1 = await fetch(
      `${BASE_URL}/api/reports/daily-work-time?employee_id=${employeeId}&start_date=${yesterday}&end_date=${today}`
    )
    const result1 = await response1.json()
    const time1 = Date.now() - start1

    console.log(`✅ Response received in ${time1}ms`)
    console.log(`   Status: ${response1.ok ? 'OK' : 'ERROR'}`)
    console.log(`   Data points: ${result1.data?.length || 0}`)
    console.log(`   Cached: ${result1.cached || 0}`)
    console.log(`   Calculated: ${result1.calculated || 0}`)
    
    if (result1.data && result1.data.length > 0) {
      console.log(`   Sample result:`, {
        date: result1.data[0].date,
        status: result1.data[0].status,
        durationHours: result1.data[0].durationHours
      })
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
  }

  console.log('\n')

  // Test 2: Second call (should use cache - fast!)
  console.log('Test 2: Second API call (should use cache - FAST!)')
  console.log('─'.repeat(60))
  const start2 = Date.now()
  try {
    const response2 = await fetch(
      `${BASE_URL}/api/reports/daily-work-time?employee_id=${employeeId}&start_date=${yesterday}&end_date=${today}`
    )
    const result2 = await response2.json()
    const time2 = Date.now() - start2

    console.log(`✅ Response received in ${time2}ms`)
    console.log(`   Status: ${response2.ok ? 'OK' : 'ERROR'}`)
    console.log(`   Data points: ${result2.data?.length || 0}`)
    console.log(`   Cached: ${result2.cached || result2.cached === true ? 'YES' : 'NO'}`)
    console.log(`   Calculated: ${result2.calculated || 0}`)
    
    if (time2 < time1 * 0.5) {
      console.log(`   ⚡ SPEED IMPROVEMENT: ${((time1 - time2) / time1 * 100).toFixed(1)}% faster!`)
    }

    // Verify results match
    if (result1.data && result2.data) {
      const match = JSON.stringify(result1.data) === JSON.stringify(result2.data)
      console.log(`   Results match: ${match ? '✅ YES' : '❌ NO'}`)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
  }

  console.log('\n')

  // Test 3: Batch endpoint
  console.log('Test 3: Batch endpoint (all employees for today)')
  console.log('─'.repeat(60))
  const start3 = Date.now()
  try {
    const response3 = await fetch(
      `${BASE_URL}/api/reports/daily-work-time/batch?date=${today}`
    )
    const result3 = await response3.json()
    const time3 = Date.now() - start3

    console.log(`✅ Response received in ${time3}ms`)
    console.log(`   Status: ${response3.ok ? 'OK' : 'ERROR'}`)
    console.log(`   Employees: ${result3.data?.length || 0}`)
    console.log(`   Cached: ${result3.cached || 0}`)
    console.log(`   Calculated: ${result3.calculated || 0}`)
    
    if (result3.data && result3.data.length > 0) {
      const statusCounts = {}
      result3.data.forEach(emp => {
        statusCounts[emp.status] = (statusCounts[emp.status] || 0) + 1
      })
      console.log(`   Status breakdown:`, statusCounts)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
  }

  console.log('\n')

  // Test 4: Verify cache in database
  console.log('Test 4: Verify cache entries in database')
  console.log('─'.repeat(60))
  try {
    // This would require Supabase client - for now just report
    console.log('   Check database manually or use Supabase MCP')
    console.log('   Query: SELECT COUNT(*) FROM daily_attendance_calculations;')
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
  }

  console.log('\n=== Test Complete ===\n')
}

// Run tests
testCacheEndpoint().catch(console.error)

