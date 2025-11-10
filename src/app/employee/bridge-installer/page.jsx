'use client'

import {
  Container,
  Title,
  Paper,
  Stack,
  Button,
  Text,
  List,
  ThemeIcon,
  Group,
  Alert,
  Code,
} from '@mantine/core'
import { IconDownload, IconInfoCircle, IconCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { AdminAccessBanner } from '@/components/AdminAccessBanner'

export default function BridgeInstallerPage() {
  const handleDownload = () => {
    // Link to the installer in the public folder
    const link = document.createElement('a')
    link.href = '/ZKBridgeInstaller.exe'
    link.download = 'ZKBridgeInstaller.exe'
    link.click()

    notifications.show({
      title: 'Download Started',
      message: 'ZK Bridge installer is downloading...',
      color: 'green',
      icon: <IconCheck size={18} />,
    })
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <AdminAccessBanner />
        <div>
          <Title order={1} mb="xs">
            ZK Bridge Installer
          </Title>
          <Text c="dimmed" size="lg">
            Download and install the ZK Bridge to sync your attendance data
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={18} />} color="blue" title="What is ZK Bridge?">
          <Text size="sm">
            The ZK Bridge application connects your ZK biometric device to the cloud attendance
            system. It runs in the background and automatically syncs your attendance records.
          </Text>
        </Alert>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <div style={{ flex: 1 }}>
                <Text size="lg" fw={600} mb="xs">
                  ZK Bridge Installer
                </Text>
                <Text size="sm" c="dimmed">
                  Windows executable installer
                </Text>
              </div>
              <Button
                size="lg"
                leftSection={<IconDownload size={20} />}
                onClick={handleDownload}
              >
                Download Installer
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Title order={3}>Installation Instructions</Title>
            
            <List
              spacing="md"
              icon={
                <ThemeIcon color="blue" size={24} radius="xl">
                  <IconCheck size={16} />
                </ThemeIcon>
              }
            >
              <List.Item>
                <Text fw={500}>Download the installer</Text>
                <Text size="sm" c="dimmed">
                  Click the download button above to get the ZKBridgeInstaller.exe file
                </Text>
              </List.Item>

              <List.Item>
                <Text fw={500}>Run the installer</Text>
                <Text size="sm" c="dimmed">
                  Double-click the downloaded file and follow the installation wizard
                </Text>
              </List.Item>

              <List.Item>
                <Text fw={500}>Configure your device</Text>
                <Text size="sm" c="dimmed">
                  After installation, open the ZK Bridge Config application and enter your device
                  IP address and other connection details
                </Text>
              </List.Item>

              <List.Item>
                <Text fw={500}>Start the bridge service</Text>
                <Text size="sm" c="dimmed">
                  The bridge will automatically start syncing your attendance data to the cloud
                </Text>
              </List.Item>
            </List>
          </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Title order={3}>System Requirements</Title>
            <List spacing="sm">
              <List.Item>Windows 10 or later</List.Item>
              <List.Item>Internet connection</List.Item>
              <List.Item>Network access to your ZK biometric device</List.Item>
              <List.Item>Administrator privileges for installation</List.Item>
            </List>
          </Stack>
        </Paper>

        <Paper withBorder p="xl" radius="md" bg="gray.0">
          <Stack gap="md">
            <Title order={3}>Need Help?</Title>
            <Text size="sm">
              If you encounter any issues during installation or configuration, please contact your
              HR administrator or IT support team.
            </Text>
            <Text size="sm" c="dimmed">
              Common issues and their solutions can be found in the documentation included with the
              installer.
            </Text>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}



