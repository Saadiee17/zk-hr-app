-- ============================================================
-- ZK HR App — Ramzan 2026 Migration
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Create schedule_overrides table
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  override_tz_id    INTEGER     NOT NULL REFERENCES time_zones(id),
  original_tz_id    INTEGER     REFERENCES time_zones(id),
  active_from       DATE        NOT NULL,
  active_until      DATE        NOT NULL,
  label             TEXT        NOT NULL DEFAULT 'Temporary Override',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  ended_by          TEXT
);

CREATE INDEX IF NOT EXISTS idx_overrides_employee_active
  ON schedule_overrides(employee_id, is_active);

CREATE INDEX IF NOT EXISTS idx_overrides_active_until
  ON schedule_overrides(active_until, is_active);

-- 2. Ramzan Morning Shift (ID 51)
-- 07:00–14:00, Mon–Fri, Sun+Sat off
-- buffer_time_minutes = 180 → arrive any time before 10:00am = On-Time
-- tz_string format: 7×8 chars (no header), day order: Sun Mon Tue Wed Thu Fri Sat
INSERT INTO time_zones (id, name, tz_string, buffer_time_minutes)
VALUES (
  51,
  'Ramzan Morning (7AM–2PM)',
  '00002359070014000700140007001400070014000700140000002359',
  180
)
ON CONFLICT (id) DO UPDATE
  SET name               = EXCLUDED.name,
      tz_string          = EXCLUDED.tz_string,
      buffer_time_minutes = EXCLUDED.buffer_time_minutes;

-- 3. Ramzan Night Shift (ID 52)
-- 21:00–04:00 (crosses midnight), Mon–Fri, Sun+Sat off
-- buffer_time_minutes = 30 (standard)
-- Friday night 21:00 → Saturday 04:00 handled by crossesMidnight engine logic
INSERT INTO time_zones (id, name, tz_string, buffer_time_minutes)
VALUES (
  52,
  'Ramzan Night (9PM–4AM)',
  '00002359210004002100040021000400210004002100040000002359',
  30
)
ON CONFLICT (id) DO UPDATE
  SET name               = EXCLUDED.name,
      tz_string          = EXCLUDED.tz_string,
      buffer_time_minutes = EXCLUDED.buffer_time_minutes;

-- 4. Verify
SELECT id, name, tz_string, buffer_time_minutes FROM time_zones WHERE id IN (51, 52);
SELECT COUNT(*) AS override_table_rows FROM schedule_overrides;
