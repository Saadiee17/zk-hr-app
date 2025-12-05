'use client'
import { Card } from '@mantine/core'

const shadowColors = {
    blue: 'rgba(37, 99, 235, 0.15)',
    yellow: 'rgba(234, 179, 8, 0.15)',
    green: 'rgba(34, 197, 94, 0.15)',
    red: 'rgba(239, 68, 68, 0.15)',
    gray: 'rgba(107, 114, 128, 0.15)',
    orange: 'rgba(249, 115, 22, 0.15)',
    grape: 'rgba(147, 51, 234, 0.15)',
}

export function PremiumCard({ children, color = 'blue', ...props }) {
    const shadowColor = shadowColors[color] || shadowColors.blue

    return (
        <Card
            shadow="sm"
            padding="xl"
            radius="lg"
            withBorder
            style={{
                height: '100%',
                transition: 'all 0.3s ease',
                borderLeft: `4px solid var(--mantine-color-${color}-6)`,
                background: `linear-gradient(135deg, var(--mantine-color-${color}-0) 0%, var(--mantine-color-white) 100%)`
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 12px 24px ${shadowColor}`
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = ''
            }}
            {...props}
        >
            {children}
        </Card>
    )
}
