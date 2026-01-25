/**
 * Push Notifications Library for StockPro
 * Supports both Android (Capacitor) and Web (Service Worker)
 *
 * Features:
 * - Low stock alerts
 * - Critical temperature alerts (HACCP)
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { getSupabase } from './api/core';

// =========================================
// Types
// =========================================

export type NotificationType = 'low_stock' | 'critical_temperature' | 'general';

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface PushToken {
  id: string;
  user_profile_id: string | null;
  device_id: string;
  token: string;
  platform: 'android' | 'web';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  lowStockEnabled: boolean;
  criticalTemperatureEnabled: boolean;
  generalEnabled: boolean;
}

// =========================================
// Constants
// =========================================

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  lowStockEnabled: true,
  criticalTemperatureEnabled: true,
  generalEnabled: true,
};

// Notification channels for Android
export const NOTIFICATION_CHANNELS = {
  LOW_STOCK: {
    id: 'low_stock_alerts',
    name: 'Alertes Stock Bas',
    description: 'Notifications quand un produit passe sous le seuil minimum',
    importance: 4, // HIGH
    visibility: 1, // PUBLIC
    sound: 'default',
    vibration: true,
  },
  CRITICAL_TEMPERATURE: {
    id: 'critical_temperature_alerts',
    name: 'Alertes Temperatures Critiques',
    description: 'Notifications HACCP pour temperatures hors plage normale',
    importance: 5, // MAX
    visibility: 1, // PUBLIC
    sound: 'default',
    vibration: true,
  },
  GENERAL: {
    id: 'general_notifications',
    name: 'Notifications Generales',
    description: 'Autres notifications de l\'application',
    importance: 3, // DEFAULT
    visibility: 1, // PUBLIC
    sound: 'default',
    vibration: false,
  },
};

// =========================================
// Push Token Management
// =========================================

/**
 * Generate a unique device ID
 */
function generateDeviceId(): string {
  const stored = localStorage.getItem('stockpro_device_id');
  if (stored) return stored;

  const newId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem('stockpro_device_id', newId);
  return newId;
}

/**
 * Save push token to Supabase
 */
export async function savePushToken(
  token: string,
  userProfileId: string | null = null
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase not initialized');
    return;
  }

  const deviceId = generateDeviceId();
  const tokenPlatform = isNative ? (platform as 'android' | 'web') : 'web';

  try {
    // Upsert the token (update if device exists, insert if new)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          device_id: deviceId,
          token: token,
          platform: tokenPlatform,
          user_profile_id: userProfileId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'device_id',
        }
      );

    if (error) throw error;
    console.log('Push token saved successfully');
  } catch (error) {
    console.error('Failed to save push token:', error);
  }
}

/**
 * Remove push token from Supabase
 */
export async function removePushToken(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const deviceId = localStorage.getItem('stockpro_device_id');
  if (!deviceId) return;

  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('device_id', deviceId);

    if (error) throw error;
    console.log('Push token deactivated');
  } catch (error) {
    console.error('Failed to deactivate push token:', error);
  }
}

// =========================================
// Native Push Notifications (Android)
// =========================================

/**
 * Request push notification permissions on Android
 */
export async function requestNativePermissions(): Promise<boolean> {
  if (!isNative) return false;

  try {
    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      // Request permission
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting push permissions:', error);
    return false;
  }
}

/**
 * Register for push notifications on Android
 */
export async function registerNativePush(
  userProfileId: string | null = null,
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationActionPerformed?: (notification: ActionPerformed) => void
): Promise<string | null> {
  if (!isNative) return null;

  const hasPermission = await requestNativePermissions();
  if (!hasPermission) return null;

  try {
    // Create notification channels (Android only)
    await createNotificationChannels();

    // Register for push notifications
    await PushNotifications.register();

    // Set up listeners
    return new Promise((resolve) => {
      // Handle registration success
      PushNotifications.addListener('registration', async (token: Token) => {
        console.log('Push registration success, token:', token.value);
        await savePushToken(token.value, userProfileId);
        resolve(token.value);
      });

      // Handle registration error
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
        resolve(null);
      });

      // Handle incoming push notification while app is in foreground
      if (onNotificationReceived) {
        PushNotifications.addListener('pushNotificationReceived', onNotificationReceived);
      }

      // Handle notification tap
      if (onNotificationActionPerformed) {
        PushNotifications.addListener('pushNotificationActionPerformed', onNotificationActionPerformed);
      }
    });
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Create Android notification channels
 */
async function createNotificationChannels(): Promise<void> {
  if (!isNative || platform !== 'android') return;

  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.LOW_STOCK.id,
      name: NOTIFICATION_CHANNELS.LOW_STOCK.name,
      description: NOTIFICATION_CHANNELS.LOW_STOCK.description,
      importance: NOTIFICATION_CHANNELS.LOW_STOCK.importance as 1 | 2 | 3 | 4 | 5,
      visibility: NOTIFICATION_CHANNELS.LOW_STOCK.visibility as -1 | 0 | 1,
      sound: NOTIFICATION_CHANNELS.LOW_STOCK.sound,
      vibration: NOTIFICATION_CHANNELS.LOW_STOCK.vibration,
    });

    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.id,
      name: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.name,
      description: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.description,
      importance: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.importance as 1 | 2 | 3 | 4 | 5,
      visibility: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.visibility as -1 | 0 | 1,
      sound: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.sound,
      vibration: NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.vibration,
    });

    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNELS.GENERAL.id,
      name: NOTIFICATION_CHANNELS.GENERAL.name,
      description: NOTIFICATION_CHANNELS.GENERAL.description,
      importance: NOTIFICATION_CHANNELS.GENERAL.importance as 1 | 2 | 3 | 4 | 5,
      visibility: NOTIFICATION_CHANNELS.GENERAL.visibility as -1 | 0 | 1,
      sound: NOTIFICATION_CHANNELS.GENERAL.sound,
      vibration: NOTIFICATION_CHANNELS.GENERAL.vibration,
    });

    console.log('Notification channels created');
  } catch (error) {
    console.error('Failed to create notification channels:', error);
  }
}

// =========================================
// Local Notifications (Both platforms)
// =========================================

let notificationIdCounter = 1;

/**
 * Show a local notification
 */
export async function showLocalNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (isNative) {
    await showNativeLocalNotification(type, title, body, data);
  } else {
    await showWebNotification(title, body, data);
  }
}

/**
 * Show native local notification on Android
 */
async function showNativeLocalNotification(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    // Request permission if needed
    const permResult = await LocalNotifications.requestPermissions();
    if (permResult.display !== 'granted') {
      console.warn('Local notification permission not granted');
      return;
    }

    // Determine which channel to use
    let channelId = NOTIFICATION_CHANNELS.GENERAL.id;
    if (type === 'low_stock') {
      channelId = NOTIFICATION_CHANNELS.LOW_STOCK.id;
    } else if (type === 'critical_temperature') {
      channelId = NOTIFICATION_CHANNELS.CRITICAL_TEMPERATURE.id;
    }

    const notification: LocalNotificationSchema = {
      id: notificationIdCounter++,
      title,
      body,
      channelId,
      extra: data,
      smallIcon: 'ic_stat_icon_config_sample',
      largeIcon: 'ic_launcher',
    };

    await LocalNotifications.schedule({
      notifications: [notification],
    });
  } catch (error) {
    console.error('Failed to show local notification:', error);
  }
}

// =========================================
// Web Notifications (Service Worker)
// =========================================

/**
 * Request web notification permission
 */
export async function requestWebNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission was denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Register service worker for web push
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

/**
 * Show a web notification via Service Worker
 */
async function showWebNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const hasPermission = await requestWebNotificationPermission();
  if (!hasPermission) return;

  try {
    const registration = await registerServiceWorker();
    if (registration) {
      // Use service worker for notifications (works when app is in background)
      // Note: vibrate is not in the TypeScript types but is supported by browsers
      const options: NotificationOptions & { vibrate?: number[] } = {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data,
        tag: `stockpro-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
      };
      await registration.showNotification(title, options);
    } else {
      // Fallback to regular Notification API
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        data,
      });
    }
  } catch (error) {
    console.error('Failed to show web notification:', error);
  }
}

// =========================================
// Stock Alert Notifications
// =========================================

export interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  minStock: number;
  unit: string;
}

/**
 * Send low stock alert notification
 */
export async function sendLowStockAlert(product: LowStockProduct): Promise<void> {
  const isOutOfStock = product.quantity <= 0;

  const title = isOutOfStock
    ? `Rupture de stock: ${product.name}`
    : `Stock bas: ${product.name}`;

  const body = isOutOfStock
    ? `Le produit "${product.name}" est en rupture de stock!`
    : `Il reste ${product.quantity} ${product.unit} de "${product.name}" (seuil: ${product.minStock} ${product.unit})`;

  await showLocalNotification('low_stock', title, body, {
    productId: product.id,
    productName: product.name,
    quantity: product.quantity,
    minStock: product.minStock,
  });
}

/**
 * Send batch low stock alerts
 */
export async function sendBatchLowStockAlerts(products: LowStockProduct[]): Promise<void> {
  if (products.length === 0) return;

  if (products.length === 1) {
    await sendLowStockAlert(products[0]);
    return;
  }

  const outOfStock = products.filter(p => p.quantity <= 0);
  const lowStock = products.filter(p => p.quantity > 0);

  let body = '';
  if (outOfStock.length > 0) {
    body += `${outOfStock.length} produit(s) en rupture. `;
  }
  if (lowStock.length > 0) {
    body += `${lowStock.length} produit(s) en stock bas.`;
  }

  await showLocalNotification(
    'low_stock',
    `Alerte Stock: ${products.length} produit(s)`,
    body,
    {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.quantity,
      })),
    }
  );
}

// =========================================
// Temperature Alert Notifications
// =========================================

export interface CriticalTemperatureReading {
  equipmentId: string;
  equipmentName: string;
  temperature: number;
  minTemp: number;
  maxTemp: number;
}

/**
 * Send critical temperature alert notification
 */
export async function sendCriticalTemperatureAlert(
  reading: CriticalTemperatureReading
): Promise<void> {
  const isTooHigh = reading.temperature > reading.maxTemp;
  const isTooLow = reading.temperature < reading.minTemp;

  const emoji = isTooHigh ? '🔥' : '❄️';
  const status = isTooHigh ? 'TROP HAUTE' : 'TROP BASSE';

  const title = `${emoji} ALERTE HACCP: ${reading.equipmentName}`;
  const body = `Temperature ${status}: ${reading.temperature}°C (plage normale: ${reading.minTemp}°C - ${reading.maxTemp}°C). Action corrective requise!`;

  await showLocalNotification('critical_temperature', title, body, {
    equipmentId: reading.equipmentId,
    equipmentName: reading.equipmentName,
    temperature: reading.temperature,
    minTemp: reading.minTemp,
    maxTemp: reading.maxTemp,
    isTooHigh,
    isTooLow,
  });
}

// =========================================
// Notification Preferences
// =========================================

const PREFERENCES_KEY = 'stockpro_notification_preferences';

/**
 * Get notification preferences from local storage
 */
export function getNotificationPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to parse notification preferences:', error);
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Save notification preferences to local storage
 */
export function saveNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): void {
  const current = getNotificationPreferences();
  const updated = { ...current, ...preferences };
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
}

// =========================================
// Cleanup
// =========================================

/**
 * Remove all notification listeners
 */
export async function cleanupNotificationListeners(): Promise<void> {
  if (isNative) {
    await PushNotifications.removeAllListeners();
    await LocalNotifications.removeAllListeners();
  }
}

// =========================================
// Utility functions
// =========================================

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported(): boolean {
  if (isNative) {
    return true; // Capacitor always supports notifications on Android
  }
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  if (isNative) {
    const status = await PushNotifications.checkPermissions();
    return status.receive as 'granted' | 'denied' | 'prompt';
  }

  if (!('Notification' in window)) {
    return 'denied';
  }

  return Notification.permission as 'granted' | 'denied' | 'prompt';
}
