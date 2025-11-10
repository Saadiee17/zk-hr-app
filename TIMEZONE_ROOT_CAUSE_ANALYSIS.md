# Timezone Offset Root Cause Analysis - UTC+8 Discrepancy

## Critical Finding: UTC+8 Offset Detected

**Date of Discovery:** November 5, 2025
**Test Method:** Direct device fingerprint scan followed by immediate sync

### Test Data

```
DEVICE DISPLAY:    02:04 AM (local time on K50 screen)
DATABASE STORED:   2025-11-05 10:04:53 UTC
SYNC TIMESTAMP:    2025-11-04 21:08:53 UTC
OFFSET DETECTED:   +8 HOURS
```

### The Problem

**Device screen shows:** 2:04 AM  
**Database log_time:** 10:04:53 UTC on Nov 5

This is a **+8 hour offset**, meaning:
- Device internal clock: **UTC+8** (Hong Kong/Beijing/Singapore timezone)
- Device display: Shows local time (2:04 AM) but appears to claim it's Pakistan time
- Data transmission: pyzk is returning timestamps as if they're UTC, but they're actually **local time at UTC+8**

### Why This Matters

The K50 device:
1. **Has NO timezone setting** - only time/date can be set
2. **Internal clock is set to UTC+8** - likely configured by someone in an Asian timezone
3. **When you set it to "Pakistan time"** - you manually adjusted the hour/date, but the timezone offset in the firmware remained UTC+8
4. **pyzk's behavior** - returns `log.timestamp` as a datetime object that pyzk treats as local time, NOT as UTC

### The Root Cause Chain

```
┌─────────────────────────────────────────────────────┐
│  Step 1: Device Internal State                      │
│  • Timezone offset: UTC+8 (firmware/hardware set)  │
│  • When time is 02:04 AM at UTC+8                  │
│  • Actual UTC time: 02:04 - 8 hours = 18:04 prev  │
│  • But device says it's "2:04 AM local"            │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Step 2: Device Logs Entry                          │
│  • K50 stores: timestamp = 2025-11-05 02:04:53    │
│  • With internal offset: UTC+8                     │
│  • Actual UTC: 2025-11-04 18:04:53                 │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Step 3: pyzk Retrieval                             │
│  • pyzk.get_attendance() reads log from device     │
│  • Returns: datetime(2025, 11, 5, 2, 4, 53, ???)  │
│  • pyzk interprets this as "naive" datetime        │
│  • Does NOT apply -8 hour offset                   │
│  • Assumption: returns as-is, assumes UTC?         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Step 4: Bridge.py Transmission                     │
│  • bridge.py: str(log.timestamp)                   │
│  • Returns: "2025-11-05 02:04:53"                  │
│  • NO timezone info, NO explicit UTC marker        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Step 5: Sync API Reception                         │
│  • Next.js sync API receives: "2025-11-05 02:04:53"│
│  • Code: new Date("2025-11-05 02:04:53")           │
│  • JavaScript interprets as LOCAL browser time!    │
│  • But browser has UTC+0 or UTC+2 (laptop)         │
│  • Adds 8 more hours: 02:04 + 8 = 10:04           │
│  • Stores: 2025-11-05 10:04:53 UTC ❌ WRONG!      │
└─────────────────────────────────────────────────────┘
```

### Why the Sync Time is Different

```
Sync timestamp: 2025-11-04 21:08:53 UTC

This is when the sync API ran, NOT related to the log time.
The sync happened ~9 hours after the log was created (device time).
Time difference: 21:08:53 - 02:04:53 = 19:04 hours (9+ hours accounting for timezone)
```

### Solution: Detect and Handle Device Timezone

The K50 device is returning **local time, not UTC**. We need to:

1. **Detect the device timezone** - The +8 offset is consistent in all recent logs
2. **Apply reverse offset before storage** - When pyzk returns `02:04:53`, convert it: `02:04:53 - 8 hours = 18:04 previous day`
3. **Store as true UTC** - Save the corrected UTC time to Supabase

### Data Validation

Looking at the logs in Supabase for user 16:
```sql
log_time: "2025-11-05 10:04:53+00"  ← Expected UTC+8 time, but +8 hours added
log_time: "2025-11-05 10:03:39+00"  ← Same pattern
log_time: "2025-11-05 08:56:25+00"  ← Consistent +8 offset
```

All times follow the pattern: `Device local time + 8 hours = Database UTC`

This proves the device is operating in UTC+8 timezone.

### Action Items

1. **Immediate:** Identify device timezone offset (appears to be UTC+8)
2. **Implement:** Add offset detection in sync process
3. **Fix:** Reverse-apply the offset before storing in database
4. **Document:** Add device timezone configuration to setup guide
5. **Validate:** Re-sync logs after fix to verify correct UTC times

### Why Previous Fix Didn't Work

The earlier "data corruption with +7 hour offset" was based on old corrupted data. The **actual device offset is +8 hours, not +7**. The current issue is ongoing because pyzk is returning local device time (UTC+8) without converting to UTC, and the sync API is treating it as UTC, causing the +8 hour corruption in the database.




