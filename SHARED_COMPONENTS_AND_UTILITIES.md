# Shared Components, Utilities, and Hooks Documentation

This document provides a comprehensive overview of all shared utilities, components, and hooks in the codebase, their usage locations, and identifies old code that can be removed.

---

## 📋 Quick Reference

### Shared Utilities
| Utility | File | Main Functions |
|---------|------|----------------|
| `attendanceUtils.js` | `src/utils/attendanceUtils.js` | `formatHoursMinutes`, `formatDateWithDay`, `toYMD`, `getStatusColor`, `getStatusOptions`, `formatEmployeeName` |
| `metricsUtils.js` | `src/utils/metricsUtils.js` | `calculateAdherenceMetrics`, `aggregateHours` |
| `notifications.js` | `src/utils/notifications.js` | `showSuccess`, `showError`, `showInfo`, `showLoading`, `updateNotification`, `showApiSuccess`, `showApiError` |
| `employeeUtils.js` | `src/utils/employeeUtils.js` | `PRIVILEGE_OPTIONS`, `getPrivilegeLabel`, `getEmployeeSelectOptions`, `getDepartmentSelectOptions` |

### Shared Components
| Component | File | Purpose |
|-----------|------|---------|
| `StatusBadge` | `src/components/shared/StatusBadge.jsx` | Attendance status badges |
| `LeaveStatusBadge` | `src/components/shared/LeaveStatusBadge.jsx` | Leave request status badges |
| `DateRangeFilter` | `src/components/shared/DateRangeFilter.jsx` | Date range selection with quick filters |
| `AdherenceMetrics` | `src/components/shared/AdherenceMetrics.jsx` | Attendance metrics visualization |
| `AttendanceTable` | `src/components/shared/AttendanceTable.jsx` | Universal attendance table |
| `LeaveRequestForm` | `src/components/shared/LeaveRequestForm.jsx` | Leave request form |
| `LeaveBalanceCard` | `src/components/shared/LeaveBalanceCard.jsx` | Leave balance display card |
| `ProfileFormFields` | `src/components/shared/ProfileFormFields.jsx` | Employee profile form fields |
| `PasswordChangeModal` | `src/components/shared/PasswordChangeModal.jsx` | Password change modal |

### Custom Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useDateRange` | `src/hooks/useDateRange.js` | Date range state management |
| `useStatusFilter` | `src/hooks/useStatusFilter.js` | Status filtering logic |
| `useAdherenceMetrics` | `src/hooks/useAdherenceMetrics.js` | Adherence metrics calculation |
| `useAttendanceReport` | `src/hooks/useAttendanceReport.js` | Attendance report data fetching |
| `useDepartmentOptions` | `src/hooks/useDepartmentOptions.js` | Department options fetching with loading states |

---

## 📁 Shared Utilities

### 1. `src/utils/attendanceUtils.js`

**Purpose**: Utility functions for attendance-related formatting and status handling.

**Exported Functions**:

#### `formatHoursMinutes(decimalHours)`
- **Description**: Converts decimal hours to "Xh Ym" format (e.g., 8.5 → "8h 30m")
- **Used in**:
  - `src/components/shared/AdherenceMetrics.jsx`
  - `src/components/shared/AttendanceTable.jsx`
  - `src/app/employee/dashboard/page.jsx`
  - `src/app/payroll-reports/attendance-outlier/page.jsx`

#### `formatDateWithDay(dateStr)`
- **Description**: Formats date string with day name (returns `{dayName, dateStr}`)
- **Used in**:
  - `src/components/shared/AttendanceTable.jsx`
  - `src/app/employee/dashboard/page.jsx`
  - `src/app/payroll-reports/attendance-outlier/page.jsx`

#### `toYMD(d)`
- **Description**: Converts date to YYYY-MM-DD format
- **Used in**:
  - `src/components/shared/LeaveRequestForm.jsx`
  - `src/components/EmployeeProfileReporting.jsx`
  - `src/app/employees/manage/page.jsx`
  - `src/app/leave-management/page.jsx`
  - `src/app/employee/leave/page.jsx`
  - `src/app/payroll-reports/page.jsx`
  - `src/hooks/useAttendanceReport.js`

#### `getStatusColor(status)`
- **Description**: Returns Mantine color name for attendance status
- **Used in**:
  - `src/components/shared/StatusBadge.jsx`

#### `getStatusOptions(reportRows)`
- **Description**: Generates status filter options from report rows
- **Used in**:
  - `src/hooks/useStatusFilter.js`

#### `formatEmployeeName(employee)`
- **Description**: Formats employee name from employee object
- **Used in**:
  - `src/app/leave-management/page.jsx`

---

### 2. `src/utils/metricsUtils.js`

**Purpose**: Utility functions for calculating attendance metrics.

**Exported Functions**:

#### `calculateAdherenceMetrics(reportRows)`
- **Description**: Calculates adherence metrics from report rows (adherence %, counts, hours, etc.)
- **Used in**:
  - `src/hooks/useAdherenceMetrics.js`

#### `aggregateHours(data)`
- **Description**: Aggregates hours across multiple employees or days
- **Status**: Available but not currently used (reserved for future use)

---

## 🧩 Shared Components

### 1. `src/components/shared/StatusBadge.jsx`

**Purpose**: Reusable status badge component for attendance status with consistent color mapping.

**Props**:
- `status` (string): Attendance status
- `variant` (string, default: 'light'): Badge variant
- `...props`: Additional props passed to Badge component

**Used in**:
- `src/components/shared/AttendanceTable.jsx`
- `src/app/employee/dashboard/page.jsx`
- `src/app/payroll-reports/page.jsx`

---

### 2. `src/components/shared/LeaveStatusBadge.jsx`

**Purpose**: Reusable component for displaying leave request status (pending, approved, rejected, cancelled).

**Props**:
- `status` (string): Leave status
- `variant` (string, default: 'light'): Badge variant
- `...props`: Additional props passed to Badge component

**Used in**:
- `src/app/leave-management/page.jsx`
- `src/app/employee/leave/page.jsx`

---

### 3. `src/components/shared/DateRangeFilter.jsx`

**Purpose**: Reusable component for date range selection with quick filter buttons.

**Props**:
- `value` (array): Current date range `[startDate, endDate]`
- `onChange` (function): Callback when date range changes
- `defaultFilter` (string, default: 'this-month'): Default filter preset
- `dateFilter` (string, optional): External date filter state
- `onFilterChange` (function, optional): Callback when filter preset changes

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

### 4. `src/components/shared/AdherenceMetrics.jsx`

**Purpose**: Component to display attendance adherence metrics visually (ring progress, breakdown, hours).

**Props**:
- `metrics` (object): Metrics object from `calculateAdherenceMetrics()`

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

### 5. `src/components/shared/AttendanceTable.jsx`

**Purpose**: Universal table component for displaying attendance records with expandable rows and status badges.

**Props**:
- `data` (array): Array of attendance records
- `loading` (boolean): Loading state
- `filteredData` (array, optional): Filtered data to display (if not provided, uses `data`)
- `showExpandableRows` (boolean, default: true): Whether to show expandable rows

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`
- `src/app/payroll-reports/page.jsx`

---

### 6. `src/components/shared/LeaveRequestForm.jsx`

**Purpose**: Reusable form component for creating/editing leave requests.

**Props**:
- `leaveTypes` (array): Array of leave type objects
- `employees` (array, optional): Array of employee objects (for admin view)
- `initialValues` (object, optional): Initial form values
- `onSubmit` (function): Callback when form is submitted
- `onCancel` (function, optional): Callback when form is cancelled
- `loading` (boolean, default: false): Loading state
- `showEmployeeSelect` (boolean, default: false): Whether to show employee select (for admin)
- `employeeId` (string, optional): Pre-selected employee ID (for employee view)

**Used in**:
- `src/app/leave-management/page.jsx`
- `src/app/employee/leave/page.jsx`

---

### 7. `src/components/shared/LeaveBalanceCard.jsx`

**Purpose**: Reusable card component for displaying leave balance information.

**Props**:
- `balance` (object): Leave balance object with `leave_type`, `total_allotted`, `used`, `pending`, `remaining`

**Used in**:
- `src/app/employee/leave/page.jsx`

---

### 8. `src/components/shared/ProfileFormFields.jsx`

**Purpose**: Reusable form fields component for employee profile editing.

**Props**:
- `profile` (object): Profile object with employee data
- `formValues` (object): Current form values `{phone, email, address, birthday}`
- `onChange` (function): Callback when form values change
- `isEditing` (boolean, default: false): Whether fields are editable
- `showReadOnlyFields` (boolean, default: true): Whether to show read-only fields

**Used in**:
- `src/app/employee/profile/page.jsx`

---

### 9. `src/components/shared/PasswordChangeModal.jsx`

**Purpose**: Reusable modal component for changing passwords.

**Props**:
- `opened` (boolean): Whether modal is open
- `onClose` (function): Callback when modal is closed
- `onSubmit` (function): Callback when form is submitted (receives `{currentPassword, newPassword, confirmPassword}`)
- `loading` (boolean, default: false): Loading state

**Used in**:
- `src/app/employee/profile/page.jsx`

---

## 🎣 Custom Hooks

### 1. `src/hooks/useDateRange.js`

**Purpose**: Custom hook to manage date range state and provide quick filter presets.

**Returns**:
- `dateRange` (array): Current date range `[startDate, endDate]`
- `setDateRange` (function): Function to update date range
- `dateFilter` (string): Current filter preset
- `setDateFilter` (function): Function to update filter preset

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

### 2. `src/hooks/useStatusFilter.js`

**Purpose**: Custom hook to manage status filtering logic for attendance reports.

**Parameters**:
- `reportRows` (array): Array of report row objects

**Returns**:
- `statusFilter` (string): Current status filter value
- `setStatusFilter` (function): Function to update status filter
- `statusOptions` (array): Array of status filter options
- `filteredRows` (array): Filtered report rows

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

### 3. `src/hooks/useAdherenceMetrics.js`

**Purpose**: Custom hook to calculate adherence metrics from attendance report data.

**Parameters**:
- `reportRows` (array): Array of report row objects

**Returns**:
- `adherenceMetrics` (object): Metrics object from `calculateAdherenceMetrics()`

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

### 4. `src/hooks/useAttendanceReport.js`

**Purpose**: Custom hook to fetch attendance report data and manage loading/error states.

**Parameters**:
- `employeeId` (string): Employee ID
- `dateRange` (array): Date range `[startDate, endDate]`

**Returns**:
- `reportRows` (array): Array of report row objects
- `loading` (boolean): Loading state
- `fetchReport` (function): Function to manually refetch report

**Used in**:
- `src/components/EmployeeProfileReporting.jsx`

---

## 🗑️ Old Code to Remove

The following code sections can be safely removed as they have been replaced by shared components/utilities:

### 1. **Duplicate `toYMD` function**

**Location**: `src/app/employees/manage/page.jsx`
- **Line**: Previously around line 179 (already removed)
- **Status**: ✅ Already removed - now uses `toYMD` from `@/utils/attendanceUtils`

---

### 2. **Duplicate status badge functions**

**Location**: `src/app/leave-management/page.jsx`
- **Lines**: Previously around lines 474-486
- **Function**: `getStatusBadge(status)`
- **Status**: ✅ Already removed - now uses `LeaveStatusBadge` component

**Location**: `src/app/employee/leave/page.jsx`
- **Lines**: Previously around lines 150-162
- **Function**: `getStatusBadge(status)`
- **Status**: ✅ Already removed - now uses `LeaveStatusBadge` component

---

### 3. **Duplicate employee name formatting**

**Location**: `src/app/leave-management/page.jsx`
- **Lines**: Multiple locations where `${employee.first_name || ''} ${employee.last_name || ''}`.trim() was used
- **Status**: ✅ Already replaced - now uses `formatEmployeeName()` from `@/utils/attendanceUtils`

---

### 4. **Duplicate date formatting functions**

**Location**: `src/app/employee/dashboard/page.jsx`
- **Status**: ✅ Already using shared utilities (`formatHoursMinutes`, `formatDateWithDay`)

**Location**: `src/app/payroll-reports/page.jsx`
- **Status**: ✅ Already using shared utilities (`toYMD`)

---

### 5. **Duplicate leave request form code**

**Location**: `src/app/employee/leave/page.jsx`
- **Lines**: Previously around lines 306-368 (form JSX)
- **Status**: ✅ Already replaced - now uses `LeaveRequestForm` component

**Location**: `src/app/leave-management/page.jsx`
- **Lines**: Previously around lines 829-871 (form JSX)
- **Status**: ✅ Already replaced - now uses `LeaveRequestForm` component

---

### 6. **Duplicate leave balance card code**

**Location**: `src/app/employee/leave/page.jsx`
- **Lines**: Previously around lines 247-290 (card JSX)
- **Status**: ✅ Already replaced - now uses `LeaveBalanceCard` component

---

### 7. **Duplicate profile form fields**

**Location**: `src/app/employee/profile/page.jsx`
- **Lines**: Previously around lines 224-318 (form fields JSX)
- **Status**: ✅ Already replaced - now uses `ProfileFormFields` component

---

### 8. **Duplicate password change modal**

**Location**: `src/app/employee/profile/page.jsx`
- **Lines**: Previously around lines 350-390 (modal JSX)
- **Status**: ✅ Already replaced - now uses `PasswordChangeModal` component

---

### 9. **Duplicate utility functions - REFACTORED**

**Location**: `src/app/payroll-reports/attendance-outlier/page.jsx`
- **Lines**: Previously around lines 11-35
- **Functions**: 
  - `formatHoursMinutes(decimalHours)` - Duplicate of shared utility
  - `formatDateWithDay(dateStr)` - Duplicate of shared utility
- **Action Taken**: Replaced with imports from `@/utils/attendanceUtils`
- **Status**: ✅ **COMPLETED** - Now uses shared utilities

**Location**: `src/app/api/reports/payroll/route.js`
- **Line**: Previously around line 35
- **Function**: `toYMD(d)` - Duplicate of shared utility
- **Note**: This function was defined but never actually used in the API route (dates come from query params already formatted). The duplicate function has been removed.
- **Status**: ✅ **COMPLETED** - Duplicate function removed (was unused)

---

### 10. **Unused imports to clean up**

Check the following files for unused imports that may have been left after refactoring:

- `src/app/leave-management/page.jsx` - Check for unused `useForm` imports if `requestForm` was removed
- `src/app/employee/leave/page.jsx` - Check for unused `Select`, `Textarea`, `DatePickerInput`, `Card`, `Grid` imports (some may still be needed)
- `src/app/employee/profile/page.jsx` - Check for unused `TextInput`, `PasswordInput`, `Modal`, `DateInput` imports (some may still be needed)

---

## 📊 Summary Statistics

- **Total Shared Utilities**: 4 files (`attendanceUtils.js`, `metricsUtils.js`, `notifications.js`, `employeeUtils.js`)
- **Total Shared Components**: 9 components
- **Total Custom Hooks**: 5 hooks (including `useDepartmentOptions`)
- **Pages Refactored**: 6 pages (including `attendance-outlier/page.jsx`)
- **API Routes Refactored**: 1 route (`api/reports/payroll/route.js`)
- **Code Reduction**: 
  - `EmployeeProfileReporting.jsx`: Reduced from 1582 lines to ~770 lines (51% reduction)
  - `employee/leave/page.jsx`: Reduced significantly by using shared components
  - `employee/profile/page.jsx`: Reduced by using shared components

## 🎯 Migration Guide for New Utilities

### **Migrating to Notification Utilities**

**Step 1**: Replace imports
```javascript
// Before:
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX } from '@tabler/icons-react'

// After:
import { showSuccess, showError, showApiError } from '@/utils/notifications'
```

**Step 2**: Replace notification calls
```javascript
// Before:
notifications.show({
  title: 'Success',
  message: 'Operation completed',
  color: 'green',
  icon: <IconCheck size={18} />,
})

// After:
showSuccess('Operation completed')
```

**Step 3**: Replace error handling
```javascript
// Before:
catch (error) {
  notifications.show({
    title: 'Error',
    message: error.message || 'Failed to perform operation',
    color: 'red',
    icon: <IconX size={18} />,
  })
}

// After:
catch (error) {
  showApiError(error, 'Failed to perform operation')
}
```

### **Migrating to Employee Utilities**

**Step 1**: Replace privilege options
```javascript
// Before:
const privilegeOptions = [
  { value: '0', label: 'Employee' },
  { value: '1', label: 'Registrar' },
  { value: '2', label: 'Administrator' },
  { value: '3', label: 'Super Admin' },
]

// After:
import { PRIVILEGE_OPTIONS } from '@/utils/employeeUtils'
// Use PRIVILEGE_OPTIONS directly
```

**Step 2**: Replace employee select options
```javascript
// Before:
const employeeOptions = employees.map(e => ({
  value: e.id,
  label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id,
}))

// After:
import { getEmployeeSelectOptions } from '@/utils/employeeUtils'
const employeeOptions = getEmployeeSelectOptions(employees)
```

### **Migrating to useDepartmentOptions Hook**

**Step 1**: Replace department fetching logic
```javascript
// Before:
const [deptOptions, setDeptOptions] = useState([])
const fetchDeptOptions = async () => {
  try {
    const res = await fetch('/api/hr/departments')
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to fetch departments')
    const opts = (json.data || []).map((d) => ({ value: d.id, label: d.name }))
    setDeptOptions(opts)
  } catch (error) {
    setDeptOptions([])
  }
}
useEffect(() => { fetchDeptOptions() }, [])

// After:
import { useDepartmentOptions } from '@/hooks/useDepartmentOptions'
const { options: deptOptions, loading } = useDepartmentOptions()
```

---

## 🎯 Completed Refactoring

### 1. `src/app/payroll-reports/attendance-outlier/page.jsx` ✅

**Actions Completed**:
- ✅ Removed duplicate `formatHoursMinutes` function (previously lines ~11-21)
- ✅ Removed duplicate `formatDateWithDay` function (previously lines ~22-35)
- ✅ Added imports: `import { formatHoursMinutes, formatDateWithDay } from '@/utils/attendanceUtils'`
- ✅ All usages now use shared utilities

**Impact**: Code reduction, improved consistency, easier maintenance

---

### 2. `src/app/api/reports/payroll/route.js` ✅

**Actions Completed**:
- ✅ Removed duplicate `toYMD` function (previously line ~35)
- ✅ Verified function was unused (dates come from query params already formatted)
- ✅ No import needed as function was never called

**Impact**: Cleaner code, removed dead code

---

## 🔍 Verification Checklist

Before removing old code, verify:

- [ ] All pages using shared components are working correctly
- [ ] No console errors in browser
- [ ] All functionality is preserved
- [ ] Visual appearance matches original
- [ ] All imports are correct
- [ ] No unused imports remain

---

## 📝 Notes

- All shared components are located in `src/components/shared/`
- All shared utilities are located in `src/utils/`
- All custom hooks are located in `src/hooks/`
- All components use the `'use client'` directive for Next.js client components
- All utilities and hooks are well-documented with JSDoc comments

---

**Last Updated**: 2025-01-XX
**Maintained By**: Development Team

