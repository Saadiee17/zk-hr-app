# Scripts Documentation

## Attendance Log Validation

### Overview
The `validate-attendance-logs.js` script performs comprehensive data quality checks on attendance logs stored in Supabase. It's designed to catch timezone corruption, duplicates, and other anomalies early.

### What It Checks

1. **Timezone Offset Anomalies**
   - Detects future-dated logs (logs with timestamps in the future)
   - Detects very old logs (> 365 days old)
   - Flags suspicious UTC offset patterns

2. **Duplicate Records**
   - Identifies multiple logs with identical zk_user_id, log_time, and status
   - Helps catch sync errors or double-processing

3. **Missing Employee Records**
   - Ensures every zk_user_id in attendance_logs has a corresponding employee
   - Shows which users have orphaned log records

4. **Punch Pattern Analysis**
   - Detects unrealistic punch patterns (e.g., > 15 punches per employee per day)
   - Flags potential device malfunction or data corruption

### Usage

**Basic check (last 30 days):**
```bash
node scripts/validate-attendance-logs.js
```

**Check specific date range:**
```bash
node scripts/validate-attendance-logs.js --from 2025-10-30 --to 2025-11-02
```

**Generate detailed report:**
```bash
node scripts/validate-attendance-logs.js --report
```

**Combine options:**
```bash
node scripts/validate-attendance-logs.js --from 2025-11-01 --to 2025-11-02 --report
```

### Output Example

```
📊 Attendance Log Data Quality Validation
   Checking: 2025-10-03 to 2025-11-02
   Detailed Report: NO

======================================================================

1️⃣  Fetching attendance logs...
   ✓ Fetched 150 logs

2️⃣  Checking for timezone offset anomalies...
   ✓ No timezone offset anomalies detected

3️⃣  Checking for duplicate records...
   ✓ No duplicate records found

4️⃣  Checking for missing employee records...
   ✓ All logs have corresponding employee records

5️⃣  Analyzing punch patterns...
   ✓ Punch patterns appear normal

======================================================================

📋 Validation Summary:
   Total logs checked: 150
   Timezone anomalies: 0
   Duplicate records: 0
   Missing employees: 0
   Suspicious patterns: 0

✅ All validations passed! Data quality looks good.

======================================================================
```

### Integration with CI/CD

**Daily scheduled check (suggested cron):**
```bash
# Add to your scheduled jobs (e.g., GitHub Actions, CircleCI)
0 0 * * * cd /path/to/project && node scripts/validate-attendance-logs.js
```

**Pre-deployment check:**
```bash
# Run before deploying to catch data issues
npm run validate:logs -- --report
```

Add to `package.json`:
```json
{
  "scripts": {
    "validate:logs": "node scripts/validate-attendance-logs.js"
  }
}
```

### Exit Codes

- `0` - Validation passed
- `1` - Validation errors or connection issues

### Interpreting Results

#### 🔴 CRITICAL Issues
- **Future-dated logs**: Check device timezone settings
- **Missing employees**: Sync employees from device before re-syncing logs

#### 🟡 WARNING Issues
- **Duplicate records**: May indicate sync race condition
- **Very old logs**: Expected if catching up after long downtime
- **Suspicious patterns**: Could indicate device malfunction

### Related Files

- **Incident Report**: [DATA_QUALITY_INCIDENT.md](../DATA_QUALITY_INCIDENT.md)
- **Sync Logic**: [src/app/api/sync/route.js](../src/app/api/sync/route.js)
- **Report Logic**: [src/app/api/reports/daily-work-time/route.js](../src/app/api/reports/daily-work-time/route.js)

### Troubleshooting

**"Missing Supabase credentials"**
- Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**"Failed to fetch logs"**
- Check database connectivity
- Verify Supabase project is active
- Check authentication credentials

**Script hangs**
- May indicate connection issues with Supabase
- Check network connectivity
- Review Supabase service status

### Future Improvements

- [ ] Export reports to CSV/JSON format
- [ ] Send alerts for critical issues
- [ ] Track validation metrics over time
- [ ] Automatic remediation for duplicates
- [ ] Dashboard view of data quality









