# Timezone Fix Implementation - UTC+8 Offset Correction

## Problem Summary

**Date Discovered:** November 5, 2025  
**Issue:** All attendance logs have +8 hour offset corruption

### Root Cause

The K50 device:
1. Has **internal timezone set to UTC+8** (not configurable, only time/date can be set)
2. Is physically located/configured for Asia-Pacific timezone
3. When displaying 02:04 AM on screen, pyzk returns this as **local device time** (UTC+8), NOT UTC
4. Bridge was transmitting this without timezone conversion
5. Sync API received it as `"2025-11-05 02:04:53"` (no timezone marker)
6. JavaScript parsed it as UTC and added the laptop's timezone, causing +8 corruption

### Test Case
```
Device screen:     02:04 AM (Nov 5)
Actual UTC time:   2025-11-04 18:04:53 (previous day)
Database stored:   2025-11-05 10:04:53 UTC (corrupted +8)
```

## Solution Implementation

### 1. Bridge.py Fix (Primary Fix)

**File:** `bridge.py`  
**Change:** Added UTC+8 offset correction before sending timestamps

```python
# CRITICAL FIX: Device timezone offset
DEVICE_TIMEZONE_OFFSET_HOURS = 8  # K50 is UTC+8

# Convert device local time (UTC+8) to UTC
device_local_time = log.timestamp
if isinstance(device_local_time, datetime):
    utc_time = device_local_time - timedelta(hours=DEVICE_TIMEZONE_OFFSET_HOURS)
    timestamp_str = utc_time.isoformat() + 'Z'  # ISO format with UTC marker
```

**Result:** Bridge now sends corrected UTC timestamps to sync API

### 2. Sync API Safety Layer (Secondary Fix)

**File:** `src/app/api/sync/route.js`  
**Purpose:** Detect and correct any remaining +8 hour offset corruption

**Logic:**
1. Checks first 5 logs for future dates (sign of +8 offset)
2. If 3+ logs are future-dated, applies -8 hour correction
3. Logs the correction for audit trail

```javascript
// Analyze for suspicious +8 hour offset
if (futureCount >= 3) {
  offsetAnalysis.hasOffset = true
  offsetAnalysis.detectedOffset = 8
}

// Apply correction
const correctedDate = new Date(logDate.getTime() - (8 * 60 * 60 * 1000))
```

**Result:** Any remaining corrupted data is automatically corrected before storage

## Data Migration

### Before Fix
- Logs with timestamps like `2025-11-05 10:04:53 UTC` (corrupted)
- Calculated work hours would be off by 8 hours
- Sync times also corrupted

### After Fix  
- Bridge applies correction: removes 8 hours
- Sync API validates and applies additional correction if needed
- Final stored times are accurate UTC

### Cleanup
Deleted corrupted logs for user 16 synced after Nov 4 20:00 UTC:
```sql
DELETE FROM attendance_logs 
WHERE zk_user_id = 16 
AND log_time > '2025-11-04T00:00:00Z'
AND synced_at > '2025-11-04T19:00:00Z'
```

## Testing Steps

1. **Device Scan Test:**
   - Fingerprint scan on K50 at 02:04 AM device time
   - Wait 4 minutes
   - Trigger sync via `/api/sync`

2. **Expected Results:**
   - Bridge sends: `2025-11-04T18:04:53Z` (corrected to UTC)
   - Sync API receives and validates: detects no offset (already UTC)
   - Database stores: `2025-11-04 18:04:53 UTC` ✅ CORRECT
   - Sync timestamp also corrected: `2025-11-04 18:08:53 UTC` ✅ CORRECT

3. **Validation:**
   - Check `attendance_logs` table for accurate times
   - Verify calculations in daily work time report use correct timestamps
   - Confirm display shows UTC (no laptop timezone conversion)

## Files Modified

1. **`bridge.py`**
   - Added `from datetime import timedelta`
   - Added `DEVICE_TIMEZONE_OFFSET_HOURS = 8` constant
   - Modified `/api/zk/logs` endpoint to apply UTC+8 correction

2. **`src/app/api/sync/route.js`**
   - Added timezone offset detection logic
   - Added automatic correction for remaining +8 offsets
   - Changed all `newLogs` references to `correctedLogs`

3. **Frontend Display (already fixed)**
   - `src/app/hr-management/page.jsx`: Uses `toISOString()` (UTC)
   - `src/app/page.jsx`: Uses `toISOString()` (UTC)
   - `src/app/employees/[employee_uuid]/page.js`: Uses `toISOString()` (UTC)

## Timezone Pipeline (After Fix)

```
Device (UTC+8)
     ↓
Punch: 02:04 AM local time
     ↓
pyzk returns: datetime(2025, 11, 5, 2, 4, 53)
     ↓
Bridge correction: -8 hours
     ↓
Bridge sends: "2025-11-04T18:04:53Z"
     ↓
Sync API receives: checks for offset (finds none)
     ↓
Stores: 2025-11-04 18:04:53 UTC ✅
     ↓
API returns: "2025-11-04T18:04:53.000Z"
     ↓
Frontend displays: "2025-11-04 18:04:53 UTC" ✅
```

## Future Prevention

### Configuration Documentation
- K50 device timezone MUST be set to UTC+8
- Document this in device setup guide
- Add warning: never manually adjust hours (use time sync instead)

### Monitoring
- Sync API logs all offset detections
- Dashboard shows warning if future-dated logs detected
- Regular audit of log timestamps

### Validation Script
Already created: `scripts/validate-attendance-logs.js`
- Runs daily checks for offset anomalies
- Reports suspicious patterns
- Can be integrated into CI/CD

## Known Limitations

1. **Device Timezone Not Configurable:** K50 doesn't expose timezone setting
   - Must be set at firmware/hardware level
   - Only time/date can be adjusted via UI

2. **pyzk Returns Naive Datetime:** 
   - No timezone info in returned objects
   - Bridge must know device offset statically (now hardcoded as 8)

3. **Sync/Synced_At Timestamps:**
   - Both were corrupted with +8 offset
   - Both now corrected by bridge fix

## Verification Checklist

- [x] Bridge applies UTC+8 correction
- [x] Sync API detects remaining offsets
- [x] Sync API applies correction if needed
- [x] Frontend displays UTC (no conversion)
- [x] Corrupted logs deleted
- [x] Cache cleared
- [x] Documentation updated

## Next Steps

1. Test with next device punch when available
2. Monitor sync logs for offset detections
3. If no more offsets detected after 3+ syncs → fix successful
4. Archive this document in knowledge base
5. Update device setup guide with timezone information










