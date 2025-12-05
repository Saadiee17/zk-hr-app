'use client'

import { Paper, Group, Text, ThemeIcon, SimpleGrid, Stack, Box } from '@mantine/core'

export function DarkStatsGroup({ data }) {
    // data = [{ label, value, icon, color }]

    return (
        <Paper
            p="xl"
            radius="lg"
            style={{
                backgroundColor: '#1A1B1E', // Dark color
                color: 'white',
            }}
        >
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" verticalSpacing="xl">
                {data.map((item, index) => (
                    <Box key={index} style={{ position: 'relative' }}>
                        <Group>
                            <ThemeIcon
                                size={56}
                                radius="md"
                                variant="filled"
                                color={item.color || 'dark'}
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: item.iconColor || 'white'
                                }}
                            >
                                <item.icon size={28} stroke={1.5} />
                            </ThemeIcon>
                            <div>
                                <Text size="xs" tt="uppercase" fw={700} style={{ color: '#909296', letterSpacing: '0.5px' }}>
                                    {item.label}
                                </Text>
                                <Text size="xl" fw={700} c="white" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
                                    {item.value}
                                </Text>
                            </div>
                        </Group>
                        {/* Divider for desktop - hidden on mobile/last item */}
                        {index < 3 && (
                            <Box
                                visibleFrom="md"
                                style={{
                                    position: 'absolute',
                                    right: '-16px', // Half of spacing
                                    top: '10%',
                                    bottom: '10%',
                                    width: '1px',
                                    backgroundColor: '#2C2E33'
                                }}
                            />
                        )}
                    </Box>
                ))}
            </SimpleGrid>
        </Paper>
    )
}
