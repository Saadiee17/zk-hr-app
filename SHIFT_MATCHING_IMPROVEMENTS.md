# Shift Matching Logic - Improvements Summary

## Problem Statement
The previous time-gap heuristic (8-hour gap = new shift) was fragile and couldn't handle:
- Breaks during the day (employee punches out for lunch)
- Overnight shifts with varying lengths
- Late arrivals that extend into next day
- Multiple punch scenarios

## Solution: Schedule-Based Matching

### Architecture Change
**Before:** Group punches by arbitrary time gaps  
**After:** Match punches to actual scheduled shifts, then handle breaks intelligently

### Key Improvements

#### 1. **Schedule-Aware Assignment**
Instead of: "If > 8 hours gap, new shift"  
Now: "Which scheduled shift does this punch belong to?"

```
Schedule for week:
- Mon-Fri: 9:00 - 17:00
- Sat-Sun: OFF (0000-2359)

If punch at Oct 28 (Monday) at 15:00:
  → Assigned to Monday 9:00-17:00 shift (within window)
  
If punch at Oct 29 (Tuesday) at 03:00:
  → Not a working day OR
  → Assigned to closest shift (within 24h)
```

#### 2. **Break Detection (30-Minute Threshold)**
Multiple punches per shift are now handled correctly:

```
Punches: 9:00, 12:00, 13:00, 17:00

Work calculation:
- Gap 1: 9:00 → 12:00 = 3h (< 30min? No) → Work time
- GAP (BREAK): 12:00 → 13:00 = 1h (> 30min? Yes) → Skip
- Gap 2: 13:00 → 17:00 = 4h (< 30min? No) → Work time
- TOTAL: 7 hours
```

**Why 30 minutes?**
- System glitches: Usually < 5 min gaps
- Bathroom breaks: < 15 min
- Lunch breaks: 30+ min ✓
- This naturally separates real breaks from noise

#### 3. **Scheduling Window (Buffers)**
Pre-shift and post-shift buffers prevent legitimate early/late punches from breaking logic:

```
Scheduled: 9:00 - 17:00
Window: [7:00 - 21:00] (+/- 2h/4h buffers)

Punch at 7:30 AM:
  → Within window → Same shift (employee came early)
  → Status: On-Time (within grace period)
  
Punch at 19:30 (7:30 PM):
  → Within window → Same shift (employee stayed late)
  → Status: On-Time (regular hours + overtime)
```

### Robustness Against Edge Cases

#### ✅ Overnight Shift (8 PM - 5 AM)
```
Device timestamps:
- Oct 22, 20:30 (8:30 PM)
- Oct 23, 04:45 (4:45 AM)

OLD logic: Gap = ~8h15m, might trigger new shift
NEW logic: Both in scheduled window → Same shift ✓
Result: 8h15m of work correctly attributed to Oct 22 shift
```

#### ✅ Break During Shift
```
Punches: 8:00, 12:00, 13:00, 18:00

OLD logic: Could miscount as multiple shifts
NEW logic: 
  - All 4 assigned to same shift (within window)
  - Break automatically detected (1h > 30m)
  - Work time = (12-8) + (18-13) = 9h ✓
```

#### ✅ Late Arrival, Long Shift
```
Schedule: 8:00 - 16:00 (8h)
Actual: 15:00 - 00:30 (9h30m)

Punches: Oct 28 at 15:00, Oct 29 at 00:30

OLD logic: ~9h30m gap < 8h? No → Might treat as 2 shifts
NEW logic:
  - 15:00 Oct 28: In Oct 28 window [6:00-20:45] ✓
  - 00:30 Oct 29: NOT in Oct 28 window, but within 24h → Fallback ✓
  - Result: Single shift, 9h30m, 8h regular + 1h30m OT ✓
  - Oct 29: Shows as ABSENT (no punch in Oct 29 shift window)
```

#### ✅ Punch-In Late, Next-Day Punch-Out, Next Shift Punch-In
```
Schedule:
- Oct 29: 20:00 - 05:00
- Oct 30: 20:00 - 05:00

Actual:
- Oct 29, 18:00: Punch in (2h early)
- Oct 30, 03:00: Punch out
- Oct 30, 20:30: Punch in (next shift)
- Oct 31, 05:15: Punch out

Matching:
- Oct 29, 18:00 + Oct 30, 03:00 → Oct 29 shift ✓
- Oct 30, 20:30 + Oct 31, 05:15 → Oct 30 shift ✓
- Result: Two separate shifts correctly assigned
```

### Configuration Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Grace Period | 5 min (per dept) | Allowed time before shift start to be "On-Time" |
| Break Threshold | 30 min | Minimum gap to count as break (not work time) |
| Pre-shift Buffer | 120 min (2h) | How early employee can clock in |
| Post-shift Buffer | 240 min (4h) | How late employee can clock out |

### What Changes for Users

**Dashboard View:**
- Still shows: Date, In Time, Out Time, Duration, Regular Hours, Overtime, Status
- Now more accurate for:
  - Employees with lunch breaks
  - Overnight shifts
  - Late arrivals
  - Extended shifts

**Payroll Calculations:**
- Automatically accounts for breaks
- Correct overtime detection
- Absent days properly identified

### Testing Recommendations

1. **Test with Lunch Breaks**
   - Create employee with 9h punch (8:00, 12:00, 13:00, 17:00)
   - Verify: 8h work time (1h break excluded)

2. **Test Overnight Shift**
   - Schedule: 20:00 - 05:00
   - Punches: 20:30, 04:30 (next day)
   - Verify: Single shift, on-time

3. **Test Late Arrival**
   - Schedule: 8:00 - 16:00
   - Punch: 16:00, 00:30 (next day)
   - Verify: Late-In, 8h + OT

4. **Test Absent Days**
   - View date range with scheduled days but no punches
   - Verify: Shows as "Absent"

### Limitations (Documented)

- **One shift per day**: Can't handle split shifts (e.g., 9-12, 14-17)
- **Same time multiple weeks**: First occurrence wins for ambiguous days
- **Unscheduled punches**: Assigned to closest shift (may be unexpected)

See `SHIFT_MATCHING_LOGIC.md` for detailed scenarios and documentation.






