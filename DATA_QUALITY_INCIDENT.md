# Data Quality Incident Report: UTC Offset Corruption

**Date Discovered:** 2025-11-02  
**Severity:** CRITICAL  
**Status:** RESOLVED  
**Impact:** Attendance log calculations showing incorrect times and mixed shift data

## Incident Summary

Attendance logs in the Supabase `attendance_logs` table were corrupted with a systematic **+7 hour UTC offset** applied to all timestamps. This caused:
- Report calculations to show wrong check-in/check-out times
- Overnight shifts to be misaligned across multiple days
- Employee hour calculations to be significantly off

## Example of Corruption

**Device logs (correct):**
```
02:54:42 AM on Oct 31
04:48:53 AM on Oct 31
07:34:11 AM on Oct 31
08:25:48 AM on Oct 31
21:34:52 PM on Oct 31  ← Actual check-in for new shift
07:08:16 AM on Nov 01  ← Actual check-out
```

**Database stored (corrupted):**
```
2025-10-31 09:54:42+00  ← Should be 02:54:42
2025-10-31 11:48:53+00  ← Should be 04:48:53
2025-10-31 14:34:11+00  ← Should be 07:34:11
2025-10-31 15:25:48+00  ← Should be 08:25:48
2025-11-01 04:34:52+00  ← Should be 21:34:52 (Oct 31)
2025-11-01 14:08:16+00  ← Should be 07:08:16
```

**Impact on Reports:**
- Oct 31 shift showed: `07:34:11 to 21:34:52` (9 hours, calculated as 5.01 overtime)
- Should have shown: `21:34:52 to 07:08:16` (9h 33m, 0.33 overtime)
- Also included stray punches that shouldn't belong to that shift

## Root Cause Analysis

### Why Did This Happen?

The `pyzk` library returns attendance logs with datetime objects that are **already in UTC**. However, the sync process was:

1. Converting device datetime to ISO string → Already UTC
2. Storing in Supabase with `toISOString()` → Still UTC
3. BUT somewhere in the pipeline, an **additional +7 hour conversion was being applied**

This suggests either:
- A timezone conversion library was applied twice
- An environment variable for local timezone was being used incorrectly
- The database or ORM layer was applying its own offset

### Timeline

- **Earlier (Unknown date):** Initial sync with corrupted offset
- **2025-10-30 to 2025-11-02:** All attendance logs stored with +7h offset
- **2025-11-02:** User noticed report showing wrong times
- **2025-11-02:** Root cause identified as UTC offset corruption
- **2025-11-02:** Corrupted records deleted, fixes implemented

## Resolution Steps Taken

✅ **Step 1: Data Cleanup**
```sql
DELETE FROM attendance_logs 
WHERE employee_id = '1fe37860-0d31-4087-9f2c-f8685f140caa' 
AND log_time >= '2025-10-30';
```
All corrupted records for affected employee removed.

✅ **Step 2: Root Cause Prevention**
- Added automatic timezone offset detection in sync process
- Timestamps > 6 hours different from expected are flagged and rejected
- Always store as UTC without conversion

✅ **Step 3: Validation Script**
- Created `validate-attendance-logs.js` to detect suspicious offsets
- Runs on-demand or scheduled to catch future corruption

## Files Modified

1. **`src/app/api/sync/route.js`**
   - Added timezone offset validation
   - Detects if log times deviate unexpectedly from device time
   - Rejects suspicious records instead of storing them

2. **`scripts/validate-attendance-logs.js`** (NEW)
   - Queries database for suspicious offsets
   - Compares against expected timezone range
   - Generates detailed report of anomalies

3. **`src/app/api/reports/daily-work-time/route.js`**
   - Added comprehensive debug logging
   - Logs punch matching and shift calculations for audit trail

## Prevention Measures Going Forward

### 1. Automatic Offset Detection
- Check device time vs database time during sync
- Flag anything > 6 hours as suspicious
- Log all offsets for monitoring

### 2. Validation Script (Run Daily)
```bash
node scripts/validate-attendance-logs.js
```
Checks for:
- Offset anomalies (> ±6 hours from UTC)
- Duplicate records
- Future-dated logs
- Missing records

### 3. Enhanced Logging
All sync operations now log:
- Original device time
- Converted time
- Calculated offset
- Any validation errors

### 4. Data Quality Checks
- Reject logs with offsets > ±6 hours
- Validate employee exists before inserting
- Ensure log_time is within reasonable range
- Check for duplicate timestamps

## For Developers

When syncing attendance logs:

```javascript
// ❌ WRONG - applies offset to already-UTC datetime
const deviceTime = logObject.timestamp; // Already UTC from device
const offset = 7 * 60 * 60 * 1000; // WRONG!
const dbTime = new Date(deviceTime.getTime() + offset); // Double conversion!

// ✅ CORRECT - store device time as-is (it's already UTC)
const deviceTime = logObject.timestamp; // Already UTC from device
const dbTime = deviceTime; // Store directly, no conversion
```

## Testing

Test the validation script:
```bash
# Check current database for anomalies
node scripts/validate-attendance-logs.js

# Check specific date range
node scripts/validate-attendance-logs.js --from 2025-10-30 --to 2025-11-02

# Generate detailed report
node scripts/validate-attendance-logs.js --report
```

## Lessons Learned

1. **Always log timezone conversions** - Make it explicit when converting
2. **Validate at multiple layers** - Sync, storage, and retrieval
3. **Monitor for anomalies** - Scheduled validation catches issues early
4. **Test with overnight shifts** - These are most affected by offset errors
5. **Keep audit trails** - Debug logs helped identify the exact corruption

## Future Prevention

- [ ] Add integration tests for timezone handling
- [ ] Set up scheduled validation (daily at midnight)
- [ ] Create alerts for offset anomalies (> ±2 hours)
- [ ] Document expected timezone handling for all developers
- [ ] Consider storing raw device timestamps separately for audit




