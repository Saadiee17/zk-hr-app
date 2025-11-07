'use client'

import {
  Container,
  Title,
  Paper,
  Button,
  Text,
  Stack,
  Group,
  Alert,
  List,
  ThemeIcon,
  Divider,
} from '@mantine/core'
import { IconDownload, IconInfoCircle, IconDeviceDesktop } from '@tabler/icons-react'

export default function BridgeInstaller() {
  const handleDownload = () => {
    // Download is handled by the browser via the href attribute
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="md">ZK Bridge Installer</Title>
          <Text c="dimmed" size="lg">
            Download and install the ZK Bridge service to sync attendance data from your ZKTeco devices.
          </Text>
        </div>

        <Paper withBorder shadow="sm" p="xl">
          <Stack gap="lg">
            <Group>
              <ThemeIcon size={60} radius="md" variant="light" color="blue">
                <IconDeviceDesktop size={30} />
              </ThemeIcon>
              <div>
                <Title order={3}>ZKBridgeInstaller.exe</Title>
                <Text c="dimmed" size="sm">
                  Windows Installer Package
                </Text>
              </div>
            </Group>

            <Divider />

            <div>
              <Text fw={600} mb="sm">What does this installer do?</Text>
              <List spacing="xs" size="sm" c="dimmed">
                <List.Item>Installs the Python Bridge service on your Windows machine</List.Item>
                <List.Item>Configures automatic startup with Windows</List.Item>
                <List.Item>Sets up the bridge to sync attendance data from ZKTeco devices</List.Item>
                <List.Item>Provides a configuration editor for bridge settings</List.Item>
              </List>
            </div>

            <Alert icon={<IconInfoCircle size={18} />} title="Installation Requirements" color="blue" variant="light">
              <Text size="sm" mb="xs">
                Before installing, ensure you have:
              </Text>
              <List size="sm" spacing="xs">
                <List.Item>Windows 10 or later</List.Item>
                <List.Item>Administrator privileges (required for service installation)</List.Item>
                <List.Item>Network access to your ZKTeco device</List.Item>
                <List.Item>Supabase connection details (provided during configuration)</List.Item>
              </List>
            </Alert>

            <Button
              size="lg"
              leftSection={<IconDownload size={20} />}
              onClick={handleDownload}
              component="a"
              href="/ZKBridgeInstaller.exe"
              download="ZKBridgeInstaller.exe"
              fullWidth
            >
              Download Installer
            </Button>

            <Text size="xs" c="dimmed" ta="center">
              After downloading, run the installer and follow the on-screen instructions.
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder shadow="sm" p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Text size="sm" c="dimmed">
            <strong>Need help?</strong> Contact your system administrator for assistance with installation and configuration.
          </Text>
        </Paper>
      </Stack>
    </Container>
  )
}

