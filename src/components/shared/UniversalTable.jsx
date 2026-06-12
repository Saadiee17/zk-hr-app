'use client'
import { Paper, Table } from '@mantine/core'

export function UniversalTable({ children, minWidth = 640, ...props }) {
    return (
        <Paper withBorder radius="lg" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth }} {...props}>
                    {children}
                </Table>
            </div>
        </Paper>
    )
}

export function UniversalTableHeader({ children, ...props }) {
    return (
        <Table.Thead style={{ backgroundColor: 'var(--mantine-color-default-hover)' }} {...props}>
            {children}
        </Table.Thead>
    )
}

UniversalTable.Thead = UniversalTableHeader
UniversalTable.Tbody = Table.Tbody
UniversalTable.Tr = Table.Tr
UniversalTable.Th = Table.Th
UniversalTable.Td = Table.Td
