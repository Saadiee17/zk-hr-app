# Timezone Architecture: Device to Display

**Status:** ✅ CALCULATIONS ARE SAFE | ✅ DISPLAY NOW SHOWS PURE UTC

## Complete Data Flow (CORRECTED)

```
┌─────────────────────────────────────────┐
│  ZK Device (located in UTC+7 timezone)  │
│  Device local time: 02:54:42            │ ← Oct 31 punch
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Python Bridge (/api/zk/logs)          │
│  pyzk library returns: UTC timestamps   │ ← 2025-10-31T02:54:42Z
│  No conversion applied - already UTC   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Sync API (/api/sync)                   │
│  ✅ Validates timestamps                │
│  ✅ Stores as UTC (no +7 offset)       │ ← "2025-10-31T02:54:42Z"
│  ✅ No timezone conversion            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Supabase Database                      │
│  log_time: "2025-10-31T02:54:42Z"      │ ← Pure UTC, no offset
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Daily Work Time Report API             │
│  ✅ Fetches UTC timestamps              │
│  ✅ Uses UTC calculations ONLY          │
│  ✅ setUTCHours(), getUTCDay()          │ ← No offset added
│  ✅ Returns ISO strings (pure UTC)      │ ← "2025-10-31T02:54:42.000Z"
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Frontend Browser (FIXED)                │
│  ✅ Displays UTC exactly as received    │ ← "2025-10-31 02:54:42 UTC"
│  ✅ NO timezone conversion              │
│  ✅ Shows what came from database      │
└──────────────────────────────────────────┘
```

## Key Points (CORRECTED)

### Important Clarification
- Device is **located in UTC+7 timezone** (Bangkok)
- Device **returns data in UTC** (no offset, just Z suffix)
- Throughout the entire pipeline: **PURE UTC, no +7 offset**
- Frontend now displays: **Exactly what the database sent (UTC)**

### Terminology
- ❌ WRONG: "Device uses UTC+7"
- ✅ CORRECT: "Device is located in UTC+7 timezone, but returns UTC data"

## Timeline of Data

```
Device Local Time:    02:54:42 (Oct 31, Bangkok time = UTC+7)
Device Sends:         2025-10-31T02:54:42Z (this is UTC, no conversion applied)
Database Stores:      2025-10-31T02:54:42Z (pure UTC)
API Calculates:       Using UTC only (setUTCHours, getUTCDay)
API Returns:          2025-10-31T02:54:42.000Z (UTC)
Frontend Displays:    2025-10-31 02:54:42 UTC (exactly as received)
```

## Display Changes (FIXED)

**Files Updated:**
- `src/app/hr-management/page.jsx` (line 1068)
- `src/app/page.jsx` (line 197)
- `src/app/employees/[employee_uuid]/page.js` (line 88)

**Before (WRONG):**
```javascript
new Date(d.inTime).toLocaleString()
// Converts UTC to laptop timezone
// If laptop is UTC+2: shows wrong time
```

**After (CORRECT):**
```javascript
new Date(d.inTime).toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
// Displays pure UTC exactly as from database
// Shows: "2025-10-31 02:54:42 UTC"
```

## Summary

✅ **Device location:** UTC+7 (Bangkok)
✅ **Device data:** UTC (pure, no offset)
✅ **Pipeline:** UTC → UTC → UTC → UTC
✅ **Storage:** UTC (no +7)
✅ **Calculations:** UTC only (correct)
✅ **Display:** UTC exactly as received (now fixed)
