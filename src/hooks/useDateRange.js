import { useState, useEffect } from 'react'

/**
 * useDateRange - Hook for managing date range state with quick filter presets
 * @param {string} defaultFilter - Default filter preset ('today', 'yesterday', 'this-week', 'last-week', 'this-month', 'custom')
 * @returns {object} { dateRange, setDateRange, dateFilter, setDateFilter, handleFilterChange }
 */
export function useDateRange(defaultFilter = 'this-month') {
  const [dateFilter, setDateFilter] = useState(defaultFilter)
  const [dateRange, setDateRange] = useState(() => {
    return getDateRangeForFilter(defaultFilter)
  })

  // Update date range when filter changes (except for custom)
  useEffect(() => {
    // Don't auto-update range for custom filter - let user select freely
    if (dateFilter === 'custom') {
      return
    }
    const range = getDateRangeForFilter(dateFilter)
    if (range) {
      setDateRange(range)
    }
  }, [dateFilter])

  const handleFilterChange = (filter) => {
    setDateFilter(filter)
    // Don't recalculate range for custom - let user select via date picker
    if (filter === 'custom') {
      return
    }
    const range = getDateRangeForFilter(filter)
    if (range) {
      setDateRange(range)
    }
  }

  const handleCustomRangeChange = (range) => {
    setDateRange(range)
    // Only update filter to custom when both dates are selected
    if (range && range[0] && range[1]) {
      setDateFilter('custom')
    }
    // Don't auto-reset to 'this-month' - allow free date selection
  }

  return {
    dateRange,
    setDateRange: handleCustomRangeChange,
    dateFilter,
    setDateFilter: handleFilterChange,
    handleFilterChange,
  }
}

function getDateRangeForFilter(filter) {
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
      return null
    default:
      return null
  }
}

