# Dashboard Metrics - Simple Breakdown

## Your Question: Where Are All 54 Employees?

You're seeing:
- **Present: 20**
- **On-Time: 3**
- **Late-In: 13**
- **Absent: 9**

But you have **54 total employees**. Where are the remaining **25 employees**?

---

## The Answer: "Shift Not Started"

Those 25 employees have **shifts that haven't started yet**, so they're not counted in any metric.

---

## Visual Breakdown

```
┌─────────────────────────────────────────────────────────┐
│                  TOTAL EMPLOYEES: 54                     │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌─────────┐       ┌─────────┐      ┌──────────────┐
   │ PRESENT │       │ ABSENT  │      │ SHIFT NOT    │
   │   20    │       │    9    │      │ STARTED: 25  │
   └─────────┘       └─────────┘      └──────────────┘
        │                                (Not counted
        │                                 in metrics)
        │
        └─────────┬─────────┬─────────┐
                  │         │         │
                  ▼         ▼         ▼
           ┌──────────┐ ┌──────┐ ┌───────────┐
           │ On-Time  │ │ Late │ │  Punch    │
           │    3     │ │  13  │ │  Out      │
           │          │ │      │ │  Missing  │
           └──────────┘ └──────┘ │     4     │
                                 └───────────┘
```

---

## The Math

### Present Employees (20)
```
Present = On-Time + Late-In + Punch Out Missing

20 = 3 + 13 + 4 ✅
```

**What "Present" means**: Any employee who **clocked in** for their shift today.

### Accounted Employees
```
Counted in Metrics = Present + Absent
29 = 20 + 9 ✅
```

### Not Counted (25 employees)
```
Total - Counted = Shift Not Started
54 - 29 = 25 ✅
```

---

## Why "Shift Not Started" Isn't Counted

**Current Time**: 2:00 AM (Nov 8, but still Nov 7's working day)

### Example Employees:

#### Night Shift (COUNTED)
```
Employee: Mutahir
Schedule: Night 10-7 (10 PM to 7 AM)
Shift Start: 10:00 PM (yesterday)

Status: Shift HAS started → Counted as "Present" or "Absent" ✅
```

#### Day Shift (NOT COUNTED)
```
Employee: Aridah  
Schedule: Day 12-8 (12 PM to 8 PM)
Shift Start: 12:00 PM (today)

Current Time: 2:00 AM
Status: Shift HASN'T started yet → Not counted ❌
```

#### Morning Shift (NOT COUNTED)
```
Employee: Farid
Schedule: Morning 9-5 (9 AM to 5 PM)
Shift Start: 9:00 AM (today)

Current Time: 2:00 AM
Status: Shift HASN'T started yet → Not counted ❌
```

---

## Categories Explained

### 1. On-Time (3 employees)
- Clocked in **within** the buffer period (default 30 minutes)
- Example: Shift starts at 10 PM, clocked in at 10:05 PM ✅

### 2. Late-In (13 employees)
- Clocked in **after** the buffer period
- Example: Shift starts at 10 PM, clocked in at 10:45 PM (15 min late) ⚠️

### 3. Punch Out Missing (4 employees)
- Clocked in but **haven't clocked out yet**
- Could be:
  - Still working
  - Forgot to punch out
  - Working overtime

### 4. Absent (9 employees)
- Shift has started
- Did NOT clock in
- Example: Shift started at 10 PM, no punch, current time is 2 AM ❌

### 5. Shift Not Started (25 employees) - NOT SHOWN
- Their shift time hasn't arrived yet
- Will be counted once their shift starts
- Example: Day shift (12 PM) employees at 2 AM 💤

---

## Real-World Example

Let's say current time is **2:00 AM on Friday**:

### Night Shift Employees (Counted)
```
Saad - Night 8-5
├─ Clocked in: 8:10 PM Thursday ✅
└─ Status: Late-In (counted as Present)

Mutahir - Night 10-7  
├─ Clocked in: 10:02 PM Thursday ✅
└─ Status: On-Time (counted as Present)

Hamzanehal - Night 7-4
├─ Expected: 7:00 PM Thursday
├─ No clock in ❌
└─ Status: Absent
```

### Day Shift Employees (NOT Counted)
```
Aridah - Day 12-8
├─ Shift starts: 12:00 PM Friday (10 hours from now)
└─ Status: Shift Not Started (not counted)

Sufyanfarhad - Day 12-8
├─ Shift starts: 12:00 PM Friday (10 hours from now)
└─ Status: Shift Not Started (not counted)
```

---

## Important Notes

### Why This Makes Sense

**You wouldn't call someone "absent" if their shift hasn't started yet!**

At 2 AM:
- ❌ **Wrong**: "Aridah is absent" (their shift is at 12 PM!)
- ✅ **Right**: "Aridah's shift hasn't started yet"

### Metrics Update Throughout the Day

As the day progresses, the numbers change:

**2:00 AM** (Early morning)
```
Present: 20 (night shift workers)
Absent: 9 (night shift no-shows)
Not counted: 25 (day/morning shift workers)
```

**10:00 AM** (Morning shifts start)
```
Present: 35 (night + morning shift workers)
Absent: 15 (night + morning no-shows)
Not counted: 4 (late afternoon shifts)
```

**6:00 PM** (Evening)
```
Present: 50 (most shifts active)
Absent: 3 (no-shows across all shifts)
Not counted: 1 (very late night shift)
```

---

## Summary

✅ **Present (20)** = Employees who clocked in (On-Time + Late + Punch Out Missing)

✅ **Absent (9)** = Employees whose shifts started but they didn't clock in

❌ **Not Counted (25)** = Employees whose shifts haven't started yet (Shift Not Started)

**Formula**: `Present + Absent + Not Counted = Total Employees`
**Your Case**: `20 + 9 + 25 = 54` ✅

---

**This is by design to show meaningful metrics for the current working period!**





