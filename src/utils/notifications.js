/**
 * Utility functions for standardized notifications
 * Provides consistent notification styling and behavior across the application
 */

import { notifications } from '@mantine/notifications'
import { IconCheck, IconX } from '@tabler/icons-react'

/**
 * Show a success notification
 * @param {string} message - Notification message
 * @param {string} title - Notification title (default: 'Success')
 * @param {object} options - Additional notification options
 */
export const showSuccess = (message, title = 'Success', options = {}) => {
  notifications.show({
    title,
    message,
    color: 'green',
    icon: <IconCheck size={18} />,
    autoClose: options.autoClose ?? 2000,
    ...options,
  })
}

/**
 * Show an error notification
 * @param {string} message - Notification message
 * @param {string} title - Notification title (default: 'Error')
 * @param {object} options - Additional notification options
 */
export const showError = (message, title = 'Error', options = {}) => {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: <IconX size={18} />,
    autoClose: options.autoClose ?? 4000,
    ...options,
  })
}

/**
 * Show an info notification
 * @param {string} message - Notification message
 * @param {string} title - Notification title (default: 'Info')
 * @param {object} options - Additional notification options
 */
export const showInfo = (message, title = 'Info', options = {}) => {
  notifications.show({
    title,
    message,
    color: 'blue',
    autoClose: options.autoClose ?? 3000,
    ...options,
  })
}

/**
 * Show a loading notification (returns notification ID for updates)
 * @param {string} message - Notification message
 * @param {string} title - Notification title (default: 'Loading...')
 * @param {object} options - Additional notification options
 * @returns {string} Notification ID for updating later
 */
export const showLoading = (message, title = 'Loading...', options = {}) => {
  const id = options.id || `loading-${Date.now()}`
  notifications.show({
    id,
    title,
    message,
    loading: true,
    autoClose: false,
    withCloseButton: false,
    ...options,
  })
  return id
}

/**
 * Update an existing notification (typically from loading to success/error)
 * @param {string} id - Notification ID
 * @param {string} message - New notification message
 * @param {string} title - New notification title
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {object} options - Additional notification options
 */
export const updateNotification = (id, message, title, type = 'success', options = {}) => {
  const colorMap = {
    success: 'green',
    error: 'red',
    info: 'blue',
  }
  
  const iconMap = {
    success: <IconCheck size={18} />,
    error: <IconX size={18} />,
    info: null,
  }

  notifications.update({
    id,
    title,
    message,
    color: colorMap[type] || 'blue',
    icon: iconMap[type],
    loading: false,
    autoClose: options.autoClose ?? (type === 'success' ? 2000 : 4000),
    withCloseButton: true,
    ...options,
  })
}

/**
 * Show a success notification from an API response
 * @param {string} defaultMessage - Default message if response doesn't have one
 * @param {object} response - API response object (optional)
 * @param {string} title - Notification title (default: 'Success')
 */
export const showApiSuccess = (defaultMessage, response = null, title = 'Success') => {
  const message = response?.message || response?.data?.message || defaultMessage
  showSuccess(message, title)
}

/**
 * Show an error notification from an error object
 * @param {Error|object} error - Error object
 * @param {string} defaultMessage - Default message if error doesn't have one
 * @param {string} title - Notification title (default: 'Error')
 */
export const showApiError = (error, defaultMessage = 'An error occurred', title = 'Error') => {
  const message = error?.message || error?.error || defaultMessage
  showError(message, title)
}



