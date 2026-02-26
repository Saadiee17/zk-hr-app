# ZK HR App — Product Roadmap & Feature Gap Analysis
> Last updated: 2026-02-25
> Compare baseline: Workday, BambooHR, SAP SuccessFactors

---

## ✅ What We Already Have (Competitive Baseline)

| Feature | Status | Notes |
|---|---|---|
| Biometric attendance ingestion (ZK → Supabase) | ✅ Done | Python Bridge + sync API |
| Real-time attendance dashboard (per-dept, per-day) | ✅ Done | Live + cached |
| Event-driven cache (trigger → queue → Edge Function) | ✅ Done | Option 4 architecture |
| Shift scheduling (multi-shift, time zones, individual overrides) | ✅ Done | `time_zones` table |
| Schedule exceptions (day off, half day, custom times) | ✅ Done | `schedule_exceptions` |
| Leave management (requests, balances, types, approval) | ✅ Done | Full workflow |
| Employee profiles (login, privilege levels, department) | ✅ Done | |
| Payroll-grade late arrival outlier reports | ✅ Done | `/payroll-reports` |
| Employee self-service portal (profile, leave, reports) | ✅ Done | `/employee/*` |
| PWA (mobile installable, iOS + Android) | ✅ Done | |
| Automated sync + burst processing | ✅ Done | |
| Real-time sync progress banner | ✅ Done | SyncProgressBanner |
| Department-level attendance status grid | ✅ Done | |
| Attendance-outlier analytics (late-in analysis) | ✅ Done | |

---

## 🔴 MISSING — HIGH BUSINESS IMPACT

> These are the gaps users will notice every day. Build these next.

### 1. 📅 Public Holiday Calendar
**Why critical:** Employees show as "Absent" on Eid, national holidays, etc. This creates false negatives in *every* attendance report and undermines trust in the entire system.
- **DB:** New `holidays` table (`date`, `name`, `is_recurring`)
- **Logic:** Check `holidays` in attendance calculation — skip absent marking on holidays
- **UI:** Admin page to add/remove holidays per year
- **Effort:** 3-4 hours
- **Status:** ⬜ Not started

### 2. 📊 CSV / PDF Export on All Reports
**Why critical:** HR directors need Excel/PDF for audits and payroll processing. Every enterprise HR tool has this. Without it, the app is view-only.
- **Library:** `xlsx` or `json2csv` + `jsPDF` for PDFs
- **Pages:** Attendance report, payroll outlier, department view
- **Effort:** 2-3 hours
- **Status:** ⬜ Not started

### 3. 💰 Payslip / Monthly Payroll Summary
**Why critical:** This is *the* core reason HR software exists. We have `duration_hours`, `regular_hours`, `overtime_hours` — all the inputs are there.
- **DB:** Add `base_salary`, `hourly_rate` to `employees`; new `payroll_runs` table
- **Logic:** Sum hours × rate + OT multiplier − deductions
- **UI:** Monthly payslip view + PDF export per employee
- **Effort:** 1-2 days
- **Status:** ⬜ Not started

### 4. 🔔 Email / Push Notifications
**Why critical:** Managers have zero proactive awareness today. Key triggers:
  - Employee absent 3+ consecutive days
  - OT threshold exceeded (e.g. >10h/week)
  - Leave request pending approval for >24h
  - Punch Out Missing for majority of team
- **Stack:** Supabase Edge Function → Resend (or SendGrid)
- **Effort:** 4-6 hours
- **Status:** ⬜ Not started

### 5. 📦 Bulk Employee Actions
**Why critical:** HR teams manage 50+ people at once. Currently every action is one-by-one.
- Bulk assign schedule / department
- Bulk activate / deactivate
- CSV import of new employees
- **Effort:** 4-6 hours
- **Status:** ⬜ Not started

---

## 🟡 MISSING — MEDIUM IMPACT

> Important but not immediately breaking. Build in the next sprint.

### 6. ✏️ Attendance Correction / Dispute Workflow
Employee sees "Punch Out Missing" → submits correction request → manager approves → cache invalidated.
- **DB:** `correction_requests` table
- **UI:** Employee flags a day → admin approval queue
- **Effort:** 4-6 hours
- **Status:** ⬜ Not started

### 7. ✅ Overtime Approval Workflow
We *calculate* OT but there's no approval step before payroll.
- Manager reviews OT claims → approve/reject → locked for payroll
- **Effort:** Medium (1 day)
- **Status:** ⬜ Not started

### 8. 🎨 Visual Shift Schedule Builder
Currently schedules are configured via cryptic `tz_string` format from ZK devices.
A visual "Mon 9am-6pm, Fri off" drag-and-drop builder any HR person can use.
- **UI:** Weekly grid → writes to `time_zones.tz_string`
- **Effort:** 1 day
- **Status:** ⬜ Not started

### 9. 📁 Employee Document Management
Attach contracts, warning letters, offer letters, certifications to employee profiles.
- **Stack:** Supabase Storage + `employee_documents` table + file upload UI
- **Effort:** 1 day
- **Status:** ⬜ Not started

### 10. 📈 Analytics / Trend Dashboard
Month-over-month trends, department comparison charts, punctuality scores.
All data already exists in `daily_attendance_calculations` — just needs visualization.
- **Library:** Recharts or Chart.js
- **Effort:** 4-6 hours
- **Status:** ⬜ Not started

---

## 🟢 FUTURE / NICE TO HAVE

| Feature | Notes | Effort |
|---|---|---|
| Audit trail / activity log | Who changed what, when | Medium |
| Shift swap requests | Employee ↔ Employee, manager approves | Medium |
| Geofencing validation | If ever moving away from ZK devices | Large |
| Multi-company / multi-site | Single tenant today | Large |
| Mobile app (React Native) | PWA covers most needs for now | Large |
| SSO / SAML login | Enterprise requirement for large orgs | Medium |
| Payroll integration (QuickBooks, Xero) | Export payroll data | Medium |

---

## ⚡ Performance Optimizations

### A. Database Indexes ✅ DONE 2026-02-25
Added critical indexes to eliminate full table scans:
```sql
-- attendance_logs: eliminates full scan on every calculation
CREATE INDEX idx_logs_employee_logtime ON attendance_logs(employee_id, log_time);

-- daily_attendance_calculations: speeds up /month range queries
CREATE INDEX idx_dac_date_employee ON daily_attendance_calculations(date, employee_id);

-- attendance_recalc_queue: speeds up queue drain loop
CREATE INDEX idx_queue_status_date ON attendance_recalc_queue(status, queued_at);
```
**Impact estimate:** Edge Function calculation 2-5× faster. /month query 3-10× faster on large date ranges.

### B. SWR Cache for `/api/employees` ✅ DONE 2026-02-25
The employee list is fetched on every page load (dashboard, payroll, outlier, profile).
Added 5-minute client-side SWR cache — employees rarely change intra-session.
**Impact:** Eliminates 1.5-2s delay on every navigation after first load.

### C. `overlayBlur` Prop Warning ✅ DONE 2026-02-24
Fixed `overlayBlur={2}` → `overlayProps={{ blur: 2 }}` in `AttendanceTable.jsx`.

### D. Employee Schedule 500 Error ✅ DONE 2026-02-24
Fixed `tz_string` parser — was missing the 8-char header offset.

### E. /month Endpoint — Single Query for Full Month ✅ DONE 2026-02-25
Replaced 25+ per-day batch requests (15-20s) with one SQL range query (~500ms).
Affects: `payroll-reports`, `attendance-outlier`, `prefetchMonth`.

---

## Priority Stack (Next Build Session)

```
1st  → Public Holiday Calendar          (fixes false Absent reports — trust issue)
2nd  → CSV Export for all report pages  (HR teams ask for this on day 1)  
3rd  → Analytics Trend Dashboard        (data exists, just needs charts)
4th  → Payslip / Payroll Summary        (core reason HR software exists)
5th  → Email Notifications (absent/OT)  (proactive awareness for managers)
6th  → Attendance Correction Workflow   (reduces manual admin burden)
7th  → Bulk Employee Actions + CSV      (productivity for HR team)
8th  → Overtime Approval Workflow       (payroll accuracy)
9th  → Visual Shift Schedule Builder    (UX improvement for HR staff)
10th → Employee Document Management     (legal compliance)
```

---

## Architecture Notes

- **Cache strategy:** Option 4 — event-driven. Punch → trigger → queue → Edge Function → `daily_attendance_calculations`
- **Attendance calc engine:** Next.js route `/api/reports/daily-work-time/route.js`
- **Fast read path:** `/api/reports/daily-work-time/month` — pure cache, 1 SQL query
- **Queue drain:** Supabase Edge Function `process-attendance-queue` — burst mode on sync
- **Sync:** Python Bridge (desktop) → `/api/sync` → attendance_logs → trigger fires
- **Auth:** Custom JWT + `employees` table privilege levels (0=user, 14=admin, etc.)

---

## 🏗️ Future Architecture Migration — Clean Schedule Format (Replace tz_string)

> Status: Planned — do NOT implement until next major feature sprint
> Decided: 2026-02-27 after Ramzan timing incident

### Background

The current schedule system uses the **ZK device's proprietary `tz_string` format** — a 56-character binary encoding of weekly shift times. This format was inherited because the original design intended to sync schedules from the ZK device itself. However, in practice:

- **We don't use the ZK device to define schedules.** The device is purely a **punch recorder**. All schedule management happens in our app.
- The tz_string format has caused multiple bugs: wrong offset parsing (`+4` header bug), wrong PKT→UTC conversion for overnight shifts, and opaque data that's impossible to debug by eye.
- Every schedule edge case (half days, exceptions, overrides) fights against the tz_string encoding.
- The Ramzan timing incident on 2026-02-27 exposed that both the Next.js route AND the Edge Function had independent copies of the tz_string parser, each with their own bugs.

### The Proposed Migration

Replace the `time_zones` table tz_string with proper structured schedule records:

**New `shifts` table:**
```sql
CREATE TABLE shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                    -- "Night Shift 8PM-5AM"
  start_time  TIME NOT NULL,                    -- '20:00' (PKT, local time)
  end_time    TIME NOT NULL,                    -- '05:00' (PKT, next day if < start)
  working_days INT[] NOT NULL,                  -- {1,2,3,4,5} (0=Sun, 6=Sat)
  is_overnight BOOLEAN GENERATED ALWAYS AS     -- auto-computed
                (end_time < start_time) STORED,
  buffer_minutes INT NOT NULL DEFAULT 30,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

**Calculation becomes trivial:**
```
1. Look up employee's shift for that weekday (check working_days array)
2. shiftStartUTC = date + start_time - 5h  (simple subtraction)
3. shiftEndUTC   = date + end_time   - 5h  (if is_overnight: +24h to end)
4. Match allPunches within [startUTC - buffer, endUTC + 1h]
5. isLate = firstPunch > startUTC + buffer
```

No encoding, no parsing, no offset arithmetic bugs, no header issues.

### Why Not Now

- **Not urgent:** Current system is functional after 2026-02-27 fixes (Edge Function v4)
- **Migration cost:** Requires rewriting `time_zones` table, all 4+ parsers (Next.js route, Edge Function, schedules UI, employee-schedule API), and migrating 12+ existing tz_string records
- **Risk:** Large surface area rewrite in a production system with 8K+ attendance logs already calculated
- **Do it when:** Building the Visual Shift Builder (roadmap item #9) or Payslip feature — those already require touching the schedule system

### ZK Timestamp Concern

The timezone complexity of ZK devices is **separate** from the schedule format. Regardless of schedule format:
- ZK punches come in UTC (after our sync route correction)
- We convert to PKT for display only
- Schedule comparison always happens in UTC space

The tz_string is the **schedule definition format** — not the timestamp handling. Fixing one does not affect the other.

### Migration Checklist (for when we do it)

- [ ] Create `shifts` table + seed data from existing tz_strings
- [ ] Update `calculateForDateRange` in `/api/reports/daily-work-time/route.js`
- [ ] Update Edge Function `process-attendance-queue`
- [ ] Update Schedules page UI (builder + display)
- [ ] Update `employee-schedule` API `/api/hr/employee-schedule`
- [ ] Update schedule overrides to reference `shifts.id` instead of `time_zones.id`
- [ ] Keep `time_zones` table with old data for 30-day parallel run, then drop
- [ ] Queue full recalculation for all employees after migration

---

## 🔧 Bug Fixes Log (2026-02-27 Session)

> Ramzan timing incident — root cause analysis and all fixes applied

### Root Cause
The Ramzan schedule override (`active_from = 2025-02-19`) had the **wrong year** (2025 instead of 2026), retroactively applying the Ramzan Night schedule to a full year of history for 13 employees.

Additionally, `calculateForDateRange` (Next.js) and the Edge Function both read `individual_tz_1` directly from the employee row — unaware of schedule override date boundaries. This meant pre-Ramzan dates were calculated with the Ramzan schedule and vice versa.

### Fixes Applied
1. **DB:** Corrected `active_from = 2026-02-19` for all 13 affected employees' overrides
2. **Code (Next.js):** `calculateForDateRange` now queries `schedule_overrides` and resolves the correct tz_id per date (inside override window → override tz; outside → original tz / dept default)
3. **Edge Function v3:** Added same `schedule_overrides` date-aware resolution + fixed `offset = 4 + dayOfWeek * 8` → `offset = dayOfWeek * 8` (no header in tz_string)
4. **Edge Function v4:** Fixed overnight shift end time calculation — `endUTC` must not have `+24h` added when PKT→UTC conversion wraps via `+1440min`, as this was pushing the Feb23 night shift window into Feb24 and stealing the opening punch of the Feb24 shift
5. **Burst Drain API:** Fixed PostgREST limitation — `.order().limit()` not supported on `.update()` queries; replaced with SELECT-then-UPDATE-by-IDs pattern
6. **Queue Status API:** Fixed Supabase 1000-row default page limit — replaced row-fetch-then-count with parallel `COUNT` queries per status
7. **Schedule Overrides API:** Added 60-day lookback guard — rejects `active_from` dates more than 60 days in the past to prevent wrong-year typos
8. **Schedule Overrides API:** Both POST (assign) and DELETE (revert) now kick Edge Function burst after queuing, so recalculation starts immediately instead of waiting for next device sync

