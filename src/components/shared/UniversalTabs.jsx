'use client'
import { Tabs } from '@mantine/core'

export function UniversalTabs({ children, ...props }) {
    return (
        <Tabs
            variant="pills"
            radius="md"
            styles={{
                list: { backgroundColor: 'white', padding: '4px', borderRadius: '12px', border: '1px solid #e9ecef' },
                tab: { fontWeight: 600 }
            }}
            {...props}
        >
            {children}
        </Tabs>
    )
}

UniversalTabs.List = Tabs.List
UniversalTabs.Tab = Tabs.Tab
UniversalTabs.Panel = Tabs.Panel
