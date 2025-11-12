# Complete Timezone Flow: Device → Database → Dashboard

## The Complete Data Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: DEVICE (K50 - Pakistan UTC+5)                          │
├─────────────────────────────────────────────────────────────────┤
│ Device Screen: 02:24:02 AM (Nov 5, 2025) - Pakistan local time  │
│ Device Time: UTC+5 (Pakistan timezone)                          │
│ Device Internal: Stores as local time (02:24:02)               │
└────────────────────────┬────────────────────────────────────────┘
                         │ pyzk retrieves
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: PYTHON BRIDGE (bridge.py)                              │
├─────────────────────────────────────────────────────────────────┤
│ Raw from pyzk: "2025-11-05 02:24:02" (local device time)       │
│ Bridge Action: Subtract 5 hours (UTC+5 → UTC)                  │
│ Converted: 2025-11-04T21:24:02Z (UTC)                         │
│ Sent to Next.js: {timestamp: "2025-11-04T21:24:02Z"}          │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON response
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: SYNC API & DATABASE (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│ Received: {timestamp: "2025-11-04T21:24:02Z"}                 │
│ Validation: Check for timezone offset corruption               │
│ Storage: INSERT INTO attendance_logs                           │
│           (log_time: '2025-11-04T21:24:02Z',                  │
│            synced_at: '2025-11-04T21:36:41Z')                 │
│ ✅ Stored as UTC (Z marker = UTC timezone)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │ API call
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: CALCULATIONS (API Routes)                              │
├─────────────────────────────────────────────────────────────────┤
│ /api/reports/daily-work-time:                                  │
│   • Input: log_time = '2025-11-04T21:24:02Z' (UTC)            │
│   • Uses: getUTCHours(), getUTCDay() for calculations          │
│   • Output: duration, overtime, status (all UTC-based)         │
│ ✅ Calculations ALWAYS use UTC (timezone-agnostic)              │
│ ✅ Results are ACCURATE regardless of local timezone            │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON response
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: FRONTEND DISPLAY (React Components)                    │
├─────────────────────────────────────────────────────────────────┤
│ Received: inTime = '2025-11-04T21:24:02Z' (UTC from database) │
│ formatUTC12Hour() function:                                    │
│   1. Parse: new Date('2025-11-04T21:24:02Z')                  │
│   2. Add 5 hours: date + (5 * 60 * 60 * 1000) milliseconds    │
│   3. Result: 2025-11-05 02:24:02 (Pakistan time!)             │
│   4. Format: "11/05/2025, 02:24:02 AM" (12-hour format)       │
│ ✅ Display shows Pakistan time (what user expects)              │
│ ✅ 24-hour offset accounted for (Nov 5 at 02:24 AM)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: Your Test Punch

| Stage | Value | Timezone | Explanation |
|-------|-------|----------|-------------|
| **Device Screen** | 11/05/2025 02:24:02 AM | Pakistan UTC+5 | What you see on K50 |
| **pyzk Returns** | 2025-11-05 02:24:02 | Local device time | pyzk gives local time |
| **Bridge Converts** | 2025-11-04 21:24:02 | UTC | Subtract 5 hours |
| **Database Stores** | 2025-11-04T21:24:02Z | UTC | Stored with Z marker |
| **Calculation Uses** | 2025-11-04T21:24:02Z | UTC | `getUTCHours()`, etc. |
| **Dashboard Shows** | 11/05/2025 02:24:02 AM | Pakistan UTC+5 | Add 5 hours back |

---

## Key Implementation Details

### Bridge.py (UTC+5 Correction)
```python
DEVICE_TIMEZONE_OFFSET_HOURS = 5  # K50 is UTC+5

# When pyzk returns local time, subtract 5 hours to get UTC
if log.timestamp:
    local_time = datetime.fromisoformat(str(log.timestamp))
    utc_time = local_time - timedelta(hours=DEVICE_TIMEZONE_OFFSET_HOURS)
    return {'timestamp': utc_time.isoformat() + 'Z'}
```

### Frontend Display (Pakistan UTC+5 for Display)
```javascript
const formatUTC12Hour = (timestamp) => {
  const date = new Date(timestamp)  // Parse UTC timestamp
  // Add 5 hours to convert UTC → Pakistan time
  const pakistaniDate = new Date(date.getTime() + 5 * 60 * 60 * 1000)
  return pakistaniDate.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'UTC'  // Use UTC since we manually added offset
  })
}
```

---

## Why This Works

✅ **Calculations are accurate**: All done in UTC, independent of any timezone  
✅ **Display is intuitive**: Shows Pakistan time, matching device and user expectations  
✅ **No data loss**: UTC is stored, can be converted to any timezone  
✅ **Date boundary handled**: UTC+5 offset can cross date boundaries (e.g., 21:24 UTC → 02:24 next day Pakistan)  
✅ **Consistent**: All reports, dashboards, and logs use same formatting

---

## Verification

When you see `11/05/2025, 02:24:02 AM` on the dashboard:
1. ✅ Device showed 02:24:02 AM on Nov 5
2. ✅ Calculations used the correct UTC time
3. ✅ Display converted back to Pakistan timezone
4. ✅ Everything matches!





