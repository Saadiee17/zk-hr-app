'use client'

import { Container, Title, Paper, Text } from '@mantine/core'

export default function EmployeeEnrollmentPage() {
  return (
    <Container size="xl" py="xl" style={{ minHeight: '100vh' }}>
      <Title order={1} mb="md">Employee Enrollment</Title>

      <Paper withBorder shadow="sm" p="md">
        <Text c="dimmed">Employee Enrollment content will go here.</Text>
      </Paper>
    </Container>
  )
}










