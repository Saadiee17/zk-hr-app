'use client'

import { Card, Stack, Text, Group } from '@mantine/core'
import { memo } from 'react'

/**
 * MetricCard - Reusable metric card component for dashboard
 * @param {Object} props
 * @param {string|number} props.value - The main metric value to display
 * @param {string} props.label - Label text (uppercase, shown above value)
 * @param {string} props.description - Description text (shown below value)
 * @param {string} props.color - Mantine color name for the value and border
 * @param {boolean} props.clickable - Whether the card is clickable (default: false)
 * @param {Function} props.onClick - Click handler (optional)
 * @param {string} props.size - Size of the value text ('sm' | 'md' | 'lg', default: 'lg')
 */
export const MetricCard = memo(({
  value,
  label,
  description,
  color = 'blue',
  clickable = false,
  onClick,
  size = 'lg',
  icon: Icon
}) => {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 42
  }

  const fontSize = sizeMap[size] || 42
  const isClickable = clickable || !!onClick

  return (
    <Card
      padding="lg"
      radius="lg"
      withBorder={false}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
        background: 'rgba(255, 255, 255, 0.98)', // Significantly faster than backdrop-filter
        border: '1px solid #f1f3f5',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: 'translateZ(0)', // GPU promotion
        willChange: isClickable ? 'transform, box-shadow' : 'auto'
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(-4px) translateZ(0)'
          e.currentTarget.style.boxShadow = '0 12px 24px -2px rgba(0, 0, 0, 0.08)'
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(0) translateZ(0)'
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.02)'
        }
      }}
      onClick={onClick}
    >
      <Stack gap="xs" justify="space-between" h="100%">
        <Group justify="space-between" align="flex-start">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={1}>{label}</Text>
          {Icon && <Icon size={20} stroke={1.5} color={`var(--mantine-color-${color}-6)`} />}
        </Group>

        <Group align="flex-end" gap="xs">
          <Text size={fontSize} fw={700} c="dark" lh={1} style={{ letterSpacing: '-1px' }}>{value}</Text>
        </Group>

        {description && (
          <Text size="sm" c="dimmed" lh={1.4}>{description}</Text>
        )}
      </Stack>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

