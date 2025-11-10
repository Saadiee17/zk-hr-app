# Schedule-Aware Shift Matching Logic

## Overview

The system now uses **schedule-based matching** instead of time-gap heuristics to match device punches to employee shifts. This makes it robust against complex scenarios like breaks, overnight shifts, late arrivals, and shift transitions.

## Key Principles

### 1. **Schedule is Source of Truth**
- Each day has a scheduled shift time (e.g., "20:00" to "05:00" = 8 PM to 5 AM)
- All punches are matched to scheduled shifts, not arbitrary time gaps
- Non-working days (marked as "0000-2359") are automatically skipped

### 2. **Multi-Punch Handling (Breaks)**
- Multiple punches in a day are treated as **work with breaks**
- Example: Punch at 8:00 AM, 12:00 PM (lunch out), 1:00 PM (lunch back), 5:00 PM
  - All 4 punches belong to the same shift
  - Work time = (12:00-8:00) + (1:00 PM-1:00 PM skip, actual work=0) + (5:00-1:00) = 9 hours of work
  - Breaks > 30 minutes are subtracted from total

### 3. **Scheduling Window (±2-4 hours)**
- **Pre-shift buffer (-120 min)**: Employee can clock in up to 2 hours early
- **Post-shift buffer (+240 min)**: Employee can clock out up to 4 hours late
- Punches within this window belong to that shift

## Matching Algorithm

### Step 1: Build Schedule Map
```
For each day in range (startDate → endDate):
  - Parse schedule segment (8 chars)
  - Skip if "0000-2359" (off day)
  - Store shift times: start HHMM, end HHMM, crossesMidnight flag
```

### Step 2: Assign Punches to Shifts
```
For each punch (timestamped device scan):
  For each scheduled day:
    Calculate shift window = [start - 2h, end + 4h]
    If punch time in window:
      Assign punch to this shift → MATCHED
      Break (don't check other days)

  If punch NOT matched to any scheduled shift:
    Find closest scheduled shift (within 24 hours)
    Assign punch to closest shift (fallback)
```

**Why this works better than time gaps:**
- Respects the actual schedule, not arbitrary 8-hour limits
- Handles overnight shifts (8 PM - 5 AM) correctly
- Handles employees punching in early without triggering new shifts
- Handles breaks (multiple punches stay grouped)

### Step 3: Calculate Hours for Each Shift
```
Punches for shift: [8:00, 12:00, 13:00, 17:00]

If only 2 punches: 
  Work time = OUT time - IN time

If 3+ punches (multiple work periods):
  For each consecutive pair:
    breakDuration = next_punch - current_punch
    If breakDuration > 30 minutes:
      It's a break (lunch, etc) → skip
    Else:
      It's work time → add to total
  
  Result: Sum of all work periods
```

## Handled Scenarios

### ✅ Scenario 1: Normal Day with Lunch Break
```
Schedule: 9:00 - 17:00 (8 hours)
Punches: 9:05, 12:00, 13:00, 17:15

Calculation:
- Window: [7:00, 21:15]
- All punches in window → same shift
- Work periods: (12:00-9:05) + (17:15-13:00) = 2h55m + 4h15m = 7h10m
- Lunch break (1h) automatically excluded
- Status: On-Time (9:05 ≤ 9:05 + grace)
- Regular hours: 7.17 (< 8 hour schedule)
```

### ✅ Scenario 2: Late Arrival, Extended Shift
```
Schedule: 8:00 - 16:00 (8 hours)
Punches: 10:30, 18:45

Calculation:
- Window: [6:00, 20:45]
- Both punches in window → same shift
- Work time: 18:45 - 10:30 = 8h15m
- Status: Late-In (10:30 > 8:05 grace)
- Regular hours: 8.0
- Overtime: 0.25 hours (15 minutes over schedule)
```

### ✅ Scenario 3: Overnight Shift (Crosses Midnight)
```
Schedule: 20:00 (8 PM) - 05:00 (5 AM next day)
Date: Oct 22, 2024

Punches:
- Oct 22 at 20:30 (8:30 PM)
- Oct 23 at 04:45 (4:45 AM next morning)

Calculation:
- Window: [18:00 Oct 22, 09:45 Oct 23]
- Both punches in window → same shift
- Work time: 04:45 Oct 23 - 20:30 Oct 22 = 8h15m
- Status: On-Time (20:30 ≤ 20:05 + grace)
- Regular hours: 8.0 (including overnight portion)
```

### ✅ Scenario 4: Very Late Arrival, Complete 9-Hour Shift
```
Schedule: 8:00 - 16:00 (8 hours)
Punches on Oct 25: 15:30, 00:30 (next day)

Calculation:
- Window for Oct 25: [6:00, 20:45]
- 15:30 is in window → assigned to Oct 25 shift
- 00:30 (Oct 26) is NOT in Oct 25 window
  But it's within 24h of Oct 25, so assigned as fallback
- Work time: 00:30 Oct 26 - 15:30 Oct 25 = 9h
- Status: Late-In (15:30 > 8:05 grace)
- Regular hours: 8.0
- Overtime: 1.0 hour
- Oct 26: ABSENT (no punches assigned to Oct 26 schedule)
```

### ✅ Scenario 5: Late Arrival but Different Day Punch-Out
```
Schedule:
- Oct 28: 20:00 - 05:00
- Oct 29: 20:00 - 05:00 (different day, same time)

Actual work:
- Oct 28 at 18:00: Employee punches in (2h early, within buffer)
- Oct 29 at 03:00: Employee punches out (same shift, next morning)
- Oct 29 at 20:30: Employee punches in (next scheduled shift)
- Oct 30 at 05:00: Employee punches out

Calculation:
- Window Oct 28: [16:00 Oct 28, 09:45 Oct 29]
- Punches at 18:00 Oct 28 ✓ and 03:00 Oct 29 ✓ → Oct 28 shift
- Work time: 03:00 Oct 29 - 18:00 Oct 28 = 9 hours
- Oct 28: 9h work, 1h OT
- Oct 29: Gets 20:30 and 05:00 (next shift)
- Oct 29: 8h30m work, 0.5h OT
- Window Oct 29: [18:00 Oct 29, 09:45 Oct 30]
- Punches at 20:30 Oct 29 ✓ and 05:00 Oct 30 ✓ → Oct 29 shift
```

### ❌ Scenario 6: Isolated Punch (Unmatched)
```
Schedule: 9:00 - 17:00
Punch: Oct 31 at 14:30 (random punch outside schedule)

If Oct 31 is a working day:
- Window: [7:00, 21:15]
- 14:30 is in window → assigned to Oct 31 shift
- Only 1 punch → work time = 0
- Status: Absent or Incomplete

If Oct 31 is a non-working day (0000-2359):
- Punch doesn't match any schedule
- Finds closest shift (within 24h)
- Assigns to closest shift
```

## Break Detection Algorithm

```javascript
// For each pair of consecutive punches
for (let i = 0; i < punches.length - 1; i++) {
  const gap = punches[i+1].time - punches[i].time
  
  if (gap > 30 minutes:
    // Likely a break (lunch, rest, etc.)
    // Don't count this gap as work time
  else:
    // Likely a system glitch or rapid punches
    // Count as work time
}
```

**Why 30 minutes?**
- Short breaks (bathroom, water) are usually < 5 minutes
- Unexpected gaps from device errors are typically < 5 minutes
- Real breaks (lunch, etc.) are typically 30+ minutes
- This threshold balances accuracy vs. false positives

## Configuration

- **Grace Period**: Controlled per department in the database (default 5 minutes)
- **Break Threshold**: 30 minutes (hardcoded, can be made configurable)
- **Pre-shift Buffer**: 2 hours early check-in allowed
- **Post-shift Buffer**: 4 hours late check-out allowed

## Edge Cases & Limitations

### Known Limitations

1. **Same shift scheduled multiple times per week**
   - If employee has same time twice (e.g., Mon & Wed same 9-5)
   - Punches are matched to first occurrence
   - Works fine if employee follows schedule

2. **Unscheduled punches on days off**
   - If employee punches in on a scheduled day off
   - Punch is assigned to closest shift (within 24h)
   - May result in unexpected assignment

3. **Multiple shifts per day (not supported)**
   - Schedule only supports 1 shift per day per employee
   - If employee works 2 shifts, second shift would be treated as break
   - Would require schedule redesign

### Future Improvements

- [ ] Add "multiple shifts per day" support
- [ ] Make break threshold configurable
- [ ] Add manual punch overrides for errors
- [ ] Add admin review queue for ambiguous days
- [ ] Support variable shift durations




