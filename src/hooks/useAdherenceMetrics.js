import { useMemo } from 'react'
import { calculateAdherenceMetrics } from '@/utils/metricsUtils'

/**
 * useAdherenceMetrics - Hook for calculating adherence metrics from report data
 * @param {Array} reportRows - Array of report row objects
 * @returns {object} Metrics object with adherence, counts, hours, etc.
 */
export function useAdherenceMetrics(reportRows = []) {
  const metrics = useMemo(() => {
    return calculateAdherenceMetrics(reportRows)
  }, [reportRows])

  return metrics
}


