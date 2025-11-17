/**
 * Utility functions for employee-related operations
 */

import { formatEmployeeName } from './attendanceUtils'

/**
 * Privilege level options for employee privilege selection
 */
export const PRIVILEGE_OPTIONS = [
  { value: '0', label: 'Employee' },
  { value: '1', label: 'Registrar' },
  { value: '2', label: 'Administrator' },
  { value: '3', label: 'Super Admin' },
]

/**
 * Get privilege label from privilege value
 * @param {string|number} value - Privilege value (0-3)
 * @returns {string} Privilege label
 */
export const getPrivilegeLabel = (value) => {
  const option = PRIVILEGE_OPTIONS.find(opt => opt.value === String(value))
  return option?.label || `Privilege ${value}`
}

/**
 * Convert array of employees to select options format
 * @param {Array} employees - Array of employee objects
 * @returns {Array} Array of {value, label} objects for Select component
 */
export const getEmployeeSelectOptions = (employees) => {
  if (!employees || !Array.isArray(employees)) return []
  return employees.map(employee => ({
    value: employee.id,
    label: formatEmployeeName(employee),
  }))
}

/**
 * Convert array of departments to select options format
 * @param {Array} departments - Array of department objects
 * @returns {Array} Array of {value, label} objects for Select component
 */
export const getDepartmentSelectOptions = (departments) => {
  if (!departments || !Array.isArray(departments)) return []
  return departments.map(dept => ({
    value: dept.id,
    label: dept.name,
  }))
}


