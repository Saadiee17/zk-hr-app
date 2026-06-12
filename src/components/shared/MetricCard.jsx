'use client'

import { Card, Stack, Text, Group, Box, Skeleton, useComputedColorScheme } from '@mantine/core'
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
  icon: Icon,
  loading = false
}) => {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 42
  }

  const fontSize = sizeMap[size] || 42
  const isClickable = clickable || !!onClick
  const isDark = useComputedColorScheme('light') === 'dark'

  return (
    <Card
      padding="lg"
      radius={16}
      withBorder={false}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease',
        background: isDark
          ? 'var(--mantine-color-dark-6)'
          : `linear-gradient(180deg, #ffffff 0%, var(--mantine-color-${color}-0) 160%)`,
        border: isDark ? '1px solid var(--mantine-color-dark-4)' : '1px solid #e9edf3',
        borderTop: `3px solid var(--mantine-color-${color}-5)`,
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
          {Icon && (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: `var(--mantine-color-${color}-light)`,
                color: `var(--mantine-color-${color}-light-color)`,
              }}
            >
              <Icon size={18} stroke={1.7} />
            </Box>
          )}
        </Group>

        <Group align="flex-end" gap="xs">
          {loading ? (
            <Skeleton height={fontSize} width={72} radius="sm" />
          ) : (
            <Text size={fontSize} fw={800} lh={1} style={{ letterSpacing: '-1.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
          )}
        </Group>

        {description && (
          <Group gap={6} align="center">
            <Box w={6} h={6} style={{ borderRadius: '50%', backgroundColor: `var(--mantine-color-${color}-5)` }} />
            <Text size="sm" c="dimmed" lh={1.4}>{description}</Text>
          </Group>
        )}
      </Stack>
    </Card>
  )
})

MetricCard.displayName = 'MetricCard'

