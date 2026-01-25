/**
 * Push Notifications Hook for StockPro
 *
 * Handles push notification registration, permissions, and alert monitoring
 * for low stock and critical temperature alerts.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import type { PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  registerNativePush,
  requestWebNotificationPermission,
  savePushToken,
  removePushToken,
  cleanupNotificationListeners,
  sendLowStockAlert,
  sendBatchLowStockAlerts,
  sendCriticalTemperatureAlert,
  getNotificationPreferences,
  saveNotificationPreferences,
  getNotificationPermissionStatus,
  areNotificationsSupported,
  type NotificationPreferences,
  type LowStockProduct,
  type CriticalTemperatureReading,
} from '@/lib/notifications';

// =========================================
// Types
// =========================================

export interface UsePushNotificationsResult {
  // Status
  isSupported: boolean;
  isEnabled: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'loading';
  isRegistered: boolean;
  pushToken: string | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;

  // Preferences
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;

  // Manual alert triggers (for testing)
  testLowStockAlert: (product?: LowStockProduct) => Promise<void>;
  testTemperatureAlert: (reading?: CriticalTemperatureReading) => Promise<void>;

  // Current alerts
  lowStockProducts: LowStockProduct[];
  hasLowStockAlerts: boolean;
}

// =========================================
// Constants
// =========================================

const isNative = Capacitor.isNativePlatform();

// How often to check for new alerts (in milliseconds)
const ALERT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Key for tracking notified products to avoid duplicate notifications
const NOTIFIED_PRODUCTS_KEY = 'stockpro_notified_low_stock';
const NOTIFIED_TEMPERATURES_KEY = 'stockpro_notified_temperatures';

// =========================================
// Hook
// =========================================

export function usePushNotifications(): UsePushNotificationsResult {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [isSupported] = useState(() => areNotificationsSupported());
  const [isEnabled, setIsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('loading');
  const [isRegistered, setIsRegistered] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => getNotificationPreferences());

  // Refs for tracking notified items
  const notifiedProductsRef = useRef<Set<string>>(new Set());
  const notifiedTemperaturesRef = useRef<Map<string, number>>(new Map());

  // Load notified items from localStorage
  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(NOTIFIED_PRODUCTS_KEY);
      if (storedProducts) {
        notifiedProductsRef.current = new Set(JSON.parse(storedProducts));
      }

      const storedTemperatures = localStorage.getItem(NOTIFIED_TEMPERATURES_KEY);
      if (storedTemperatures) {
        notifiedTemperaturesRef.current = new Map(JSON.parse(storedTemperatures));
      }
    } catch (error) {
      console.error('Failed to load notified items:', error);
    }
  }, []);

  // =========================================
  // Queries for monitoring alerts
  // =========================================

  // Query for low stock products
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.getAll,
    refetchInterval: ALERT_CHECK_INTERVAL,
    enabled: isEnabled && preferences.lowStockEnabled,
  });

  // Query for temperature equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ['temperature-equipment'],
    queryFn: api.temperatureEquipment.getAll,
    refetchInterval: ALERT_CHECK_INTERVAL,
    enabled: isEnabled && preferences.criticalTemperatureEnabled,
  });

  // Calculate low stock products
  const lowStockProducts: LowStockProduct[] = products
    .filter(p => p.minStock > 0 && p.quantity <= p.minStock)
    .map(p => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      minStock: p.minStock,
      unit: p.unit,
    }));

  const hasLowStockAlerts = lowStockProducts.length > 0;

  // =========================================
  // Permission and registration handlers
  // =========================================

  // Check permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);
      setIsEnabled(status === 'granted');
    };
    checkPermission();
  }, []);

  // Handle notification received
  const handleNotificationReceived = useCallback((notification: PushNotificationSchema) => {
    console.log('Push notification received:', notification);
    // You can show an in-app toast here if needed
  }, []);

  // Handle notification tap
  const handleNotificationAction = useCallback((action: ActionPerformed) => {
    console.log('Push notification action:', action);
    const data = action.notification.data;

    // Navigate based on notification type
    if (data?.productId) {
      navigate('/products');
    } else if (data?.equipmentId) {
      navigate('/temperatures');
    }
  }, [navigate]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      if (isNative) {
        const token = await registerNativePush(
          user?.id || null,
          handleNotificationReceived,
          handleNotificationAction
        );
        if (token) {
          setPushToken(token);
          setIsRegistered(true);
          setIsEnabled(true);
          setPermissionStatus('granted');
          return true;
        }
        setPermissionStatus('denied');
        return false;
      } else {
        const granted = await requestWebNotificationPermission();
        if (granted) {
          // For web, we'll use a unique identifier as the "token"
          const webToken = `web_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          await savePushToken(webToken, user?.id || null);
          setPushToken(webToken);
          setIsRegistered(true);
          setIsEnabled(true);
          setPermissionStatus('granted');
          return true;
        }
        setPermissionStatus('denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported, user?.id, handleNotificationReceived, handleNotificationAction]);

  // Enable notifications
  const enableNotifications = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      setIsEnabled(true);
    }
  }, [requestPermission]);

  // Disable notifications
  const disableNotifications = useCallback(async () => {
    await removePushToken();
    setIsEnabled(false);
    setIsRegistered(false);
    setPushToken(null);
    await cleanupNotificationListeners();
  }, []);

  // Update preferences
  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...prefs };
    setPreferences(updated);
    saveNotificationPreferences(prefs);
  }, [preferences]);

  // =========================================
  // Alert monitoring and notification sending
  // =========================================

  // Monitor low stock and send alerts
  useEffect(() => {
    if (!isEnabled || !preferences.lowStockEnabled || lowStockProducts.length === 0) {
      return;
    }

    // Find products that haven't been notified yet
    const newLowStockProducts = lowStockProducts.filter(
      p => !notifiedProductsRef.current.has(p.id)
    );

    if (newLowStockProducts.length === 0) return;

    // Send notifications for new low stock products
    const sendAlerts = async () => {
      if (newLowStockProducts.length === 1) {
        await sendLowStockAlert(newLowStockProducts[0]);
      } else {
        await sendBatchLowStockAlerts(newLowStockProducts);
      }

      // Mark as notified
      newLowStockProducts.forEach(p => {
        notifiedProductsRef.current.add(p.id);
      });

      // Save to localStorage
      localStorage.setItem(
        NOTIFIED_PRODUCTS_KEY,
        JSON.stringify([...notifiedProductsRef.current])
      );
    };

    sendAlerts();
  }, [isEnabled, preferences.lowStockEnabled, lowStockProducts]);

  // Clear notified products when they're back in stock
  useEffect(() => {
    if (!products.length) return;

    const productIds = new Set(products.map(p => p.id));
    const backInStock = [...notifiedProductsRef.current].filter(id => {
      const product = products.find(p => p.id === id);
      // Remove from notified if product doesn't exist or is above min stock
      return !product || (product.minStock > 0 && product.quantity > product.minStock);
    });

    if (backInStock.length > 0) {
      backInStock.forEach(id => {
        notifiedProductsRef.current.delete(id);
      });

      // Also remove products that no longer exist
      [...notifiedProductsRef.current].forEach(id => {
        if (!productIds.has(id)) {
          notifiedProductsRef.current.delete(id);
        }
      });

      localStorage.setItem(
        NOTIFIED_PRODUCTS_KEY,
        JSON.stringify([...notifiedProductsRef.current])
      );
    }
  }, [products]);

  // Monitor temperature readings for critical alerts
  useEffect(() => {
    if (!isEnabled || !preferences.criticalTemperatureEnabled || equipment.length === 0) {
      return;
    }

    const checkTemperatures = async () => {
      for (const equip of equipment) {
        if (!equip.is_active) continue;

        try {
          const latestReading = await api.temperatureReadings.getLatest(equip.id);
          if (!latestReading) continue;

          const isCritical =
            latestReading.temperature < equip.min_temp ||
            latestReading.temperature > equip.max_temp;

          if (!isCritical) {
            // Clear notification status if back to normal
            notifiedTemperaturesRef.current.delete(equip.id);
            continue;
          }

          // Check if we already notified for this reading
          const lastNotifiedTemp = notifiedTemperaturesRef.current.get(equip.id);
          if (lastNotifiedTemp === latestReading.temperature) {
            continue; // Already notified for this exact temperature
          }

          // Send critical temperature alert
          await sendCriticalTemperatureAlert({
            equipmentId: equip.id,
            equipmentName: equip.name,
            temperature: latestReading.temperature,
            minTemp: equip.min_temp,
            maxTemp: equip.max_temp,
          });

          // Mark as notified
          notifiedTemperaturesRef.current.set(equip.id, latestReading.temperature);

          // Save to localStorage
          localStorage.setItem(
            NOTIFIED_TEMPERATURES_KEY,
            JSON.stringify([...notifiedTemperaturesRef.current])
          );
        } catch (error) {
          console.error(`Failed to check temperature for ${equip.name}:`, error);
        }
      }
    };

    checkTemperatures();
  }, [isEnabled, preferences.criticalTemperatureEnabled, equipment]);

  // =========================================
  // Test functions
  // =========================================

  const testLowStockAlert = useCallback(async (product?: LowStockProduct) => {
    const testProduct = product || {
      id: 'test-1',
      name: 'Produit Test',
      quantity: 2,
      minStock: 5,
      unit: 'pieces',
    };
    await sendLowStockAlert(testProduct);
  }, []);

  const testTemperatureAlert = useCallback(async (reading?: CriticalTemperatureReading) => {
    const testReading = reading || {
      equipmentId: 'test-1',
      equipmentName: 'Frigo Test',
      temperature: 12,
      minTemp: 0,
      maxTemp: 8,
    };
    await sendCriticalTemperatureAlert(testReading);
  }, []);

  // =========================================
  // Cleanup
  // =========================================

  useEffect(() => {
    return () => {
      cleanupNotificationListeners();
    };
  }, []);

  return {
    // Status
    isSupported,
    isEnabled,
    permissionStatus,
    isRegistered,
    pushToken,

    // Actions
    requestPermission,
    enableNotifications,
    disableNotifications,

    // Preferences
    preferences,
    updatePreferences,

    // Test functions
    testLowStockAlert,
    testTemperatureAlert,

    // Current alerts
    lowStockProducts,
    hasLowStockAlerts,
  };
}

export default usePushNotifications;
