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
