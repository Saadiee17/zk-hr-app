'use client'

import { Card, Stack, Text } from '@mantine/core'

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
export function MetricCard({ 
  value, 
  label, 
  description, 
  color = 'blue',
  clickable = false,
  onClick,
  size = 'lg'
}) {
  const sizeMap = {
    sm: 24,
    md: 28,
    lg: 32
  }

  const fontSize = sizeMap[size] || 32
  const isClickable = clickable || !!onClick

  return (
    <Card 
      shadow="sm" 
      padding="md" 
      radius="lg" 
      withBorder 
      style={{ 
        cursor: isClickable ? 'pointer' : 'default', 
        transition: 'all 0.2s',
        borderLeft: `4px solid var(--mantine-color-${color}-6)`
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(-4px)'
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = ''
        }
      }}
      onClick={onClick}
    >
      <Stack gap={4}>
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
        <Text size={fontSize} fw={700} c={color} lh={1}>{value}</Text>
        {description && (
          <Text size="xs" c="dimmed">{description}</Text>
        )}
      </Stack>
    </Card>
  )
}

