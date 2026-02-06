'use client'

import { useState, useEffect } from 'react'
import { Group, Button } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'

/**
 * DateRangeFilter - Reusable date range filter with quick filter buttons
 * @param {Array} value - Current date range [startDate, endDate]
 * @param {Function} onChange - Callback when date range changes
 * @param {string} defaultFilter - Default filter preset ('today', 'yesterday', 'this-week', 'last-week', 'this-month', 'custom')
 */
export function DateRangeFilter({ value, onChange, defaultFilter = 'this-month', dateFilter: externalDateFilter, onFilterChange }) {
  const [internalDateFilter, setInternalDateFilter] = useState(defaultFilter)
  const dateFilter = externalDateFilter !== undefined ? externalDateFilter : internalDateFilter
  const setDateFilter = onFilterChange || setInternalDateFilter

  // Sync internal state with external dateFilter prop
  if (externalDateFilter !== undefined && externalDateFilter !== internalDateFilter) {
    setInternalDateFilter(externalDateFilter)
  }

  const getDateRangeForFilter = (filter) => {
    const now = new Date()
    
    switch (filter) {
      case 'today': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return [today, today]
      }
      case 'yesterday': {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        return [yesterday, yesterday]
      }
      case 'this-week': {
        const startOfWeek = new Date(now)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        startOfWeek.setHours(0, 0, 0, 0)
        return [startOfWeek, now]
      }
      case 'last-week': {
        const startOfThisWeek = new Date(now)
        const day = startOfThisWeek.getDay()
        const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfThisWeek.setDate(diff)
        startOfThisWeek.setHours(0, 0, 0, 0)
        const endOfLastWeek = new Date(startOfThisWeek)
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1)
        const startOfLastWeek = new Date(endOfLastWeek)
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 6)
        return [startOfLastWeek, endOfLastWeek]
      }
      case 'this-month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        start.setHours(0, 0, 0, 0) // Ensure midnight in local timezone
        const end = new Date(now)
        end.setHours(23, 59, 59, 999) // End of today
        return [start, end]
      }
      case 'custom':
        return value || null
      default:
        return null
    }
  }

  // Initialize date range based on default filter
  useEffect(() => {
    if (defaultFilter && !value) {
      const range = getDateRangeForFilter(defaultFilter)
      if (range) {
        onChange(range)
      }
    }
  }, [defaultFilter, value, onChange])


  const handleFilterChange = (filter) => {
    setDateFilter(filter)
    const range = getDateRangeForFilter(filter)
    if (range) {
      onChange(range)
    } else if (filter === 'custom') {
      // Keep current range for custom
      onChange(value)
    }
  }

  const handleCustomRangeChange = (range) => {
    onChange(range)
    if (range && range[0] && range[1]) {
      setDateFilter('custom')
    } else {
      // Reset to this-month if range is cleared
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const newRange = [start, now]
      onChange(newRange)
      setDateFilter('this-month')
    }
  }

  return (
    <>
      <div>
        <Group gap="xs" wrap="wrap">
          <Button
            variant={dateFilter === 'today' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('today')}
          >
            Today
          </Button>
          <Button
            variant={dateFilter === 'yesterday' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('yesterday')}
          >
            Yesterday
          </Button>
          <Button
            variant={dateFilter === 'this-week' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('this-week')}
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === 'last-week' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('last-week')}
          >
            Last Week
          </Button>
          <Button
            variant={dateFilter === 'this-month' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('this-month')}
          >
            This Month
          </Button>
          <Button
            variant={dateFilter === 'custom' ? 'filled' : 'light'}
            size="sm"
            onClick={() => handleFilterChange('custom')}
          >
            Custom
          </Button>
        </Group>
      </div>
      
      {dateFilter === 'custom' && (
        <DatePickerInput
          type="range"
          label="Custom Date Range"
          placeholder="Pick range"
          value={value}
          onChange={handleCustomRangeChange}
          clearable
        />
      )}
    </>
  )
}

