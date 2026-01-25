import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

// Check if running on native platform
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

// Camera hook for taking photos
export function useCamera() {
  const takePhoto = async () => {
    if (!isNative) {
      // Fallback for web - use file input
      return null;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: false,
      });

      return image.base64String;
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  };

  const pickFromGallery = async () => {
    if (!isNative) {
      return null;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      return image.base64String;
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  };

  return { takePhoto, pickFromGallery, isNative };
}

// Haptic feedback hook
export function useHaptics() {
  const vibrate = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative) return;

    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[style];

    await Haptics.impact({ style: impactStyle });
  };

  const notification = async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNative) return;

    await Haptics.notification({
      type: type === 'success' ? 'SUCCESS' : type === 'warning' ? 'WARNING' : 'ERROR',
    } as any);
  };

  return { vibrate, notification };
}

// Network status hook
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const checkNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    };

    checkNetwork();

    const listener = Network.addListener('networkStatusChange', (status) => {
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return { isOnline, connectionType };
}

// App lifecycle hook
export function useAppLifecycle() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isNative) return;

    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      setIsActive(isActive);
    });

    return () => {
      stateListener.then((l) => l.remove());
    };
  }, []);

  return { isActive };
}

// Initialize native features
export async function initializeNativeFeatures() {
  if (!isNative) return;

  try {
    // Configure status bar
    if (platform === 'android') {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    }

    // Configure keyboard behavior
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (error) {
    console.error('Failed to initialize native features:', error);
  }
}

export default {
  isNative,
  platform,
  useCamera,
  useHaptics,
  useNetwork,
  useAppLifecycle,
  initializeNativeFeatures,
};
