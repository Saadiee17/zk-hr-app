# Attendance Calculation System - Complete Documentation

**Last Updated**: November 7, 2025  
**Version**: 2.0 (Single Source of Truth Architecture)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Key Concepts](#key-concepts)
3. [Calculation Flow](#calculation-flow)
4. [Status Definitions](#status-definitions)
5. [Dashboard Metrics Explained](#dashboard-metrics-explained)
6. [Working Day Logic](#working-day-logic)
7. [Edge Cases & Limitations](#edge-cases--limitations)
8. [Recent Fixes & Improvements](#recent-fixes--improvements)

---

## System Overview

The attendance system uses a **Single Source of Truth** architecture where:
- **API (`/api/reports/daily-work-time`)** performs ALL attendance calculations
- **Frontend (`page.jsx`)** consumes and displays API results without duplicate logic
- **Working Day Concept** (10 AM to 10 AM) determines date boundaries for overnight shifts

### Architecture Principle
```
ZK Device Punches → Supabase Database → API Calculation Layer → Frontend Display
                                              ↑
                                    (SINGLE SOURCE OF TRUTH)
```

---

## Key Concepts

### 1. Working Day
A "working day" is a 24-hour period starting at a configured time (default: 10:00 AM).

**Example**:
- **Nov 7 Working Day**: Nov 7 10:00 AM → Nov 8 09:59 AM
- **Nov 8 Working Day**: Nov 8 10:00 AM → Nov 9 09:59 AM

**Why This Matters**:
- At 2:00 AM on Nov 8 (calendar), we're still on **Nov 7's working day**
- Dashboard shows Nov 7 metrics until 10:00 AM arrives
- Prevents "everyone absent" at midnight for overnight shifts

### 2. Schedule (Time Zone)
Each employee has assigned schedules with:
- **Start Time** (e.g., 8:00 PM Pakistan time)
- **End Time** (e.g., 5:00 AM Pakistan time next day)
- **Buffer Time** (grace period, default 30 minutes)
- **Day Segments** (defines working days within the week)

### 3. Punch Matching
The system uses a **scoring mechanism** to match punches to shifts:

```javascript
Score Calculation:
- Punch within shift window: 10000 points (perfect match)
- Punch outside window: 100 - (hours away from shift)
- Multiple schedules: Pick the highest scoring shift
```

**Tie-breaker**: If two shifts have the same score, prefer the one with start time **closest to the punch**.

---

## Calculation Flow

### Step 1: Determine Effective Date
```javascript
Current Time: 2:00 AM Nov 8 (Pakistan)
Working Day Start: 10:00 AM
Current Time < Working Day Start? YES
→ Effective Date: Nov 7
```

### Step 2: Fetch Employee Schedules
For each employee, fetch:
- All assigned schedules (`individual_tz_1`, `individual_tz_2`, `individual_tz_3`)
- Department schedules (`tz_id_1`, `tz_id_2`, `tz_id_3`)
- Schedule exceptions (time off, leave, etc.)

### Step 3: Generate Shift Windows
For the effective date and adjacent dates:
```javascript
Employee: John Doe
Schedule: Night 8-5 (8 PM to 5 AM)
Working Day: Nov 7

Generated Shifts:
- Nov 6: 8 PM Nov 6 → 5 AM Nov 7
- Nov 7: 8 PM Nov 7 → 5 AM Nov 8 ← Target shift for Nov 7 working day
```

### Step 4: Match Punches to Shifts
```javascript
Punches for John:
- Nov 7 8:05 PM → Matched to Nov 7 shift (score: 10000)
- Nov 8 4:58 AM → Matched to Nov 7 shift (score: 99.03)

Nov 7 Shift Result:
- inTime: Nov 7 8:05 PM
- outTime: Nov 8 4:58 AM
- Status: Late-In (5 minutes late, within 30-min buffer)
```

### Step 5: Determine Status
```javascript
Status Logic:
1. No punches → "Absent"
2. Single punch, no recent out → "Punch Out Missing"
3. First punch on-time (within buffer) → "On-Time"
4. First punch late (beyond buffer) → "Late-In"
5. Shift hasn't started yet → "Shift Not Started"
```

### Step 6: Dashboard Aggregation
Frontend receives API results and counts:
```javascript
for each employee result:
  if status === 'On-Time': present++, onTime++
  if status === 'Late-In': present++, late++
  if status === 'Punch Out Missing': present++
  if status === 'Absent': absent++
  if status === 'Shift Not Started': (not counted in metrics)
```

---

## Status Definitions

### Present Statuses (Counted)
| Status | Description | Included in Present Count |
|--------|-------------|---------------------------|
| **On-Time** | Clocked in within buffer period | ✅ Yes |
| **Late-In** | Clocked in after buffer period | ✅ Yes |
| **Punch Out Missing** | Still working or forgot to clock out | ✅ Yes |

### Non-Present Statuses
| Status | Description | Included in Absent Count |
|--------|-------------|--------------------------|
| **Absent** | Did not clock in, shift has started | ✅ Yes |
| **Shift Not Started** | Shift hasn't begun yet | ❌ Not counted |
| **No Schedule** | No assigned schedule | ❌ Not counted |

---

## Dashboard Metrics Explained

### Example Breakdown
```
Total Employees: 54

Dashboard Shows:
- Employees Present: 20
- Employees On-Time: 3
- Employees Late-In: 13
- Employees Absent: 9
```

### The Math
```
Present (20) = On-Time (3) + Late-In (13) + Punch Out Missing (4)
Absent (9) = Employees who didn't show up for started shifts
Not Counted (25) = Shift Not Started (employees whose shifts haven't begun)

Total = 20 + 9 + 25 = 54 ✅
```

### Why "Shift Not Started" Isn't Counted
At 2:00 AM:
- **Night shift employees** (8 PM - 5 AM): Their shifts have started → Counted as Present/Absent
- **Day shift employees** (12 PM - 8 PM): Their shifts haven't started → Not counted
- **Morning shift employees** (9 AM - 5 PM): Their shifts haven't started → Not counted

**Principle**: Only count employees whose shifts are currently active or should have started.

---

## Working Day Logic

### Dashboard Date Selection
```javascript
Current Time: 2:00 AM Nov 8 (Pakistan)
Working Day Enabled: true
Working Day Start: 10:00 AM

Logic:
currentTime (2:00 AM) < workingDayStart (10:00 AM)
→ Still on Nov 7's working day
→ Fetch Nov 7 metrics

Result: Dashboard shows Nov 7 data until 10:00 AM
```

### API Punch Grouping
```javascript
Punch: Nov 8 4:58 AM
Employee Schedule: Night 8-5 (8 PM to 5 AM)
Working Day Start: 10:00

Step 1: Determine shift start time (Nov 7 8:00 PM)
Step 2: Calculate working day for shift start
  → 8:00 PM is after 10:00 AM
  → Working day = Nov 7

Step 3: Group punch under Nov 7 working day
Result: Punch correctly assigned to Nov 7 shift ✅
```

**Critical Fix**: Previously used midnight UTC for grouping, causing overnight shifts to be split incorrectly. Now uses **actual shift start time** for working day calculation.

---

## Edge Cases & Limitations

### ✅ Handled Correctly

#### 1. Overnight Shifts
```
Employee: Night shift 10 PM to 7 AM
Punches:
- Nov 7 10:05 PM (in)
- Nov 8 6:58 AM (out)

Result: Correctly grouped under Nov 7 working day ✅
```

#### 2. Multiple Schedules
```
Employee: Assigned to "Day 12-8" and "Night 8-5"
Punch: Nov 7 9:00 PM

Logic:
- Day 12-8: Score = 13 (13 hours late)
- Night 8-5: Score = 10000 (perfect match)
→ Matched to Night 8-5 ✅
```

#### 3. Early Morning Punches
```
Time: 7:00 AM Nov 8
Employee: Night shift 7 PM to 4 AM

Logic:
- Shift ended at 4:00 AM
- Current time is 7:00 AM (3 hours after shift end)
- No punch today for this shift
→ Status: Absent ✅
```

#### 4. Forgot to Punch Out
```
Employee: Day shift 12 PM to 8 PM
Punches:
- Nov 7 12:05 PM (in)
- (no out punch)

Current Time: Nov 8 2:00 AM (14 hours after shift end)
Result: Status = "Punch Out Missing" ✅
```

#### 5. Working Overtime
```
Employee: Day shift 12 PM to 8 PM
Punches:
- Nov 7 12:05 PM (in)
- Nov 7 10:30 PM (out, 2.5 hours overtime)

Result: 
- Regular: 8 hours
- Overtime: 2.5 hours
- Status: Late-In ✅
```

### ⚠️ Known Limitations

#### 1. Maximum Shift Duration
```
Current: 12 hours
Issue: If someone works > 12 hours continuously, system marks as "Punch Out Missing"
Workaround: Increase MAX_SHIFT_DURATION_HOURS in code
```

#### 2. Multiple Punches for Gates
```
Scenario:
- 12:00 PM: Punch in (enters building)
- 12:05 PM: Punch for gate (moves between areas)
- 12:10 PM: Punch for another gate
- 8:00 PM: Punch out

Current Behavior: Uses first (12:00 PM) and last (8:00 PM) punch
Assumption: Middle punches are gate/break movements
```

#### 3. Forgot Both In/Out
```
Scenario:
- Employee forgets to punch in
- Works full day
- Punches out at end

Result: Only sees OUT punch, marked "Absent"
Note: This is correct behavior - no IN punch means absent
```

#### 4. Very Late Arrivals (Next Day)
```
Scenario:
- Shift: 9 AM Nov 7
- Punch in: 3 AM Nov 8 (18 hours late!)

Current: May be assigned to wrong shift
Limitation: Scoring system has practical limits
```

#### 5. Schedule Changes Mid-Shift
```
Scenario:
- Employee assigned Day shift at 9 AM
- Schedule changed to Night shift at 2 PM
- Employee working Day shift currently

Issue: System uses current schedule assignment
Note: Historical schedule tracking not implemented
```

### ❌ Will NOT Work

#### 1. Working Day Disabled
If `working_day_enabled = false`:
- System falls back to calendar dates (UTC midnight boundaries)
- Overnight shifts may be incorrectly split across dates
- Dashboard may show "everyone absent" after midnight

**Recommendation**: Always keep working day enabled

#### 2. No Schedule Assigned
```
Employee with no schedule → Status: "No Schedule"
Not counted in any metrics
```

#### 3. Past Date Modifications
```
Issue: Changing an old punch time doesn't recalculate reports
Workaround: Manual database update or re-sync
```

---

## Recent Fixes & Improvements

### Major Rewrite (Nov 7, 2025)
**Problem**: Dashboard had 600+ lines of duplicate calculation logic that didn't match API

**Solution**: Complete rewrite to enforce single source of truth
- Removed all duplicate status determination logic
- Dashboard now purely consumes API results
- File size: 2507 lines → 763 lines (-70%)

**Impact**: 
- ✅ Status badges and department table now always match
- ✅ Eliminated "Sabbor absent but showing present" inconsistencies
- ✅ Easier to maintain and debug

### Working Day Integration (Nov 7, 2025)
**Problem**: At 2 AM, dashboard showed "54 absent" despite logs showing yesterday's work

**Solution**: 
1. Dashboard fetches company working day settings
2. Before working day start time, uses previous day's metrics
3. Uses configured start time (10 AM) instead of hardcoded 6 AM

**Impact**:
- ✅ Dashboard logically shows relevant data at all times
- ✅ No more "everyone absent" at midnight
- ✅ Consistent with business rules

### Punch Matching Tie-breaker (Nov 6, 2025)
**Problem**: Punch at 10 PM matched to wrong shift when multiple overlapping schedules existed

**Solution**: Added tie-breaker to prefer shift with closest start time

**Before**:
```
Punch: 10 PM Nov 7
Shift A: 8 PM - 5 AM (score: 10000)
Shift B: 10 PM - 7 AM (score: 10000)
→ Matched to A (picked first) ❌
```

**After**:
```
Punch: 10 PM Nov 7
Shift A: 8 PM - 5 AM (score: 10000, 2 hours from start)
Shift B: 10 PM - 7 AM (score: 10000, 0 hours from start)
→ Matched to B (closest start) ✅
```

### Working Day Grouping Fix (Nov 6, 2025)
**Problem**: Overnight shifts were being grouped by UTC midnight instead of shift start time

**Solution**: Calculate `groupingDate` using actual shift start timestamp

**Before**:
```
Shift: Nov 7 8 PM - Nov 8 5 AM
groupingDate = Nov 7 00:00 UTC ❌
→ Assigned to wrong working day
```

**After**:
```
Shift: Nov 7 8 PM - Nov 8 5 AM
actualShiftStart = Nov 7 8 PM Pakistan = Nov 7 15:00 UTC
workingDayForShift = calculate based on 8 PM ✅
→ Correctly assigned to Nov 7 working day
```

### Punch Out Missing Detection (Nov 5, 2025)
**Problem**: Employees working overtime were marked "Punch Out Missing"

**Solution**: Added overtime buffer and shift-still-active check

```javascript
Check if shift is still active:
1. Less than 2 punches → Still working
2. Last punch within 2 hours → Still working  
3. Last punch within shift window + overtime buffer → Still working
4. Otherwise → Punch Out Missing
```

---

## Testing & Validation

### Recommended Test Cases

#### Test 1: Overnight Shift
```
Setup:
- Employee: Night 10-7 shift
- Punch: Nov 7 10:05 PM, Nov 8 6:55 AM

Expected:
- Date: Nov 7
- Status: Late-In
- Hours: 8.83 regular
```

#### Test 2: Multiple Schedules
```
Setup:
- Schedules: Day 12-8, Night 8-5
- Punch: Nov 7 8:10 PM

Expected:
- Matched to Night 8-5
- Status: Late-In
```

#### Test 3: Forgot Punch Out
```
Setup:
- Shift: 9 AM - 5 PM
- Punch: Nov 7 9:05 AM
- Current Time: Nov 8 2 AM

Expected:
- Status: Punch Out Missing
```

#### Test 4: Working Day Boundary
```
Setup:
- Current Time: Nov 8 2:00 AM
- Working Day Start: 10:00 AM

Expected:
- Dashboard shows Nov 7 metrics
- Logs show Nov 7 data
```

#### Test 5: Shift Not Started
```
Setup:
- Current Time: 7:00 AM
- Employee Shift: 12 PM - 8 PM

Expected:
- Status: Shift Not Started
- Not counted in metrics
```

---

## Troubleshooting

### Issue: "Everyone showing absent after midnight"
**Cause**: Working day disabled or incorrect start time  
**Fix**: Enable working day, set start time to 10:00

### Issue: "Overnight shift split across two dates"
**Cause**: Working day grouping not using shift start time  
**Fix**: Verify `groupingDate` uses `actualShiftStartUTC`

### Issue: "Dashboard metrics don't match department table"
**Cause**: Duplicate calculation logic in frontend  
**Fix**: Ensure all displays use API status directly

### Issue: "Punch assigned to wrong shift"
**Cause**: Multiple overlapping schedules, tie-breaker not working  
**Fix**: Verify tie-breaker prefers closest start time

### Issue: "Employee marked absent but they're present"
**Cause**: Shift may not have started yet  
**Fix**: Check if shift start time is in the future

---

## Configuration Reference

### Company Settings (`company_settings` table)
```sql
working_day_enabled: boolean (default: true)
working_day_start_time: time (default: '10:00')
buffer_time_minutes: integer (default: 30)
```

### Schedule Settings (`time_zones` table)
```sql
tz_string: varchar (e.g., '00002359120020001200200012002000120020001200200000002359')
buffer_time_minutes: integer (optional, overrides company default)
```

### Constants in Code
```javascript
// In daily-work-time/route.js
MAX_SHIFT_DURATION_HOURS = 12
OVERTIME_BUFFER_HOURS = 3
STILL_WORKING_THRESHOLD_HOURS = 2
```

---

## Summary

The attendance calculation system now operates on a **Single Source of Truth** principle where:

1. ✅ **API performs ALL calculations** using working day logic and punch matching
2. ✅ **Frontend displays API results** without duplicate logic
3. ✅ **Working day concept** handles overnight shifts correctly
4. ✅ **Status badges and tables** always show consistent data
5. ✅ **Dashboard intelligently shows** relevant working day metrics

**Golden Rule**: When in doubt, check the API calculation. If the API is correct, the frontend will display it correctly.

---

**End of Documentation**




