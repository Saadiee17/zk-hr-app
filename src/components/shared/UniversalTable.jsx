'use client'
import { Paper, Table } from '@mantine/core'

export function UniversalTable({ children, ...props }) {
    return (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
            <Table striped highlightOnHover verticalSpacing="sm" {...props}>
                {children}
            </Table>
        </Paper>
    )
}

export function UniversalTableHeader({ children, ...props }) {
    return (
        <Table.Thead style={{ backgroundColor: 'var(--mantine-color-gray-0)' }} {...props}>
            {children}
        </Table.Thead>
    )
}

UniversalTable.Thead = UniversalTableHeader
UniversalTable.Tbody = Table.Tbody
UniversalTable.Tr = Table.Tr
UniversalTable.Th = Table.Th
UniversalTable.Td = Table.Td
