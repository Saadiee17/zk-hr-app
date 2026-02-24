# Attendance Calculation System — Optimization Plan

> **Context:** As of Feb 2026, the system has ~50 active employees and 8,000+ attendance log records.
> Data will continue growing indefinitely. This document captures all optimization possibilities
> discussed and the recommended implementation path.
>
> **Status:** Phase 1 (Options 1 + 2) — ✅ Completed Feb 24, 2026

---

## Current Architecture (Post Feb-24 Fixes)

```
User visits Dashboard
       │
       ▼
batch API called for today's date
       │
       ├─ Check daily_attendance_calculations cache
       │       ├─ HIT  → return instantly ✅
       │       └─ MISS → calculateForDateRange() for each employee
       │                        │
       │                        ├─ Fetch employee + schedule from DB
       │                        ├─ Fetch all attendance_logs for date range
       │                        ├─ Run matchPunchesToShifts() algorithm
       │                        └─ Store result in cache → return
       │
Auto-sync every 5 min
       │
       └─ Clears cache for affected dates → next dashboard load recalculates
```

**Known bottleneck:** Cache for today's date is cleared on every sync (every 5 min),
forcing a full recalculation on the next dashboard load (~35–60 seconds for 50 employees).

---

## Bugs Fixed (Feb 24, 2026)

Before optimization work begins, the following critical bugs were resolved:

| Bug | Impact | Fix |
|-----|--------|-----|
| Missing `shift_start_time`, `shift_end_time`, `shift_name` columns in `daily_attendance_calculations` | Cache writes always failed silently → every load was a cold recalculation (35–60s) | Added 3 columns via DB migration |
| 8,018 `attendance_logs` rows with `employee_id = NULL` | Names showed as "Unknown" on pages 2+ of Recent Logs; calculation engine couldn't see historical punches for employees | One-time SQL backfill + persistent backfill step added to sync route (Step 4.5) |
| Stale cache from pre-fix era | Old calculations referenced incomplete data (only partially-linked logs) | Cleared `daily_attendance_calculations` for past 30 days to force fresh recalc |

---

## Optimization Options

### ✅ Option 1 — Smart Cache Invalidation
**Effort:** ~1–2 hours | **Impact:** High for historical data

**Problem it solves:** The sync route currently deletes cache for *all* affected log dates, even dates
that are weeks old and fully correct. Historical data should never be cleared unless a manual
re-sync is explicitly requested.

**Approach:**
- Only invalidate cache for dates within the last **2 days** (yesterday + today) during a normal sync
- Historical dates (older than 2 days) are considered immutable — never cleared automatically
- Optionally add a `needs_recalc` boolean flag column to `daily_attendance_calculations`
  to mark records as dirty without deleting them

**Result:** Historical payroll data (weeks/months ago) loads in <100ms forever. No wasted compute.

---

### ✅ Option 2 — Background Pre-Warming (RECOMMENDED)
**Effort:** ~2–3 hours | **Impact:** Very High for real-time dashboard

**Problem it solves:** Calculations happen *on-demand* (user opens dashboard → waits 35–60s).
Users should never wait for computation.

**Approach:**
Extend the existing sync cycle. After syncing new logs and backfilling `employee_id`:
1. Immediately trigger a background batch pre-calculation for **today's date** (and yesterday if needed)
2. Store results in cache before any user opens the dashboard
3. The API batch route becomes a **pure read** — it only serves cached data, never calculates on-demand

```
Every 5 min:
  Sync new logs from ZK device
       → Backfill employee_id on unlinked rows
       → Clear today's cache (targeted, not broad)
       → Immediately recalculate today for ALL employees
       → Store in daily_attendance_calculations
       → Done

User visits Dashboard:
  Reads from cache → returns in <500ms ✅
```

**Key change:** The sync endpoint becomes responsible for *both* fetching AND computing.
The batch endpoint just reads.

**Result:** Dashboard metrics load in <0.5 seconds instead of 35–60 seconds.
Real-time data (within 5-minute sync window) with zero perceived latency.

---

### Option 3 — Incremental Calculation (Partial Updates)
**Effort:** ~4–6 hours | **Impact:** Medium (mainly for large date range queries)

**Problem it solves:** Full recalculation reruns the entire `matchPunchesToShifts()` algorithm
even when only 1–2 new punches arrived.

**Approach:**
- Track `last_synced_log_time` per employee per date
- On recalculation, only fetch logs newer than that timestamp
- Patch the cached result incrementally

**Caveat:** The shift-matching algorithm is holistic — it needs all punches for a date together
to correctly pair check-in/check-out, especially for overnight shifts. Incremental patching
only works cleanly for **historical dates** (where no new punches will arrive).

**Best for:** Large payroll/monthly report queries spanning 30+ days.
Not needed until you have 200+ employees or 6+ months of history.

---

### Option 4 — DB Trigger + Edge Function Cron (Event-Driven)
**Effort:** ~1 day | **Impact:** Very High, most elegant architecture

**Problem it solves:** The system currently polls (syncs every 5 min regardless of new data).
An event-driven system reacts only when something *actually changes*.

**Approach:**
1. Postgres trigger on `attendance_logs` INSERT/UPDATE
   → marks `daily_attendance_calculations.(employee_id, date)` as `needs_recalc = true`
2. Supabase Edge Function on cron schedule (every 5 min)
   → finds all rows where `needs_recalc = true`
   → recalculates only those specific (employee, date) pairs
   → marks them `needs_recalc = false`

```
New log inserted
    → DB trigger fires instantly
    → marks (employee, date) as stale

Cron Edge Function (every 5 min)
    → finds stale rows only
    → recalculates only those
    → zero wasted compute
```

**Result:** Scales to any number of employees. Perfectly targeted computation.
Zero unnecessary recalculations.

---

### Option 5 — Supabase Edge Function Scheduled Worker
**Effort:** ~2–3 days | **Impact:** Best long-term, but overkill currently

**Problem it solves:** Calculation logic runs inside Next.js API routes, competing with
user-facing requests for server resources.

**Approach:**
- Move entire calculation engine to a standalone **Supabase Edge Function** (Deno/TypeScript)
- Schedule it to run every N minutes via Supabase cron
- Next.js API routes become pure read-only (only query the cache table)
- Computation is fully decoupled from UI

**Best for:** When you have 200+ employees and computation time becomes significant
even in the background, or when you want to horizontally scale the web app
independently of the computation layer.

---

## Decision Matrix

| Option | Effort | Impact | Scales to 200+ emp | Recommended |
|--------|--------|--------|--------------------|-------------|
| 1 — Smart Cache Invalidation | Low | High | ✅ | ✅ **Do with Option 2** |
| 2 — Background Pre-Warming | Medium | Very High | ✅ | ✅ **Do first** |
| 3 — Incremental Calculation | High | Medium | ✅ | ⏳ Later |
| 4 — DB Trigger + Cron Edge Fn | High | Very High | ✅ | ⏳ Later |
| 5 — Edge Function Worker | Very High | High | ✅ | ⏳ Future |

---

## Recommended Implementation Order

### Phase 1 — Immediate (This Session)
**Option 1 + Option 2 together** — they are complementary and share the same code paths.
Option 1 is literally just changing the cache-clear logic in sync from "clear all dates" to
"only clear today + yesterday". This takes 10 minutes and is a prerequisite for Option 2
to work correctly (if you pre-warm but then immediately wipe it, pre-warming is pointless).

### Phase 2 — When You Need More Scale (~3–6 months)
**Option 4 (DB Trigger + Edge Cron)** — when you have 100+ employees and the 5-minute
pre-warm cycle takes more than a few seconds to complete.

### Phase 3 — Long Term
**Option 5** if you ever need to run independent scaling of compute vs. web server.

---

## Notes

- All date handling assumes **Pakistan Standard Time (UTC+5)**
- The `daily_attendance_calculations` table is the single source of truth for cached results
- The `working_day_enabled` company setting affects which calendar date a punch belongs to
- Night shift employees (e.g., "Night 8-5": 8 PM–5 AM) need special care as punches straddle midnight
- The backfill mechanism (Step 4.5 in sync) ensures `employee_id` is always populated — this is
  a prerequisite for all calculation options since the engine queries by `employee_id`
